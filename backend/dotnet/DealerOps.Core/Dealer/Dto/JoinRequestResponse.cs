namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// One join request shown to a dealership member for approval. Keeps the applicant's
/// identity (email and display name) so the approver can match it to the
/// person they expect, plus the system username that will be bound on approve.
/// Source is how the account was created (see <see cref="AccountSource"/>), null when unknown.
/// </summary>
public record JoinRequestResponse(
    string Username,
    string DisplayName,
    string? Email,
    DateTime CreatedAt,
    string? Source);

/// <summary>The signed-in account's own pending join request, if any.</summary>
public record MyJoinRequestResponse(long DealerId, string? LegalName);

public record FileJoinRequest(long DealerId);
