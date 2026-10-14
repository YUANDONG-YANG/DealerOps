namespace DealerOps.Core.Vehicle.Dto;

public record VehicleFilter(
    string? Q,
    VehicleStatus? Status,
    ConditionCode? Condition,
    string? Make,
    string? Model,
    int? ModelYear);
