namespace DealerOps.Core.Dealer.Dto;

public record PendingUserResponse(
    string Username,
    string? DisplayName,
    string? Email,
    string? Phone,
    DateTime CreatedAt);
