namespace DealerOps.Core.Customer.Dto;

public record CustomerDetail(
    long Id,
    string Name,
    string? Email,
    string? Phone,
    string? HomeAddress,
    List<LinkedVehicleItem> LinkedVehicles,
    int Version,
    // Set when the saved email matches another customer here. The save still succeeds (CRM-13).
    string? EmailWarning = null);
