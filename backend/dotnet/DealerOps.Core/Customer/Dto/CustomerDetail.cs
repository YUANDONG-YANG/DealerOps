namespace DealerOps.Core.Customer.Dto;

public record CustomerDetail(
    long Id,
    string Name,
    string? Email,
    string? Phone,
    string? HomeAddress,
    List<LinkedVehicleItem> LinkedVehicles,
    int Version,
    bool DuplicateEmail);
