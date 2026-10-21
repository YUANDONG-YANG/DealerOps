using System.Text.Json;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;

namespace DealerOps.Core.Notifications;

/// <summary>
/// Writes and reads dealership inbox messages. The caller supplies the dealer scope and a
/// kind-specific payload object; serialization and the resolve-by-correlation lookup live here
/// so callers never need to touch the raw JSON. A notification is considered "unread" while
/// <see cref="NotificationEntity.ResolvedAt"/> is null; the first user who approves or rejects
/// marks it, and every subsequent inbox fetch across the dealership skips it.
/// </summary>
public class NotificationService
{
    /// <summary>A buyer-site inquiry filed as a NEW lead; every member sees it until someone takes the lead.</summary>
    public const string BuyerInquiry = "BUYER_INQUIRY";

    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly AppDbContext _db;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext db, ILogger<NotificationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Posts an unread message of <paramref name="kind"/> to every member of the dealership.
    /// </summary>
    public NotificationEntity Create(long dealerId, string kind, object payload)
    {
        var entity = new NotificationEntity
        {
            DealerId = dealerId,
            Kind = kind,
            Payload = JsonSerializer.Serialize(payload, JsonOpts),
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(entity);
        _db.SaveChanges();
        _logger.LogInformation("Notification created notificationId={NotificationId} kind={Kind} dealerId={DealerId}",
            entity.Id, kind, dealerId);
        return entity;
    }

    /// <summary>
    /// Resolves the newest unresolved notification matching the correlation key — a kind plus
    /// a payload field equal to <paramref name="correlationValue"/>. Join-request flows use
    /// kind=JOIN_REQUEST and the applicant's username, so the right row is picked even when
    /// the same applicant made multiple attempts.
    /// </summary>
    public void ResolveByCorrelation(long dealerId, string kind,
        string correlationField, string correlationValue, string action, string actor)
    {
        // Pulled into memory because the payload is TEXT JSON and MySQL doesn't give a clean
        // index-friendly lookup for a single JSON field across providers; the unresolved
        // window per dealership is tiny, so a filter in-process is fine.
        var candidates = _db.Notifications
            .Where(n => n.DealerId == dealerId && n.Kind == kind && n.ResolvedAt == null)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .ToList();

        foreach (var row in candidates)
        {
            using var doc = JsonDocument.Parse(row.Payload);
            if (doc.RootElement.TryGetProperty(correlationField, out var value)
                && value.ValueKind == JsonValueKind.String
                && string.Equals(value.GetString(), correlationValue, StringComparison.Ordinal))
            {
                row.ResolvedAt = DateTime.UtcNow;
                row.ResolvedBy = actor;
                row.ResolvedAction = action;
                _db.SaveChanges();
                // Resolving is an inbox state change, not a business record: logged, not audited.
                _logger.LogInformation(
                    "Notification resolved notificationId={NotificationId} kind={Kind} dealerId={DealerId} action={Action} by {Actor}",
                    row.Id, kind, dealerId, action, actor);
                return;
            }
        }
    }

    /// <summary>
    /// The caller's dealership inbox, newest first; resolved rows are included only for the
    /// message-history view. Join requests are for managers only (AUTH-27); staff see the rest.
    /// </summary>
    public List<NotificationEntity> List(bool includeResolved)
    {
        var user = TenantGuard.RequireDealerUser();
        var tenant = user.TenantDealerId!.Value;
        var query = _db.Notifications.Where(n => n.DealerId == tenant);
        if (user.DealerRole != DealerRole.Manager) query = query.Where(n => n.Kind != "JOIN_REQUEST");
        if (!includeResolved) query = query.Where(n => n.ResolvedAt == null);
        return query.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id).ToList();
    }
}
