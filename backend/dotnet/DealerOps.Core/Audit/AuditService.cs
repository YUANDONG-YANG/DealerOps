using System.Text.Json;
using DealerOps.Core.Audit.Dto;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;

namespace DealerOps.Core.Audit;

public class AuditService : IAuditService
{
    private static readonly Dictionary<string, EntityType> EntityTypeMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["VEHICLE"] = EntityType.Vehicle,
        ["CUSTOMER"] = EntityType.Customer,
        ["CUSTOMER_VEHICLE"] = EntityType.CustomerVehicle,
        ["DEALER"] = EntityType.Dealer,
        ["MEMBERSHIP"] = EntityType.Membership,
        ["LEAD"] = EntityType.Lead,
        ["WORK_ORDER"] = EntityType.WorkOrder,
        ["VEHICLE_PHOTO"] = EntityType.VehiclePhoto,
        ["APP_USER"] = EntityType.AppUser
    };

    private static readonly Dictionary<string, AuditAction> ActionMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["CREATE"] = AuditAction.Create,
        ["UPDATE"] = AuditAction.Update,
        ["SELL"] = AuditAction.Sell,
        ["LINK"] = AuditAction.Link,
        ["UNLINK"] = AuditAction.Unlink,
        ["NOTE"] = AuditAction.Note,
        ["DELETE"] = AuditAction.Delete
    };

    private static readonly HashSet<string> AllowedStaffTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "VEHICLE", "CUSTOMER", "CUSTOMER_VEHICLE", "LEAD", "WORK_ORDER", "VEHICLE_PHOTO"
    };

    private readonly AppDbContext _db;

    public AuditService(AppDbContext db)
    {
        _db = db;
    }

    public void Record(string entityType, long entityId, string action,
        long? dealerId, string actorUsername, Dictionary<string, object>? fieldSummary)
    {
        if (!EntityTypeMap.TryGetValue(entityType, out var et))
            et = EntityType.Vehicle;
        if (!ActionMap.TryGetValue(action, out var act))
            act = AuditAction.Create;

        var entity = new AuditEventEntity
        {
            DealerId = dealerId,
            ActorUsername = actorUsername ?? "",
            EntityType = et,
            EntityId = entityId,
            Action = act,
            FieldSummary = fieldSummary is { Count: > 0 }
                ? JsonSerializer.Serialize(fieldSummary)
                : null
        };
        _db.AuditEvents.Add(entity);
        _db.SaveChanges();
    }

    public PageResponse<AuditItem> List(string entityType, long entityId, int page, int size)
    {
        TenantGuard.RequireDealerUser();
        if (string.IsNullOrWhiteSpace(entityType))
            throw new ApiException(ErrorCode.Validation, "Request is invalid.");

        var type = entityType.Trim().ToUpperInvariant();
        if (type is "DEALER" or "MEMBERSHIP")
            throw new ApiException(ErrorCode.Forbidden, "Forbidden");
        if (!AllowedStaffTypes.Contains(type))
            throw new ApiException(ErrorCode.Validation, "Request is invalid.");

        var tenant = TenantContext.Get()!.TenantDealerId!.Value;
        AssertEntityInDealer(type, entityId, tenant);

        if (type == "CUSTOMER")
            return CustomerHistory(tenant, entityId, page, size);

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
        var source = _db.AuditEvents
            .Where(e => e.DealerId == tenant)
            .OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)
            .ToList();

        var events = source
            .Where(e =>
            {
                if (e.EntityType == EntityType.Customer)
                    return e.EntityId == customerId;
                if (e.EntityType != EntityType.CustomerVehicle)
                    return false;
                var summary = DeserializeSummary(e.FieldSummary);
                if (summary == null) return false;
                if (!summary.TryGetValue("customerId", out var val)) return false;
                if (val is JsonElement je && je.TryGetInt64(out var id))
                    return id == customerId;
                if (val is long l)
                    return l == customerId;
                return false;
            })
            .Select(ToItem).ToList();

        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var from = Math.Min(p * s, events.Count);
        var to = Math.Min(from + s, events.Count);
        return new PageResponse<AuditItem>(events.GetRange(from, to - from), p, s, events.Count);
    }

    private void AssertEntityInDealer(string type, long entityId, long tenant)
    {
        bool found = type switch
        {
            "VEHICLE" => _db.Vehicles.Any(v => v.Id == entityId && v.DealerId == tenant),
            "CUSTOMER" => _db.Customers.Any(c => c.Id == entityId && c.DealerId == tenant),
            "CUSTOMER_VEHICLE" =>
                _db.CustomerVehicles.Any(cv => cv.Id == entityId && cv.DealerId == tenant)
                || _db.AuditEvents.Any(e => e.DealerId == tenant
                    && e.EntityType == EntityType.CustomerVehicle && e.EntityId == entityId),
            "LEAD" => _db.Leads.Any(l => l.Id == entityId && l.DealerId == tenant),
            "WORK_ORDER" => _db.WorkOrders.Any(w => w.Id == entityId && w.DealerId == tenant),
            "VEHICLE_PHOTO" =>
                _db.VehiclePhotos.Any(p => p.Id == entityId && p.DealerId == tenant)
                || _db.AuditEvents.Any(e => e.DealerId == tenant
                    && e.EntityType == EntityType.VehiclePhoto && e.EntityId == entityId),
            _ => false
        };
        if (!found)
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static AuditItem ToItem(AuditEventEntity e) =>
        new(e.Id, e.EntityType.ToString(), e.EntityId, e.Action.ToString(),
            DeserializeSummary(e.FieldSummary), e.ActorUsername, e.CreatedAt);

    private static Dictionary<string, object>? DeserializeSummary(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<Dictionary<string, object>>(json); }
        catch { return null; }
    }
}
