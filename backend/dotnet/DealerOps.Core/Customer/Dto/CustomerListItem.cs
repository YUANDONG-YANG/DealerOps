namespace DealerOps.Core.Customer.Dto;

public record CustomerListItem(
    long Id,
    string Name,
    string? Email,
    string? Phone,
    string? HomeAddress,
    LinkedVehicleBrief? LinkedVehicle,
    int LinkedVehicleCount,
    int Version);
