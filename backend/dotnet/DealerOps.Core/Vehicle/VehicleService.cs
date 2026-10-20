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
        if (filter.BodyType.HasValue)
            query = query.Where(v => v.BodyType == filter.BodyType.Value);
        if (make != null)
            query = query.Where(v => v.Make.ToLower() == make.ToLower());
        if (model != null)
            query = query.Where(v => v.Model.ToLower() == model.ToLower());
        if (filter.ModelYear.HasValue)
            query = query.Where(v => v.ModelYear == filter.ModelYear.Value);
        if (filter.UnlinkedOnly)
            query = query.Where(v => !_db.CustomerVehicles.Any(cv => cv.VehicleId == v.Id));

        var total = query.LongCount();
        var items = query
            .OrderByDescending(v => v.CreatedAt)
            .ThenByDescending(v => v.Id)
            .Skip(p * s).Take(s)
            // Materialised before projecting: the projection below queries the database
            // per row, which cannot share the connection with a still-open result set.
            .ToList()
            .Select(ToResponse)
            .ToList();

        return new PageResponse<VehicleResponse>(items, p, s, total);
    }

    public VehicleResponse Create(CreateVehicleRequest body)
    {
        var tenant = RequireTenant();
        RequireModelYearInRange(body.ModelYear);
        RequireCents("purchaseCost", body.PurchaseCost);
        RequireCents("repairCost", body.RepairCost);
        var vin = NormalizeVin(body.Vin);
        var addedOn = body.AddedOn!.Value;
        RequireAddedOnNotInFuture(addedOn);

        // Deleted vehicles keep their VIN under the unique key, so the check includes them.
        if (_db.Vehicles.IgnoreQueryFilters().Any(v => v.DealerId == tenant && v.Vin == vin))
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership, possibly on a deleted vehicle.");

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
            BodyType = body.BodyType ?? VehicleBodyType.Other,
            RepairCost = body.RepairCost,
            CarfaxUrl = body.CarfaxUrl,
            Status = VehicleStatus.InStock,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        using var tx = _db.Database.BeginTransaction();
        _db.Vehicles.Add(vehicle);
        SaveOrVinDuplicate();
        _audit.Record("VEHICLE", vehicle.Id, "CREATE",
            tenant, ActorUsername(), CreatedVehicleFields(vehicle));
        _db.SaveChanges();
        tx.Commit();

        return ToResponse(vehicle);
    }

    public SalesReport SalesReport()
    {
        var tenant = RequireTenant();
        var vehicles = _db.Vehicles.AsNoTracking()
            .Where(v => v.DealerId == tenant)
            .Select(v => new { v.Status, v.PurchaseCost, v.RepairCost, v.AddedOn, v.SoldOn, v.SoldPrice })
            .ToList();
        var sold = vehicles
            .Where(v => v.Status == VehicleStatus.Sold && v.SoldOn != null && v.SoldPrice != null)
            .Select(v => (SoldOn: v.SoldOn!.Value, Price: v.SoldPrice!.Value,
                Profit: v.SoldPrice!.Value - v.PurchaseCost - (v.RepairCost ?? 0),
                Days: v.SoldOn!.Value.DayNumber - v.AddedOn.DayNumber))
            .ToList();
        var inStock = vehicles.Where(v => v.Status == VehicleStatus.InStock).ToList();

        var months = sold
            .GroupBy(s => $"{s.SoldOn.Year:D4}-{s.SoldOn.Month:D2}")
            .OrderByDescending(g => g.Key)
            .Take(12)
            .Select(g => new MonthlySales(g.Key, g.Count(), g.Sum(s => s.Price), g.Sum(s => s.Profit)))
            .ToList();

        return new SalesReport(
            sold.Count,
            sold.Sum(s => s.Price),
            sold.Sum(s => s.Profit),
            sold.Count == 0 ? null : Math.Round((decimal)sold.Average(s => s.Days), 1),
            inStock.Count,
            inStock.Sum(v => v.PurchaseCost + (v.RepairCost ?? 0)),
            months);
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
        RequireCents("purchaseCost", body.PurchaseCost);
        RequireCents("repairCost", body.RepairCost);

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
            body.BodyType ?? vehicle.BodyType,
            body.RepairCost,
            body.CarfaxUrl);

        if (body.AddedOn != null)
            RequireAddedOnNotInFuture(body.AddedOn.Value);

        var changed = ChangedVehicleFields(vehicle, next);

        if (vehicle.Status == VehicleStatus.Sold && PurchaseFieldsChanged(changed))
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (changed.ContainsKey("vin") && _db.Vehicles.IgnoreQueryFilters().Any(v => v.DealerId == tenant && v.Vin == next.Vin))
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership, possibly on a deleted vehicle.");

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
        vehicle.BodyType = next.BodyType;
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
        SaveOrVinDuplicate();

        return ToResponse(vehicle);
    }

    public VehicleResponse Sell(long id, SellVehicleRequest body)
    {
        var tenant = RequireTenant();

        if (body.SoldOn == null || body.SoldPrice == null || body.SoldPrice <= 0)
            throw new ApiException(ErrorCode.SoldPairRequired,
                "Sold date and a sold price greater than 0 are both required.");
        RequireCents("soldPrice", body.SoldPrice);

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

        // The cost is added to the repair cost (WO-04). A zero cost still sets an empty repair
        // cost to 0; when nothing changes, no audit row is written.
        var repairCost = (vehicle.RepairCost ?? 0) + cost;
        if (vehicle.RepairCost == repairCost) return;
        vehicle.RepairCost = repairCost;

        _audit.Record("VEHICLE", vehicle.Id, "UPDATE",
            tenant, ActorUsername(),
            new Dictionary<string, object> { ["repairCost"] = vehicle.RepairCost! });
        _db.SaveChanges();
    }

    public void Delete(long id)
    {
        var tenant = RequireTenant();
        var vehicle = LoadThisDealer(id);
        // A sale or customer link is the purchase record (CRM "car(s) purchased"), and open work
        // orders are live work; deleting the vehicle would hide them, so each must be settled first.
        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle cannot be deleted.");
        if (_db.CustomerVehicles.Any(cv => cv.VehicleId == vehicle.Id))
            throw new ApiException(ErrorCode.VehicleAlreadyLinked, "Unlink the customer before deleting this vehicle.");
        if (CountOpenWorkOrders(vehicle) > 0)
            throw new ApiException(ErrorCode.WorkOrdersOpen, "Finish or cancel open work orders before deleting.");
        vehicle.DeletedAt = DateTime.UtcNow;
        _audit.Record("VEHICLE", vehicle.Id, "DELETE", tenant, ActorUsername(),
            new Dictionary<string, object> { ["deleted"] = true });
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
            vehicle.BodyType,
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
        VehicleBodyType BodyType,
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
            ["conditionCode"] = vehicle.ConditionCode.ToString(),
            ["bodyType"] = vehicle.BodyType.ToString(),
            ["status"] = "IN_STOCK"
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
        if (vehicle.BodyType != next.BodyType) changed["bodyType"] = next.BodyType.ToString();
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
        changed.ContainsKey("addedOn") || changed.ContainsKey("bodyType") ||
        changed.ContainsKey("repairCost") || changed.ContainsKey("carfaxUrl");

    private static bool MoneyChanged(decimal? current, decimal? next) =>
        current == null || next == null ? current != next : current.Value != next.Value;

    // A concurrent insert can pass the read above and still hit uk_vehicle_vin (DMS-03).
    private void SaveOrVinDuplicate()
    {
        try
        {
            _db.SaveChanges();
        }
        catch (DbUpdateException ex) when (DuplicateKey.Is(ex))
        {
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership.");
        }
    }

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void RequireModelYearInRange(int modelYear)
    {
        if (modelYear > DateTime.UtcNow.Year + 1)
        {
            const string message = "Model year must not be later than next year.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["modelYear"] = message });
        }
    }

    // Money is stored with two decimals, so a third decimal is refused rather than rounded away.
    private static void RequireCents(string field, decimal? amount)
    {
        if (amount is decimal value && decimal.Round(value, 2) != value)
        {
            const string message = "Use at most 2 decimals.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { [field] = message });
        }
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
