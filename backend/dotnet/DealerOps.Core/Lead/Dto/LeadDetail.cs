namespace DealerOps.Core.Lead.Dto;

public record LeadDetail(
    long Id,
    long CustomerId,
    string CustomerName,
    LeadVehicleBrief? Vehicle,
    LeadStage Stage,
    string? OwnerUsername,
    DateOnly? NextFollowUpOn,
    bool Overdue,
    string? LostReason,
    List<LeadNoteItem> Notes,
    DateTime CreatedAt,
    int Version);
