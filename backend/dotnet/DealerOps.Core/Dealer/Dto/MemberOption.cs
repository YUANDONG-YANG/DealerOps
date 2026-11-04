namespace DealerOps.Core.Dealer.Dto;

/// <summary>
/// A member of the caller's dealership. Every bound member may read the list, because the assignee
/// pickers need it, so only a caller with team access (owner or manager) receives the record fields;
/// for anyone else they are null and omitted from the response, leaving the picker fields.
/// </summary>
/// <param name="Username">Picker field: the member's username.</param>
/// <param name="DisplayName">Picker field: the member's display name, falling back to the username.</param>
/// <param name="Source">Record field: how the account was created (see <see cref="AccountSource"/>), null when unknown.</param>
/// <param name="DealerRole">Record field: the member's role inside the dealership.</param>
/// <param name="Phone">Record field: the account's own phone, or <c>null</c>; an owner or a manager edits it on the Team page, within their scope.</param>
/// <param name="JoinedAt">Record field: when the membership row was created (UTC).</param>
public record MemberOption(string Username, string? DisplayName, string? Source = null,
    DealerRole? DealerRole = null, string? Phone = null, DateTime? JoinedAt = null);
