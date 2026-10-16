namespace DealerOps.Core.Vehicle.Dto;

public record VehicleFilter(
    string? Q,
    VehicleStatus? Status,
    ConditionCode? Condition,
    VehicleBodyType? BodyType,
    string? Make,
    string? Model,
    int? ModelYear);
