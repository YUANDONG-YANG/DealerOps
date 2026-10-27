using System.Text.Json;
using DealerOps.Core.Audit.Dto;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Audit;

/// <summary>
/// Writes and reads the append-only audit trail (AUD-01 to AUD-09). Staff read no audit (AUD-17).
/// A manager reads one record's history and the whole dealership's log; the platform admin reads
/// every row. All reads are newest first (AUD-10, AUD-11).
/// </summary>
public class AuditService : IAuditService
{
    private static readonly Dictionary<string, EntityType> EntityTypeMap =
        Enum.GetValues<EntityType>().ToDictionary(t => EnumWireName.Of(t), StringComparer.OrdinalIgnoreCase);

    private static readonly Dictionary<string, AuditAction> ActionMap =
        Enum.GetValues<AuditAction>().ToDictionary(a => EnumWireName.Of(a), StringComparer.OrdinalIgnoreCase);

    private static readonly HashSet<string> AllowedStaffTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "VEHICLE", "CUSTOMER", "CUSTOMER_VEHICLE", "LEAD", "WORK_ORDER", "VEHICLE_PHOTO", "LISTING"
    };

    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly ILogger<AuditService> _logger;

    public AuditService(AppDbContext db, IHttpContextAccessor http, ILogger<AuditService> logger)
    {
        _db = db;
        _http = http;
        _logger = logger;
    }

    public void Record(string entityType, long entityId, string action,
        long? dealerId, string actorUsername, Dictionary<string, object>? fieldSummary,
        Dictionary<string, object?>? previous = null)
    {
        // An unknown type or action is a coding error; failing keeps a wrong row out of the trail.
        if (!EntityTypeMap.TryGetValue(entityType, out var et))
            throw new ArgumentException($"Unknown audit entity type {entityType}", nameof(entityType));
        if (!ActionMap.TryGetValue(action, out var act))
            throw new ArgumentException($"Unknown audit action {action}", nameof(action));

        var entity = new AuditEventEntity
        {
            DealerId = dealerId,
            ActorUsername = actorUsername ?? "",
            EntityType = et,
            EntityId = entityId,
            Action = act,
            FieldSummary = fieldSummary is { Count: > 0 }
                ? JsonSerializer.Serialize(fieldSummary)
                : null,
            PreviousValues = previous is { Count: > 0 }
                ? JsonSerializer.Serialize(previous)
                : null,
            ClientIp = ClientIp()
        };
        _db.AuditEvents.Add(entity);
    }

    /// <summary>Platform audit log for the admin: every row, newest first, with optional filters.</summary>
    public PageResponse<AuditItem> ListPlatform(AuditLogFilter filter, int page, int size)
    {
        TenantGuard.RequireAdmin();
        var query = Filtered(_db.AuditEvents, filter);
        if (filter.DealerId != null)
            query = query.Where(e => e.DealerId == filter.DealerId);
        return PageOfLog(query, page, size, ToItem);
    }

    /// <summary>The manager's own dealership log: every row of the tenant, newest first (AUD-11).</summary>
    public PageResponse<AuditItem> ListDealership(AuditLogFilter filter, int page, int size)
    {
        var tenant = TenantGuard.RequireManager().TenantDealerId!.Value;
        return PageOfLog(Filtered(_db.AuditEvents.Where(e => e.DealerId == tenant), filter), page, size, ToItem);
    }

    private static IQueryable<AuditEventEntity> Filtered(IQueryable<AuditEventEntity> query, AuditLogFilter filter)
    {
        if (!string.IsNullOrWhiteSpace(filter.EntityType))
        {
            if (!EntityTypeMap.TryGetValue(filter.EntityType.Trim(), out var type))
                throw new ApiException(ErrorCode.Validation, "Request is invalid.");
            query = query.Where(e => e.EntityType == type);
        }
        if (filter.EntityId != null)
            query = query.Where(e => e.EntityId == filter.EntityId);
        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            if (!ActionMap.TryGetValue(filter.Action.Trim(), out var action))
                throw new ApiException(ErrorCode.Validation, "Request is invalid.");
            query = query.Where(e => e.Action == action);
        }
        if (!string.IsNullOrWhiteSpace(filter.Actor))
        {
            var actor = filter.Actor.Trim();
            query = query.Where(e => e.ActorUsername == actor);
        }
        // Rows are stored in UTC; the caller sends instants so a "day" follows the viewer's time zone.
        if (filter.From != null)
        {
            var from = filter.From.Value.UtcDateTime;
            query = query.Where(e => e.CreatedAt >= from);
        }
        if (filter.To != null)
        {
            var to = filter.To.Value.UtcDateTime;
            query = query.Where(e => e.CreatedAt < to);
        }
        return query;
    }

    private static PageResponse<AuditItem> PageOfLog(
        IQueryable<AuditEventEntity> query, int page, int size, Func<AuditEventEntity, AuditItem> toItem)
    {
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var total = query.Count();
        var items = query.OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)
            .Skip(p * s).Take(s)
            .AsEnumerable()
            .Select(e => toItem(e) with { DealerId = e.DealerId, ClientIp = e.ClientIp })
            .ToList();
        return new PageResponse<AuditItem>(items, p, s, total);
    }

    /// <summary>The caller's address: the gateway sets X-Forwarded-For, otherwise the socket peer.</summary>
    private string? ClientIp()
    {
        var context = _http.HttpContext;
        if (context == null) return null;
        var forwarded = context.Request.Headers["X-Forwarded-For"].ToString();
        var ip = string.IsNullOrWhiteSpace(forwarded)
            ? context.Connection.RemoteIpAddress?.ToString()
            : forwarded.Split(',')[0].Trim();
        return ip is { Length: > 45 } ? ip[..45] : ip;
    }

    /// <summary>One record's history, newest first (AUD-06). Manager only: staff see no audit (AUD-17).</summary>
    public PageResponse<AuditItem> List(string entityType, long entityId, int page, int size)
    {
        // Another dealership's record stays 404 for every caller; only then is the role checked.
        var tenant = TenantGuard.RequireTenantId();
        if (string.IsNullOrWhiteSpace(entityType))
            throw new ApiException(ErrorCode.Validation, "Request is invalid.");

        var type = entityType.Trim().ToUpperInvariant();
        if (type is "DEALER" or "MEMBERSHIP")
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        if (!AllowedStaffTypes.Contains(type))
            throw new ApiException(ErrorCode.Validation, "Request is invalid.");

        AssertEntityInDealer(type, entityId, tenant);
        TenantGuard.RequireManager();

        if (type == "CUSTOMER")
            return CustomerHistory(tenant, entityId, page, size);
        if (type == "VEHICLE")
            return VehicleHistory(tenant, entityId, page, size);

        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);

        var parsedType = EntityTypeMap[type];
        var query = _db.AuditEvents
            .Where(e => e.DealerId == tenant && e.EntityType == parsedType && e.EntityId == entityId)
            .OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id);

        var total = query.Count();
        var items = query.Skip(p * s).Take(s)
            .AsEnumerable()
            .Select(ToItem).ToList();

        return new PageResponse<AuditItem>(items, p, s, total);
    }

    private PageResponse<AuditItem> CustomerHistory(long tenant, long customerId, int page, int size)
    {
        // Link rows carry the customer id only inside the JSON summary, so those are matched in memory.
        var source = _db.AuditEvents
            .Where(e => e.DealerId == tenant
                && ((e.EntityType == EntityType.Customer && e.EntityId == customerId)
                    || e.EntityType == EntityType.CustomerVehicle))
            .OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)
            .ToList();

        var events = source
            .Where(e =>
            {
                if (e.EntityType == EntityType.Customer)
                    return e.EntityId == customerId;
                if (e.EntityType != EntityType.CustomerVehicle)
                    return false;
                var summary = DeserializeSummary(e.FieldSummary, e.Id, "fieldSummary");
                if (summary == null) return false;
                if (!summary.TryGetValue("customerId", out var val)) return false;
                if (val is JsonElement je && je.TryGetInt64(out var id))
                    return id == customerId;
                if (val is long l)
                    return l == customerId;
                return false;
            })
            .Select(ToItem).ToList();

        return PageOf(events, page, size);
    }

    private static PageResponse<AuditItem> PageOf(List<AuditItem> events, int page, int size)
    {
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var from = Math.Min(p * s, events.Count);
        var to = Math.Min(from + s, events.Count);
        return new PageResponse<AuditItem>(events.GetRange(from, to - from), p, s, events.Count);
    }

    private static bool SummaryIdEquals(Dictionary<string, object>? summary, string key, long id)
    {
        if (summary == null || !summary.TryGetValue(key, out var val)) return false;
        if (val is JsonElement je && je.TryGetInt64(out var parsed)) return parsed == id;
        if (val is long l) return l == id;
        if (val is int i) return i == id;
        return false;
    }

    private PageResponse<AuditItem> VehicleHistory(long tenant, long vehicleId, int page, int size)
    {
        // Photo rows stay in the vehicle history after the photo itself is deleted (IMG-04);
        // customer link/unlink rows appear here as well as in the customer history (AUD-06).
        // Work-order rows (WO-06) are matched by order id, since status updates carry no vehicle id.
        var workOrderIds = _db.WorkOrders
            .Where(w => w.DealerId == tenant && w.VehicleId == vehicleId)
            .Select(w => w.Id)
            .ToList();
        var source = _db.AuditEvents
            .Where(e => e.DealerId == tenant
                && ((e.EntityType == EntityType.Vehicle && e.EntityId == vehicleId)
                    || (e.EntityType == EntityType.WorkOrder && workOrderIds.Contains(e.EntityId))
                    || e.EntityType == EntityType.VehiclePhoto
                    || e.EntityType == EntityType.CustomerVehicle))
            .OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)
            .ToList();

        var events = source
            .Where(e => e.EntityType == EntityType.Vehicle || e.EntityType == EntityType.WorkOrder
                || SummaryIdEquals(DeserializeSummary(e.FieldSummary, e.Id, "fieldSummary"), "vehicleId", vehicleId))
            .Select(ToItem).ToList();

        return PageOf(events, page, size);
    }

    private void AssertEntityInDealer(string type, long entityId, long tenant)
    {
        bool found = type switch
        {
            "VEHICLE" => _db.Vehicles.IgnoreQueryFilters().Any(v => v.Id == entityId && v.DealerId == tenant),
            "CUSTOMER" => _db.Customers.IgnoreQueryFilters().Any(c => c.Id == entityId && c.DealerId == tenant),
            "CUSTOMER_VEHICLE" =>
                _db.CustomerVehicles.Any(cv => cv.Id == entityId && cv.DealerId == tenant)
                || _db.AuditEvents.Any(e => e.DealerId == tenant
                    && e.EntityType == EntityType.CustomerVehicle && e.EntityId == entityId),
            "LEAD" => _db.Leads.Any(l => l.Id == entityId && l.DealerId == tenant),
            "WORK_ORDER" => _db.WorkOrders.Any(w => w.Id == entityId && w.DealerId == tenant),
            "LISTING" => _db.Listings.Any(l => l.Id == entityId && l.DealerId == tenant),
            "VEHICLE_PHOTO" =>
                _db.VehiclePhotos.Any(p => p.Id == entityId && p.DealerId == tenant)
                || _db.AuditEvents.Any(e => e.DealerId == tenant
                    && e.EntityType == EntityType.VehiclePhoto && e.EntityId == entityId),
            _ => false
        };
        if (!found)
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private AuditItem ToItem(AuditEventEntity e) =>
        new(e.Id, EnumSnakeCaseConverter<EntityType>.ToWire(e.EntityType), e.EntityId,
            EnumSnakeCaseConverter<AuditAction>.ToWire(e.Action),
            DeserializeSummary(e.FieldSummary, e.Id, "fieldSummary"), e.ActorUsername,
            DateTime.SpecifyKind(e.CreatedAt, DateTimeKind.Utc),
            DeserializeSummary(e.PreviousValues, e.Id, "previousValues"));

    /// <summary>
    /// Reads one stored JSON object. A blob that cannot be parsed is omitted and logged once;
    /// the text is never logged because it holds contact values.
    /// </summary>
    private Dictionary<string, object>? DeserializeSummary(string? json, long auditEventId, string column)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<Dictionary<string, object>>(json); }
        catch (JsonException)
        {
            _logger.LogWarning(
                "Audit summary unreadable auditEventId={AuditEventId} column={Column}",
                auditEventId, column);
            return null;
        }
    }
}
