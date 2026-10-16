namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// One Google join request shown to a dealership member for approval. Keeps the Google-side
/// identity (email and the display name Google supplied) so the approver can match it to the
/// person they expect, plus the system username that will be bound on approve.
/// </summary>
public record JoinRequestResponse(
    string Username,
    string DisplayName,
    string? Email,
    DateTime CreatedAt);
