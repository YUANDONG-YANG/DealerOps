namespace DealerOps.Core.Integration.Dto;

public record VehiclePublic(
    int ModelYear,
    string Make,
    string Model,
    string Vin,
    string? ConditionCode,
    string? Source);
