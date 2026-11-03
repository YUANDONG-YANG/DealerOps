namespace DealerOps.Core.Dealer.Dto;

/// <param name="Source">How the account was created (see <see cref="AccountSource"/>), null when unknown.</param>
/// <param name="Phone">The account's own phone, or <c>null</c>; a manager edits it on the Team page.</param>
/// <param name="JoinedAt">When the membership row was created (UTC).</param>
public record MemberOption(string Username, string? DisplayName, string? Source, DealerRole DealerRole,
    string? Phone, DateTime JoinedAt);
