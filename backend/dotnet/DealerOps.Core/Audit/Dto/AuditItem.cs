namespace DealerOps.Core.Audit.Dto;

public record AuditItem(
    long Id,
    string EntityType,
    long EntityId,
    string Action,
    Dictionary<string, object>? FieldSummary,
    string ActorUsername,
    DateTime CreatedAt);
