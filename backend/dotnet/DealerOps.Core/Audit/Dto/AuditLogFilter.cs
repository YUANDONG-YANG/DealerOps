namespace DealerOps.Core.Audit.Dto;

/// <summary>
/// Optional filters of the admin and dealership audit logs; From is inclusive and To exclusive (ISO 8601 instants).
/// Actor matches any part of the username, ignoring case. Q is free text matched, ignoring case, against
/// the action, the record type and the stored change values (new and previous).
/// Sort is <c>field,asc|desc</c>; without it the log is newest first.
/// </summary>
public record AuditLogFilter(
    string? EntityType,
    long? EntityId,
    string? Action,
    string? Actor,
    long? DealerId,
    DateTimeOffset? From,
    DateTimeOffset? To,
    string? Sort = null,
    string? Q = null);
