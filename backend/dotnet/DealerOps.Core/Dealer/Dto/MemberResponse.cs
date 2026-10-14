namespace DealerOps.Core.Dealer.Dto;

public record MemberResponse(string Username, string? DisplayName, string Role, bool Active);
