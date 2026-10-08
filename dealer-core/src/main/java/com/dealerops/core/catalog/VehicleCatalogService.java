package com.dealerops.core.catalog;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantGuard;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Make and model options for the DMS filter, read from NHTSA vPIC and cached in memory for the
 * life of the process (the catalog changes rarely). Only successful lookups are cached.
 */
@Service
public class VehicleCatalogService {

  /** vPIC vehicle types whose makes cover cars, SUVs, vans, and pickups sold by dealerships. */
  private static final List<String> MAKE_VEHICLE_TYPES = List.of("car", "mpv");

  private final WebClient vpic;
  private final Map<String, List<String>> cache = new ConcurrentHashMap<>();

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
