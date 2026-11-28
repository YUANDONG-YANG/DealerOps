namespace DealerOps.Core.Dealer.Dto;

/// <param name="RequestedDealerId">The dealership this account has a pending join request at, or <c>null</c>.</param>
/// <param name="RequestedDealerName">That dealership's legal name, or <c>null</c>.</param>
public record PendingUserResponse(
    string Username,
    string? DisplayName,
    string? Email,
    string? Phone,
    DateTime CreatedAt,
    long? RequestedDealerId,
    string? RequestedDealerName);
