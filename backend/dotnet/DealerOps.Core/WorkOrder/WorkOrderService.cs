using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Vehicle;
using DealerOps.Core.WorkOrder.Dto;

namespace DealerOps.Core.WorkOrder;

public class WorkOrderService
{
    private readonly AppDbContext _db;
    private readonly VehicleService _vehicleService;
    private readonly IAuditService _audit;

    public WorkOrderService(AppDbContext db, VehicleService vehicleService, IAuditService audit)
    {
        _db = db;
        _vehicleService = vehicleService;
        _audit = audit;
    }

    public List<WorkOrderResponse> List(long vehicleId)
    {
        var tenant = RequireTenant();
        LoadVehicle(vehicleId, tenant);
        return _db.WorkOrders
            .Where(w => w.VehicleId == vehicleId && w.DealerId == tenant)
            .OrderByDescending(w => w.CreatedAt).ThenByDescending(w => w.Id)
            .AsEnumerable()
            .OrderBy(w => w.Status.IsClosed())
            .Select(ToResponse).ToList();
    }

    public WorkOrderResponse Create(long vehicleId, CreateWorkOrderRequest body)
    {
        var tenant = RequireTenant();
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
        _db.WorkOrders.Add(order);
        _db.SaveChanges();

        Audit(order.Id, "CREATE", tenant,
            new Dictionary<string, object> { ["vehicleId"] = vehicleId, ["status"] = "OPEN" });
        return ToResponse(order);
    }

    public WorkOrderResponse Patch(long id, PatchWorkOrderRequest body)
    {
        var tenant = RequireTenant();
        var order = _db.WorkOrders.FirstOrDefault(w => w.Id == id && w.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        if (body.Version != order.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");
        if (order.Status.IsClosed())
            throw new ApiException(ErrorCode.WorkOrderClosed, "Done and cancelled work orders cannot be changed.");

        RequireInStock(LoadVehicle(order.VehicleId, tenant));
        var next = body.Status;
        if (next != order.Status && !order.Status.CanMoveTo(next))
            throw new ApiException(ErrorCode.Validation, "This status change is not allowed.");

        var task = body.Task.Trim();
        var assignee = TrimToNull(body.AssigneeUsername);
        var changed = new Dictionary<string, object>();

        if (next != order.Status)
            changed["status"] = next.ToString();
        if (order.Task != task)
            changed["task"] = true;
        if (order.AssigneeUsername != assignee)
        {
            RequireMember(tenant, assignee);
            changed["assigneeUsername"] = assignee ?? "";
        }
        if (order.DueOn != body.DueOn)
            changed["dueOn"] = true;

        if (next == WorkOrderStatus.Done)
        {
            var note = TrimToNull(body.CompletionNote);
            if (note == null || body.Cost == null)
                throw new ApiException(ErrorCode.Validation, "A finished work order needs a completion note and a cost.");
            order.CompletionNote = note;
            order.Cost = body.Cost;
            order.CompletedOn = DateOnly.FromDateTime(DateTime.UtcNow);
            changed["cost"] = true;
            changed["completionNote"] = true;
            _vehicleService.AddRepairCost(order.VehicleId, body.Cost.Value);
        }

        order.Status = next;
        order.Task = task;
        order.AssigneeUsername = assignee;
        order.DueOn = body.DueOn;
        order.UpdatedAt = DateTime.UtcNow;
        _db.SaveChanges();

        if (changed.Count > 0)
            Audit(order.Id, "UPDATE", tenant, changed);

        return ToResponse(order);
    }

    private VehicleEntity LoadVehicle(long vehicleId, long tenant)
    {
        return _db.Vehicles.FirstOrDefault(v => v.Id == vehicleId && v.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static void RequireInStock(VehicleEntity vehicle)
    {
        if (vehicle.Status == VehicleStatus.SOLD)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");
    }

    private void RequireMember(long tenant, string? username)
    {
        if (username != null &&
            !_db.Memberships.Any(m => m.DealerId == tenant && m.Username == username && m.Active))
            throw new ApiException(ErrorCode.Validation, "Assignee must be a member of this dealership.");
    }

    private void Audit(long orderId, string action, long tenant, Dictionary<string, object> fields)
    {
        _audit.Record("WORK_ORDER", orderId, action, tenant, ActorUsername(), fields);
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

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
