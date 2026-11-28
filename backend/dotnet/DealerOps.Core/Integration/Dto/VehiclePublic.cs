namespace DealerOps.Core.Integration.Dto;

/// <summary>Vehicle facts sent to the AI ad check; no cost data.</summary>
public record VehiclePublic(
    int ModelYear,
    string Make,
    string Model,
    string Vin,
    string? ConditionCode,
    string? Source);
