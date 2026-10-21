namespace DealerOps.Core.Audit.Dto;

/// <summary>Optional filters of the admin and dealership audit logs; From is inclusive and To exclusive (ISO 8601 instants).</summary>
public record AuditLogFilter(
    string? EntityType,
    long? EntityId,
    string? Action,
    string? Actor,
    long? DealerId,
    DateTimeOffset? From,
    DateTimeOffset? To);
