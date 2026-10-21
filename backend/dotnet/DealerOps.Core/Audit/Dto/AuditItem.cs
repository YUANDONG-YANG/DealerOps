namespace DealerOps.Core.Audit.Dto;

/// <summary>
/// One audit row on the wire. Previous holds the replaced values of an UPDATE. ClientIp is
/// returned only on the admin and dealership audit logs, never on a record's history.
/// </summary>
public record AuditItem(
    long Id,
    string EntityType,
    long EntityId,
    string Action,
    Dictionary<string, object>? FieldSummary,
    string ActorUsername,
    DateTime CreatedAt,
    Dictionary<string, object>? Previous = null,
    long? DealerId = null,
    string? ClientIp = null);
