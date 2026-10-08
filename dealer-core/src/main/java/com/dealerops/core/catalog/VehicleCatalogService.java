package com.dealerops.core.catalog;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantGuard;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Make and model options for the DMS filter and VIN decoding, read from NHTSA vPIC and cached in
 * memory for the life of the process (the catalog changes rarely). Only successful lookups are
 * cached.
 */
@Service
public class VehicleCatalogService {

  /** vPIC vehicle types whose makes cover cars, SUVs, vans, and pickups sold by dealerships. */
  private static final List<String> MAKE_VEHICLE_TYPES = List.of("car", "mpv");

  /** Same VIN rule as vehicle create: 17 characters, no I, O, or Q. */
  private static final Pattern VIN = Pattern.compile("^[A-HJ-NPR-Z0-9]{17}$");

  private final WebClient vpic;
  private final Map<String, List<String>> cache = new ConcurrentHashMap<>();
  private final Map<String, VinDecodeResponse> vinCache = new ConcurrentHashMap<>();

  public VehicleCatalogService(@Qualifier("vpicWebClient") WebClient vpic) {
    this.vpic = vpic;
  }

  public List<String> makes() {
    TenantGuard.requireBusinessAccess();
    return cache.computeIfAbsent(
        "makes",
        key ->
            names(
                MAKE_VEHICLE_TYPES.stream()
                    .flatMap(type -> results("/GetMakesForVehicleType/{type}?format=json", type))
                    .map(r -> r.path("MakeName").asText())));
  }

  public List<String> models(String make) {
    TenantGuard.requireBusinessAccess();
    if (make == null || make.isBlank()) {
      throw new ApiException(ErrorCode.VALIDATION, "Make is required.");
    }
    String key = make.trim().toUpperCase();
    return cache.computeIfAbsent(
        "models:" + key,
        k ->
            names(
                results("/GetModelsForMake/{make}?format=json", key)
                    .map(r -> r.path("Model_Name").asText())));
  }

  /** Public (no sign-in): the landing page and the DMS create form both decode VINs. */
  public VinDecodeResponse decodeVin(String vin) {
    String key = vin == null ? "" : vin.trim().toUpperCase();
    if (!VIN.matcher(key).matches()) {
      throw new ApiException(ErrorCode.VALIDATION, "VIN must be 17 characters without I, O, or Q.");
    }
    VinDecodeResponse cached = vinCache.get(key);
    if (cached != null) {
      return cached;
    }
    JsonNode r =
        results("/DecodeVinValues/{vin}?format=json", key)
            .findFirst()
            .orElseThrow(
                () -> new ApiException(ErrorCode.CATALOG_UNAVAILABLE, "Vehicle catalog is unavailable."));
    if (text(r, "Make") == null) {
      throw new ApiException(ErrorCode.NOT_FOUND, "No vehicle found for this VIN.");
    }
    String year = text(r, "ModelYear");
    VinDecodeResponse decoded =
        new VinDecodeResponse(
            key,
            text(r, "Make"),
            text(r, "Model"),
            year == null ? null : Integer.valueOf(year),
            text(r, "BodyClass"),
            engine(r),
            text(r, "PlantCountry"),
            text(r, "Manufacturer"));
    vinCache.put(key, decoded);
    return decoded;
  }

  /** For example "3.0L 6-cyl Gasoline"; null when vPIC has no engine data. */
  private static String engine(JsonNode r) {
    String litres = text(r, "DisplacementL");
    String cylinders = text(r, "EngineCylinders");
    String engine =
        Stream.of(
                litres == null
                    ? null
                    : new BigDecimal(litres).setScale(1, RoundingMode.HALF_UP).toPlainString() + "L",
                cylinders == null ? null : cylinders + "-cyl",
                text(r, "FuelTypePrimary"))
            .filter(part -> part != null)
            .collect(Collectors.joining(" "));
    return engine.isEmpty() ? null : engine;
  }

  private static String text(JsonNode r, String field) {
    String value = r.path(field).asText("").trim();
    return value.isEmpty() ? null : value;
  }

  private Stream<JsonNode> results(String uri, String variable) {
    JsonNode body;
    try {
      body = vpic.get().uri(uri, variable).retrieve().bodyToMono(JsonNode.class).block();
    } catch (RuntimeException e) {
      throw new ApiException(ErrorCode.CATALOG_UNAVAILABLE, "Vehicle catalog is unavailable.");
    }
    if (body == null || !body.path("Results").isArray()) {
      throw new ApiException(ErrorCode.CATALOG_UNAVAILABLE, "Vehicle catalog is unavailable.");
    }
    return StreamSupport.stream(body.path("Results").spliterator(), false);
  }

  /** Trimmed, de-duplicated (ignoring case), alphabetical. */
  private static List<String> names(Stream<String> raw) {
    TreeSet<String> sorted = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
    raw.map(String::trim).filter(s -> !s.isEmpty()).forEach(sorted::add);
    return List.copyOf(sorted);
  }
}
