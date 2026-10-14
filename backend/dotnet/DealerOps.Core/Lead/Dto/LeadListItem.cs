namespace DealerOps.Core.Lead.Dto;

public record LeadListItem(
    long Id,
    long CustomerId,
    string CustomerName,
    LeadVehicleBrief? Vehicle,
    LeadStage Stage,
    string? OwnerUsername,
    DateOnly? NextFollowUpOn,
    bool Overdue,
    int Version);
