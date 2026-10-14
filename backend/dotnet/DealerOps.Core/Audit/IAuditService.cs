namespace DealerOps.Core.Audit;

public interface IAuditService
{
    void Record(string entityType, long entityId, string action,
        long? dealerId, string actorUsername, Dictionary<string, object>? fieldSummary);
}
