using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Vehicle;
using DealerOps.Core.WorkOrder.Dto;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.WorkOrder;

/// <summary>
/// Reconditioning work orders on one in-stock vehicle (design/21 §4, WO-01 to WO-08). Every
/// create and change is audited as <c>WORK_ORDER</c>; finishing an order adds its cost to the
/// vehicle's repair cost in the same transaction.
/// </summary>
public class WorkOrderService
{
    private readonly AppDbContext _db;
    private readonly VehicleService _vehicleService;
    private readonly IAuditService _audit;
    private readonly ILogger<WorkOrderService> _logger;

    public WorkOrderService(AppDbContext db, VehicleService vehicleService, IAuditService audit,
        ILogger<WorkOrderService> logger)
    {
        _db = db;
        _vehicleService = vehicleService;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>Work orders of one vehicle: open and in-progress first, then closed, each group newest first.</summary>
    public List<WorkOrderResponse> List(long vehicleId)
    {
        var tenant = TenantGuard.RequireTenantId();
        LoadVehicle(vehicleId, tenant);
        return _db.WorkOrders.AsNoTracking()
            .Where(w => w.VehicleId == vehicleId && w.DealerId == tenant)
            .AsEnumerable()
            .OrderBy(w => w.Status.IsClosed())
            .ThenByDescending(w => w.CreatedAt).ThenByDescending(w => w.Id)
            .Select(ToResponse).ToList();
    }

    /// <summary>Workshop settlement report for the caller's dealership (WO-08); cancelled orders are not counted.</summary>
    public WorkshopSettlementReport Settlement()
    {
        var tenant = TenantGuard.RequireTenantId();
        var orders = _db.WorkOrders.AsNoTracking()
            .Where(w => w.DealerId == tenant)
            .Select(w => new { w.Status, w.AssigneeUsername, w.Cost, w.CompletedOn })
            .ToList();
        var done = orders.Where(w => w.Status == WorkOrderStatus.Done).ToList();

        var months = done
            .Where(w => w.CompletedOn != null)
            .GroupBy(w => $"{w.CompletedOn!.Value.Year:D4}-{w.CompletedOn.Value.Month:D2}")
            .OrderByDescending(g => g.Key)
            .Take(12)
            .Select(g => new MonthlyWorkshop(g.Key, g.Count(), g.Sum(w => w.Cost ?? 0)))
            .ToList();
        var assignees = orders
            .Where(w => w.Status != WorkOrderStatus.Cancelled)
            .GroupBy(w => w.AssigneeUsername)
            .Select(g => new AssigneeWorkshop(g.Key,
                g.Count(w => !w.Status.IsClosed()),
                g.Count(w => w.Status == WorkOrderStatus.Done),
                g.Where(w => w.Status == WorkOrderStatus.Done).Sum(w => w.Cost ?? 0)))
            .OrderByDescending(a => a.SettledCost).ThenBy(a => a.AssigneeUsername)
            .ToList();

        return new WorkshopSettlementReport(
            orders.Count(w => w.Status == WorkOrderStatus.Open),
            orders.Count(w => w.Status == WorkOrderStatus.InProgress),
            done.Count,
            done.Sum(w => w.Cost ?? 0),
            months,
            assignees);
    }

    /// <summary>Creates an <c>OPEN</c> work order on an in-stock vehicle and audits it (WO-01, WO-06).</summary>
    public WorkOrderResponse Create(long vehicleId, CreateWorkOrderRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        RequireInStock(LoadVehicle(vehicleId, tenant));
        var assignee = TrimToNull(body.AssigneeUsername);
        RequireMember(tenant, assignee);

        var order = new WorkOrderEntity
        {
            DealerId = tenant,
            VehicleId = vehicleId,
            Task = body.Task.Trim(),
            AssigneeUsername = assignee,
            Status = WorkOrderStatus.Open,
            DueOn = body.DueOn
        };
        using var tx = _db.Database.BeginTransaction();
        _db.WorkOrders.Add(order);
        _db.SaveChanges();
        Audit(order.Id, "CREATE", tenant,
            new Dictionary<string, object> { ["vehicleId"] = vehicleId, ["status"] = "OPEN" });
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Work order created workOrderId={WorkOrderId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
            order.Id, vehicleId, tenant, TenantContext.ActorUsername());
        return ToResponse(order);
    }

    /// <summary>
    /// Replaces the editable state of an open work order (WO-02, WO-03). The audit row holds the new
    /// value of each changed field and its previous value; marking it <c>DONE</c> also adds the cost
    /// to the vehicle's repair cost, audited on the vehicle, in the same transaction (WO-04).
    /// </summary>
    public WorkOrderResponse Patch(long id, PatchWorkOrderRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var order = _db.WorkOrders.FirstOrDefault(w => w.Id == id && w.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        if (body.Version != order.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");
        if (order.Status.IsClosed())
        {
            _logger.LogWarning("Change to closed work order rejected workOrderId={WorkOrderId} status={Status} dealerId={DealerId} by {Actor}",
                order.Id, EnumWireName.Of(order.Status), tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.WorkOrderClosed, "Done and cancelled work orders cannot be changed.");
        }

        RequireInStock(LoadVehicle(order.VehicleId, tenant));
        var next = body.Status;
        if (next != order.Status && !order.Status.CanMoveTo(next))
            throw new ApiException(ErrorCode.Validation, "This status change is not allowed.");

        var task = body.Task.Trim();
        var assignee = TrimToNull(body.AssigneeUsername);
        var changed = new Dictionary<string, object>();
        var previous = new Dictionary<string, object?>();

        if (next != order.Status)
        {
            changed["status"] = EnumWireName.Of(next);
            previous["status"] = EnumWireName.Of(order.Status);
        }
        if (order.Task != task)
        {
            changed["task"] = true;
            previous["task"] = order.Task;
        }
        if (order.AssigneeUsername != assignee)
        {
            RequireMember(tenant, assignee);
            changed["assigneeUsername"] = assignee ?? "";
            previous["assigneeUsername"] = order.AssigneeUsername ?? "";
        }
        if (order.DueOn != body.DueOn)
        {
            changed["dueOn"] = true;
            previous["dueOn"] = order.DueOn?.ToString("yyyy-MM-dd");
        }

        var done = next == WorkOrderStatus.Done;
        string? completionNote = null;
        decimal repairCost = 0;
        if (done)
        {
            completionNote = TrimToNull(body.CompletionNote);
            if (completionNote == null || body.Cost == null)
                throw new ApiException(ErrorCode.Validation, "A finished work order needs a completion note and a cost.");
            repairCost = body.Cost.Value;
            // An open order has no cost or note yet, so both previous values are always null.
            changed["cost"] = true;
            previous["cost"] = order.Cost;
            changed["completionNote"] = true;
            previous["completionNote"] = null;
        }

        // The work order, its audit row, and the vehicle repair cost must commit together (AUD-07, WO-04).
        using var tx = _db.Database.BeginTransaction();

        if (done)
        {
            order.CompletionNote = completionNote;
            order.Cost = repairCost;
            order.CompletedOn = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        order.Status = next;
        order.Task = task;
        order.AssigneeUsername = assignee;
        order.DueOn = body.DueOn;
        order.UpdatedAt = DateTime.UtcNow;

        if (changed.Count > 0)
            Audit(order.Id, "UPDATE", tenant, changed, previous);
        _db.SaveChanges();

        if (done)
            _vehicleService.AddRepairCost(order.VehicleId, repairCost);

        tx.Commit();

        if (changed.Count > 0)
            _logger.LogInformation("Work order updated workOrderId={WorkOrderId} vehicleId={VehicleId} dealerId={DealerId} fields={Fields} status={Status} by {Actor}",
                order.Id, order.VehicleId, tenant, string.Join(",", changed.Keys), EnumWireName.Of(order.Status), TenantContext.ActorUsername());
        if (done)
            _logger.LogInformation("Work order completed workOrderId={WorkOrderId} vehicleId={VehicleId} dealerId={DealerId} cost={Cost} by {Actor}",
                order.Id, order.VehicleId, tenant, repairCost, TenantContext.ActorUsername());
        return ToResponse(order);
    }

    private VehicleEntity LoadVehicle(long vehicleId, long tenant)
    {
        return _db.Vehicles.FirstOrDefault(v => v.Id == vehicleId && v.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static void RequireInStock(VehicleEntity vehicle)
    {
        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");
    }

    private void RequireMember(long tenant, string? username)
    {
        if (username != null &&
            !_db.Memberships.Any(m => m.DealerId == tenant && m.Username == username && m.Active))
            throw new ApiException(ErrorCode.Validation, "Assignee must be a member of this dealership.");
    }

    private void Audit(long orderId, string action, long tenant, Dictionary<string, object> fields,
        Dictionary<string, object?>? previous = null)
    {
        _audit.Record("WORK_ORDER", orderId, action, tenant, TenantContext.ActorUsername(), fields, previous);
    }

    private static WorkOrderResponse ToResponse(WorkOrderEntity order)
    {
        return new WorkOrderResponse(
            order.Id, order.VehicleId, order.Task, order.AssigneeUsername,
            order.Status, order.DueOn, order.Cost, order.CompletionNote,
            order.CompletedOn, order.CreatedAt, order.Version);
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

}
