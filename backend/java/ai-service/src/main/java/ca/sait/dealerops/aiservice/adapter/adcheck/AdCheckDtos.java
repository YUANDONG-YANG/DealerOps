package ca.sait.dealerops.aiservice.adapter.adcheck;

import java.util.List;

public final class AdCheckDtos {
  private AdCheckDtos() {}

  public record AdCheckInternalRequest(
      ListingIn listing, VehiclePublic vehiclePublic, DealerPublic dealerPublic) {}

  public record ListingIn(String title, String body, String adKind, String medium) {}

  public record VehiclePublic(
      int modelYear, String make, String model, String vin, String conditionCode, String source) {}

  public record DealerPublic(
      String legalName, String contactPhone, String contactEmail, String contactAddress) {}

  public record AiNote(String message) {}

  public record AdCheckOkResponse(boolean success, List<AiNote> notes) {}
}
