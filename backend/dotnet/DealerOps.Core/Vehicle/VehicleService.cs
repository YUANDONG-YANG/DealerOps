using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Listing;
using DealerOps.Core.Vehicle.Dto;
using DealerOps.Core.WorkOrder;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Vehicle;

public class VehicleService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public VehicleService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public PageResponse<VehicleResponse> List(VehicleFilter filter, int page, int size)
    {
        var tenant = RequireTenant();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);
        var q = TrimToNull(filter.Q);
        var make = TrimToNull(filter.Make);
        var model = TrimToNull(filter.Model);

        IQueryable<VehicleEntity> query = _db.Vehicles.Where(v => v.DealerId == tenant);

        if (q != null)
            query = query.Where(v =>
                EF.Functions.Like(v.Vin, $"%{q}%") ||
                EF.Functions.Like(v.Make, $"%{q}%") ||
                EF.Functions.Like(v.Model, $"%{q}%"));

        if (filter.Status.HasValue)
            query = query.Where(v => v.Status == filter.Status.Value);
        if (filter.Condition.HasValue)
            query = query.Where(v => v.ConditionCode == filter.Condition.Value);
        if (make != null)
            query = query.Where(v => v.Make.ToLower() == make.ToLower());
        if (model != null)
            query = query.Where(v => v.Model.ToLower() == model.ToLower());
        if (filter.ModelYear.HasValue)
            query = query.Where(v => v.ModelYear == filter.ModelYear.Value);

        var total = query.LongCount();
        var items = query
            .OrderByDescending(v => v.CreatedAt)
            .ThenByDescending(v => v.Id)
            .Skip(p * s).Take(s)
            .AsEnumerable()
            .Select(ToResponse)
            .ToList();

        return new PageResponse<VehicleResponse>(items, p, s, total);
    }

    public VehicleResponse Create(CreateVehicleRequest body)
    {
        var tenant = RequireTenant();
        RequireModelYearInRange(body.ModelYear);
        var vin = NormalizeVin(body.Vin);
        var addedOn = body.AddedOn!.Value;
        RequireAddedOnNotInFuture(addedOn);

        if (_db.Vehicles.Any(v => v.DealerId == tenant && v.Vin == vin))
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership.");

        var vehicle = new VehicleEntity
        {
            DealerId = tenant,
            Make = body.Make.Trim(),
            Model = body.Model.Trim(),
            ModelYear = body.ModelYear,
            Vin = vin,
            Source = body.Source!.Value,
            PurchaseCost = body.PurchaseCost!.Value,
            AddedOn = addedOn,
            ConditionCode = body.ConditionCode!.Value,
            RepairCost = body.RepairCost,
            CarfaxUrl = body.CarfaxUrl,
            Status = VehicleStatus.InStock,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        using var tx = _db.Database.BeginTransaction();
        _db.Vehicles.Add(vehicle);
        _db.SaveChanges();
        _audit.Record("VEHICLE", vehicle.Id, "CREATE",
            tenant, ActorUsername(), CreatedVehicleFields(vehicle));
        _db.SaveChanges();
        tx.Commit();

        return ToResponse(vehicle);
    }

    public VehicleResponse Get(long id)
    {
        return ToResponse(LoadThisDealer(id));
    }

    public VehicleResponse Patch(long id, PatchVehicleRequest body)
    {
        var tenant = RequireTenant();
        var vehicle = LoadThisDealer(id);

        if (body.Version != vehicle.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        RequireModelYearInRange(body.ModelYear);

        // A null value-type field means "not supplied": keep what is stored.
        var next = new PatchedVehicleValues(
            body.Make.Trim(),
            body.Model.Trim(),
            body.ModelYear,
            NormalizeVin(body.Vin),
            body.Source ?? vehicle.Source,
            body.PurchaseCost ?? vehicle.PurchaseCost,
            body.AddedOn ?? vehicle.AddedOn,
            body.ConditionCode ?? vehicle.ConditionCode,
            body.RepairCost,
            body.CarfaxUrl);

        if (body.AddedOn != null)
            RequireAddedOnNotInFuture(body.AddedOn.Value);

        var changed = ChangedVehicleFields(vehicle, next);

        if (vehicle.Status == VehicleStatus.Sold && PurchaseFieldsChanged(changed))
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (changed.ContainsKey("vin") && _db.Vehicles.Any(v => v.DealerId == tenant && v.Vin == next.Vin))
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership.");

        if (changed.Count == 0)
            return ToResponse(vehicle);

        vehicle.Make = next.Make;
        vehicle.Model = next.Model;
        vehicle.ModelYear = next.ModelYear;
        vehicle.Vin = next.Vin;
        vehicle.Source = next.Source;
        vehicle.PurchaseCost = next.PurchaseCost;
        vehicle.AddedOn = next.AddedOn;
        vehicle.ConditionCode = next.ConditionCode;
        vehicle.RepairCost = next.RepairCost;
        vehicle.CarfaxUrl = next.CarfaxUrl;
        vehicle.UpdatedAt = DateTime.UtcNow;

        if (changed.ContainsKey("conditionCode"))
        {
            long t = tenant;
            var listing = _db.Listings.FirstOrDefault(l => l.VehicleId == vehicle.Id && l.DealerId == t);
            if (listing != null)
            {
                listing.ContentVersion++;
                listing.Status = ListingStatus.Draft;
            }
        }

        _audit.Record("VEHICLE", vehicle.Id, "UPDATE",
            tenant, ActorUsername(), changed);
        _db.SaveChanges();

        return ToResponse(vehicle);
    }

    public VehicleResponse Sell(long id, SellVehicleRequest body)
    {
        var tenant = RequireTenant();

        if (body.SoldOn == null || body.SoldPrice == null)
            throw new ApiException(ErrorCode.SoldPairRequired, "Sold date and sold price are both required.");

        var vehicle = LoadThisDealer(id);

        if (body.Version != vehicle.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (CountOpenWorkOrders(vehicle) > 0)
            throw new ApiException(ErrorCode.WorkOrdersOpen, "Finish or cancel open work orders before selling.");

        if (body.SoldOn.Value < vehicle.AddedOn)
        {
            const string message = "Sold date must not be before the date added.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["soldOn"] = message });
        }

        if (body.SoldOn.Value > Today())
        {
            const string message = "Sold date must not be later than today.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["soldOn"] = message });
        }

        var changed = ChangedSellFields(vehicle, body);

        vehicle.Status = VehicleStatus.Sold;
        vehicle.SoldOn = body.SoldOn;
        vehicle.SoldPrice = body.SoldPrice;
        vehicle.UpdatedAt = DateTime.UtcNow;

        _audit.Record("VEHICLE", vehicle.Id, "SELL",
            tenant, ActorUsername(), changed);
        _db.SaveChanges();

        return ToResponse(vehicle);
    }

    public void AddRepairCost(long vehicleId, decimal cost)
    {
        var tenant = RequireTenant();
        var vehicle = LoadThisDealer(vehicleId);

        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (cost == 0)
            return;

        vehicle.RepairCost = (vehicle.RepairCost ?? 0) + cost;

        _audit.Record("VEHICLE", vehicle.Id, "UPDATE",
            tenant, ActorUsername(),
            new Dictionary<string, object> { ["repairCost"] = vehicle.RepairCost! });
        _db.SaveChanges();
    }

    private long CountOpenWorkOrders(VehicleEntity vehicle)
    {
        var dealerId = vehicle.DealerId;
        return _db.WorkOrders.LongCount(wo =>
            wo.VehicleId == vehicle.Id &&
            wo.DealerId == dealerId &&
            (wo.Status == WorkOrderStatus.Open ||
             wo.Status == WorkOrderStatus.InProgress));
    }

    private VehicleEntity LoadThisDealer(long id)
    {
        long tenant = RequireTenant();
        return _db.Vehicles.FirstOrDefault(v => v.Id == id && v.DealerId == tenant)
               ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private VehicleResponse ToResponse(VehicleEntity vehicle)
    {
        var dealerId = vehicle.DealerId;
        var linked = (from cv in _db.CustomerVehicles
                      join c in _db.Customers on cv.CustomerId equals c.Id
                      where cv.VehicleId == vehicle.Id && c.DealerId == dealerId
                      select new LinkedCustomerBrief(c.Id, c.Name)).FirstOrDefault();

        return new VehicleResponse(
            vehicle.Id,
            vehicle.Vin,
            vehicle.Make,
            vehicle.Model,
            vehicle.ModelYear,
            vehicle.Source,
            vehicle.PurchaseCost,
            vehicle.AddedOn,
            vehicle.ConditionCode,
            vehicle.RepairCost,
            vehicle.CarfaxUrl,
            vehicle.SoldOn,
            vehicle.SoldPrice,
            vehicle.Status,
            linked,
            CountOpenWorkOrders(vehicle),
            vehicle.Version);
    }

    private sealed record PatchedVehicleValues(
        string Make,
        string Model,
        int ModelYear,
        string Vin,
        VehicleSource Source,
        decimal PurchaseCost,
        DateOnly AddedOn,
        ConditionCode ConditionCode,
        decimal? RepairCost,
        string? CarfaxUrl);

    private static Dictionary<string, object> CreatedVehicleFields(VehicleEntity vehicle)
    {
        var fields = new Dictionary<string, object>
        {
            ["make"] = vehicle.Make, ["model"] = vehicle.Model, ["modelYear"] = vehicle.ModelYear,
            ["vin"] = vehicle.Vin,
            ["source"] = vehicle.Source.ToString(), ["purchaseCost"] = vehicle.PurchaseCost,
            ["addedOn"] = vehicle.AddedOn.ToString("yyyy-MM-dd"),
            ["conditionCode"] = vehicle.ConditionCode.ToString(), ["status"] = "IN_STOCK"
        };
        if (vehicle.RepairCost != null) fields["repairCost"] = vehicle.RepairCost;
        if (vehicle.CarfaxUrl != null) fields["carfaxUrl"] = vehicle.CarfaxUrl;
        return fields;
    }

    private static Dictionary<string, object> ChangedVehicleFields(
        VehicleEntity vehicle, PatchedVehicleValues next)
    {
        var changed = new Dictionary<string, object>();
        if (vehicle.Make != next.Make) changed["make"] = next.Make;
        if (vehicle.Model != next.Model) changed["model"] = next.Model;
        if (vehicle.ModelYear != next.ModelYear) changed["modelYear"] = next.ModelYear;
        if (vehicle.Vin != next.Vin) changed["vin"] = next.Vin;
        if (vehicle.Source != next.Source) changed["source"] = next.Source.ToString();
        if (vehicle.PurchaseCost != next.PurchaseCost) changed["purchaseCost"] = next.PurchaseCost;
        if (vehicle.AddedOn != next.AddedOn) changed["addedOn"] = next.AddedOn.ToString("yyyy-MM-dd");
        if (vehicle.ConditionCode != next.ConditionCode) changed["conditionCode"] = next.ConditionCode.ToString();
        if (MoneyChanged(vehicle.RepairCost, next.RepairCost)) changed["repairCost"] = (object?)next.RepairCost ?? "";
        if (vehicle.CarfaxUrl != next.CarfaxUrl) changed["carfaxUrl"] = (object?)next.CarfaxUrl ?? "";
        return changed;
    }

    private static Dictionary<string, object> ChangedSellFields(VehicleEntity vehicle, SellVehicleRequest body)
    {
        var changed = new Dictionary<string, object>();
        if (vehicle.Status != VehicleStatus.Sold) changed["status"] = "SOLD";
        if (vehicle.SoldOn != body.SoldOn) changed["soldOn"] = (object?)body.SoldOn?.ToString("yyyy-MM-dd") ?? "";
        if (MoneyChanged(vehicle.SoldPrice, body.SoldPrice)) changed["soldPrice"] = (object?)body.SoldPrice ?? "";
        return changed;
    }

    private static bool PurchaseFieldsChanged(Dictionary<string, object> changed) =>
        changed.ContainsKey("make") || changed.ContainsKey("model") ||
        changed.ContainsKey("modelYear") || changed.ContainsKey("vin") ||
        changed.ContainsKey("source") || changed.ContainsKey("purchaseCost") ||
        changed.ContainsKey("addedOn") || changed.ContainsKey("repairCost") ||
        changed.ContainsKey("carfaxUrl");

    private static bool MoneyChanged(decimal? current, decimal? next) =>
        current == null || next == null ? current != next : current.Value != next.Value;

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void RequireModelYearInRange(int modelYear)
    {
        if (modelYear > DateTime.UtcNow.Year + 1)
            throw new ApiException(ErrorCode.Validation, "Model year must not be later than next year.");
    }

    private static void RequireAddedOnNotInFuture(DateOnly addedOn)
    {
        if (addedOn > Today())
        {
            const string message = "Date added must not be later than today.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["addedOn"] = message });
        }
    }

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    private static string NormalizeVin(string vin) => vin.ToUpperInvariant();

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
