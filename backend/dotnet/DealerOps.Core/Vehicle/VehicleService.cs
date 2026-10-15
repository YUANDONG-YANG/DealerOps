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

        if (_db.Vehicles.Any(v => v.DealerId == tenant && v.Vin == vin))
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership.");

        var vehicle = new VehicleEntity
        {
            DealerId = tenant,
            Make = body.Make.Trim(),
            Model = body.Model.Trim(),
            ModelYear = body.ModelYear,
            Vin = vin,
            Source = body.Source,
            PurchaseCost = body.PurchaseCost,
            AddedOn = body.AddedOn,
            ConditionCode = body.ConditionCode,
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
            tenant, ActorUsername(), CreatedVehicleFields(body, vehicle.Make, vehicle.Model, vin));
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
        var make = body.Make.Trim();
        var model = body.Model.Trim();
        var vin = NormalizeVin(body.Vin);

        var changed = ChangedVehicleFields(vehicle, body, make, model, vin);

        if (vehicle.Status == VehicleStatus.Sold && PurchaseFieldsChanged(changed))
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (changed.ContainsKey("vin") && _db.Vehicles.Any(v => v.DealerId == tenant && v.Vin == vin))
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership.");

        vehicle.Make = make;
        vehicle.Model = model;
        vehicle.ModelYear = body.ModelYear;
        vehicle.Vin = vin;
        vehicle.Source = body.Source;
        vehicle.PurchaseCost = body.PurchaseCost;
        vehicle.AddedOn = body.AddedOn;
        vehicle.ConditionCode = body.ConditionCode;
        vehicle.RepairCost = body.RepairCost;
        vehicle.CarfaxUrl = body.CarfaxUrl;
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

        if (body.SoldOn == null || body.SoldPrice == null || body.SoldPrice.Value <= 0)
            throw new ApiException(ErrorCode.SoldPairRequired, "Sold date and sold price are both required.");

        var vehicle = LoadThisDealer(id);

        if (body.Version != vehicle.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (CountOpenWorkOrders(vehicle) > 0)
            throw new ApiException(ErrorCode.WorkOrdersOpen, "Finish or cancel open work orders before selling.");

        if (body.SoldOn.Value < vehicle.AddedOn)
            throw new ApiException(ErrorCode.Validation, "Sold date must not be before the date added.");

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

    private static Dictionary<string, object> CreatedVehicleFields(CreateVehicleRequest body, string make, string model, string vin)
    {
        var fields = new Dictionary<string, object>
        {
            ["make"] = make, ["model"] = model, ["modelYear"] = body.ModelYear, ["vin"] = vin,
            ["source"] = body.Source.ToString(), ["purchaseCost"] = body.PurchaseCost,
            ["addedOn"] = body.AddedOn.ToString("yyyy-MM-dd"),
            ["conditionCode"] = body.ConditionCode.ToString(), ["status"] = "IN_STOCK"
        };
        if (body.RepairCost != null) fields["repairCost"] = body.RepairCost;
        if (body.CarfaxUrl != null) fields["carfaxUrl"] = body.CarfaxUrl;
        return fields;
    }

    private static Dictionary<string, object> ChangedVehicleFields(
        VehicleEntity vehicle, PatchVehicleRequest body, string make, string model, string vin)
    {
        var changed = new Dictionary<string, object>();
        if (vehicle.Make != make) changed["make"] = make;
        if (vehicle.Model != model) changed["model"] = model;
        if (vehicle.ModelYear != body.ModelYear) changed["modelYear"] = body.ModelYear;
        if (vehicle.Vin != vin) changed["vin"] = vin;
        if (vehicle.Source != body.Source) changed["source"] = body.Source.ToString();
        if (vehicle.PurchaseCost != body.PurchaseCost) changed["purchaseCost"] = body.PurchaseCost;
        if (vehicle.AddedOn != body.AddedOn) changed["addedOn"] = body.AddedOn.ToString("yyyy-MM-dd");
        if (vehicle.ConditionCode != body.ConditionCode) changed["conditionCode"] = body.ConditionCode.ToString();
        if (MoneyChanged(vehicle.RepairCost, body.RepairCost)) changed["repairCost"] = (object?)body.RepairCost ?? "";
        if (vehicle.CarfaxUrl != body.CarfaxUrl) changed["carfaxUrl"] = (object?)body.CarfaxUrl ?? "";
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

    private static string NormalizeVin(string vin) => vin.ToUpperInvariant();

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
