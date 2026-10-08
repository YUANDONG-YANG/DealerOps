package com.dealerops.core.assistant;

import com.dealerops.core.assistant.dto.ResourceCard;
import com.dealerops.core.compliance.CheckStatusMapper;
import com.dealerops.core.compliance.ComplianceCheckEntity;
import com.dealerops.core.compliance.ComplianceCheckRepository;
import com.dealerops.core.customer.CustomerEntity;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.listing.ListingEntity;
import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleStatus;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
public class AssistantResourceQuery {

  private static final Pattern IN_STOCK = Pattern.compile("\\bin[ -]stock\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern SOLD = Pattern.compile("\\bsold\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern CUSTOMER_WORD = Pattern.compile("\\bcustomers?\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern FILLER = Pattern.compile(
      "\\b(?:which|what|who|how|many|show|find|list|search|for|me|the|a|an|all|any|are|is|our|here|please"
          + "|do|does|we|you|have|has|got|in|of|with|named|called|there|vehicles?|cars?|customers?)\\b",
      Pattern.CASE_INSENSITIVE);
  private static final Pattern PUNCTUATION = Pattern.compile("[?!,;:\"()]");

  private final VehicleRepository vehicleRepository;
  private final CustomerRepository customerRepository;
  private final ListingRepository listingRepository;
  private final ComplianceCheckRepository checkRepository;
  private final CheckStatusMapper checkStatusMapper;

  public AssistantResourceQuery(
      VehicleRepository vehicleRepository,
      CustomerRepository customerRepository,
      ListingRepository listingRepository,
      ComplianceCheckRepository checkRepository,
      CheckStatusMapper checkStatusMapper) {
    this.vehicleRepository = vehicleRepository;
    this.customerRepository = customerRepository;
    this.listingRepository = listingRepository;
    this.checkRepository = checkRepository;
    this.checkStatusMapper = checkStatusMapper;
  }

  public List<ResourceCard> load(Long tenantDealerId, String text) {
    String question = text == null ? "" : text.trim();
    boolean customerQuestion = CUSTOMER_WORD.matcher(question).find();
    VehicleStatus status = IN_STOCK.matcher(question).find() ? VehicleStatus.IN_STOCK
        : SOLD.matcher(question).find() ? VehicleStatus.SOLD : null;
    // Status words go first: "in" is a filler word and would otherwise break "in-stock".
    String q = IN_STOCK.matcher(question).replaceAll(" ");
    q = SOLD.matcher(q).replaceAll(" ");
    q = FILLER.matcher(PUNCTUATION.matcher(q).replaceAll(" ")).replaceAll(" ");
    List<String> terms = searchTerms(q);
    List<ResourceCard> cards = new ArrayList<>();
    Set<Long> vehicleIds = new LinkedHashSet<>();
    if (!customerQuestion) {
      for (VehicleEntity vehicle :
          matches(
              terms,
              term ->
                  searchVehicles(tenantDealerId, term, status),
              VehicleEntity::getId)) {
        if (cards.size() >= 5) {
          break;
        }
        vehicleIds.add(vehicle.getId());
        cards.add(
            new ResourceCard(
                "VEHICLE",
                vehicle.getId(),
                vehicle.getModelYear() + " " + vehicle.getMake() + " " + vehicle.getModel(),
                vehicle.getStatus().name(),
                null,
                null));
      }
    }
    if (customerQuestion || status == null) {
      for (CustomerEntity customer :
          matches(
              terms,
              term ->
                  searchCustomers(tenantDealerId, term),
              CustomerEntity::getId)) {
        if (cards.size() >= 5) {
          break;
        }
        cards.add(new ResourceCard("CUSTOMER", customer.getId(), customer.getName(), null, null, null));
      }
    }
    for (Long vehicleId : vehicleIds) {
      if (cards.size() >= 5) {
        break;
      }
      listingForVehicle(vehicleId, tenantDealerId)
          .ifPresent(listing -> cards.add(toListingCard(listing, tenantDealerId)));
    }
    return cards.size() <= 5 ? cards : cards.subList(0, 5);
  }

  // Repository search is one substring match, so a whole sentence never hits. Search each
  // remaining word instead; an empty list means "no keyword" and searches by status only.
  private static List<String> searchTerms(String q) {
    List<String> terms =
        Arrays.stream(q.trim().split("\\s+"))
            .map(word -> word.replaceAll("\\.+$", ""))
            .filter(word -> word.length() >= 2)
            .distinct()
            .limit(5)
            .toList();
    return terms.isEmpty() ? List.of("") : terms;
  }

  // Union of per-word hits, at most 5. A plural word ("Toyotas") retries without the trailing s.
  private static <T> List<T> matches(
      List<String> terms, Function<String, List<T>> search, Function<T, Long> idOf) {
    Map<Long, T> found = new LinkedHashMap<>();
    for (String term : terms) {
      List<T> hits = search.apply(term);
      if (hits.isEmpty() && term.length() > 3 && term.toLowerCase(Locale.ROOT).endsWith("s")) {
        hits = search.apply(term.substring(0, term.length() - 1));
      }
      hits.forEach(hit -> found.putIfAbsent(idOf.apply(hit), hit));
      if (found.size() >= 5) {
        break;
      }
    }
    return new ArrayList<>(found.values());
  }

  private ResourceCard toListingCard(ListingEntity listing, Long tenantDealerId) {
    ComplianceCheckEntity last =
        listing.getLastCheckId() == null
            ? null
            : checkForListing(listing, tenantDealerId)
                .filter(
                    check ->
                        listing.getId().equals(check.getListingId())
                            && listing.getDealerId().equals(check.getDealerId()))
                .orElse(null);
    return new ResourceCard(
        "LISTING",
        listing.getId(),
        listing.getTitle() == null || listing.getTitle().isBlank()
            ? "Listing " + listing.getId()
            : listing.getTitle(),
        listing.getStatus().name(),
        listing.getVehicleId(),
        checkStatusMapper.derive(listing, last));
  }

  private List<VehicleEntity> searchVehicles(Long dealerId, String term, VehicleStatus status) {
    if (dealerId != null) {
      return vehicleRepository.search(dealerId, term, status, null, null, null, null, PageRequest.of(0, 5)).getContent();
    }
    String normalized = term.toLowerCase(Locale.ROOT);
    return vehicleRepository.findAll().stream()
        .filter(vehicle -> status == null || vehicle.getStatus() == status)
        .filter(
            vehicle ->
                normalized.isBlank()
                    || vehicle.getVin().toLowerCase(Locale.ROOT).contains(normalized)
                    || vehicle.getMake().toLowerCase(Locale.ROOT).contains(normalized)
                    || vehicle.getModel().toLowerCase(Locale.ROOT).contains(normalized))
        .limit(5)
        .toList();
  }

  private List<CustomerEntity> searchCustomers(Long dealerId, String term) {
    if (dealerId != null) {
      return customerRepository.search(dealerId, term, null, PageRequest.of(0, 5)).getContent();
    }
    String normalized = term.toLowerCase(Locale.ROOT);
    return customerRepository.findAll().stream()
        .filter(
            customer ->
                normalized.isBlank()
                    || customer.getName().toLowerCase(Locale.ROOT).contains(normalized)
                    || customer.getEmail().toLowerCase(Locale.ROOT).contains(normalized)
                    || customer.getPhone().toLowerCase(Locale.ROOT).contains(normalized))
        .limit(5)
        .toList();
  }

  private java.util.Optional<ListingEntity> listingForVehicle(Long vehicleId, Long dealerId) {
    return dealerId == null
        ? listingRepository.findByVehicleId(vehicleId)
        : listingRepository.findByVehicleIdAndDealerId(vehicleId, dealerId);
  }

  private java.util.Optional<ComplianceCheckEntity> checkForListing(
      ListingEntity listing, Long dealerId) {
    return (dealerId == null
            ? checkRepository.findById(listing.getLastCheckId())
            : checkRepository.findByIdAndDealerId(listing.getLastCheckId(), dealerId))
        .filter(
            check ->
                listing.getId().equals(check.getListingId())
                    && listing.getDealerId().equals(check.getDealerId()));
  }
}
