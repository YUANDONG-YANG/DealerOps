namespace DealerOps.Core.Audit;

public interface IAuditService
{
    /// <summary>
    /// Adds an audit row to the current unit of work; the caller's SaveChanges commits it together
    /// with the business change (AUD-07). <paramref name="fieldSummary"/> holds the new values of
    /// the changed fields and <paramref name="previous"/> the values they replaced, contact fields
    /// included, so every version of a record can be traced (AUD-04, AUD-13).
    /// </summary>
    void Record(string entityType, long entityId, string action,
        long? dealerId, string actorUsername, Dictionary<string, object>? fieldSummary,
        Dictionary<string, object?>? previous = null);
}
