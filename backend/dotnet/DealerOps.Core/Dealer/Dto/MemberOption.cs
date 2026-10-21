namespace DealerOps.Core.Dealer.Dto;

/// <param name="Source">How the account was created (see <see cref="AccountSource"/>), null when unknown.</param>
public record MemberOption(string Username, string? DisplayName, string? Source, DealerRole DealerRole);
