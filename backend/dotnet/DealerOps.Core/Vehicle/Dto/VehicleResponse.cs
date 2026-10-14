namespace DealerOps.Core.Vehicle.Dto;

public record VehicleResponse(
    long Id,
    string Vin,
    string Make,
    string Model,
    int ModelYear,
    VehicleSource Source,
    decimal PurchaseCost,
    DateOnly AddedOn,
    ConditionCode ConditionCode,
    decimal? RepairCost,
    string? CarfaxUrl,
    DateOnly? SoldOn,
    decimal? SoldPrice,
    VehicleStatus Status,
    LinkedCustomerBrief? LinkedCustomer,
    long OpenWorkOrders,
    int Version);
