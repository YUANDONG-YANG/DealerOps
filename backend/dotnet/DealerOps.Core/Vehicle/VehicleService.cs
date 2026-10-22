using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance;
using DealerOps.Core.Data;
using DealerOps.Core.Listing;
using DealerOps.Core.Vehicle.Dto;
using DealerOps.Core.WorkOrder;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Vehicle;

/// <summary>
/// Dealership inventory: vehicle records scoped to the current dealer. Every create, update, sale,
/// repair-cost change and delete writes a VEHICLE audit row in the same unit of work (AUD-07).
/// </summary>
public class VehicleService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly ILogger<VehicleService> _logger;

    public VehicleService(AppDbContext db, IAuditService audit, ILogger<VehicleService> logger)
    {
        _db = db;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>Lists this dealer's vehicles matching the filter, newest first.</summary>
    /// <summary>
    /// The Ad compliance filters: ad kind, medium, derived check status (the <see cref="Compliance.CheckStatusMapper"/>
    /// rules in SQL) and buyer-site listing. A vehicle without a saved ad counts as its virtual
    /// draft: Cash, Online, Needs AI review, not listed (14 §7.1).
    /// </summary>
    private IQueryable<VehicleEntity> ApplyAdFilters(IQueryable<VehicleEntity> query, VehicleFilter filter)
    {
        if (filter.AdKind is { } kind)
            query = kind == AdKind.Cash
                ? query.Where(v => !_db.Listings.Any(l => l.VehicleId == v.Id)
                                   || _db.Listings.Any(l => l.VehicleId == v.Id && l.AdKind == kind))
                : query.Where(v => _db.Listings.Any(l => l.VehicleId == v.Id && l.AdKind == kind));
        if (filter.Medium is { } medium)
            query = medium == AdMedium.Online
                ? query.Where(v => !_db.Listings.Any(l => l.VehicleId == v.Id)
                                   || _db.Listings.Any(l => l.VehicleId == v.Id && l.Medium == medium))
                : query.Where(v => _db.Listings.Any(l => l.VehicleId == v.Id && l.Medium == medium));

        var checks =
            from l in _db.Listings
            join c in _db.ComplianceChecks on l.LastCheckId equals c.Id
            select new { l.VehicleId, l.Status, Current = c.ContentVersion == l.ContentVersion, c.Recommendation };

        var checkStatus = TrimToNull(filter.CheckStatus)?.ToUpperInvariant();
        if (checkStatus != null)
        {
            var passed = Recommendation.Passed;
            query = checkStatus switch
            {
                CheckStatusMapper.Passed => query.Where(v => checks.Any(x => x.VehicleId == v.Id && x.Current && x.Recommendation == passed)),
                CheckStatusMapper.Stale => query.Where(v => checks.Any(x => x.VehicleId == v.Id && !x.Current && x.Recommendation == passed)),
                CheckStatusMapper.Blocked => query.Where(v => checks.Any(x => x.VehicleId == v.Id && x.Current && x.Recommendation == Recommendation.Blocked)),
                CheckStatusMapper.AiUnavailable => query.Where(v => checks.Any(x => x.VehicleId == v.Id && x.Current && x.Recommendation == Recommendation.Unavailable)),
                // Everything the four statuses above do not cover, including vehicles with no ad or no check.
                CheckStatusMapper.NeedsAi => query.Where(v => !checks.Any(x => x.VehicleId == v.Id
                    && (x.Current ? x.Recommendation != Recommendation.NeedsAi : x.Recommendation == passed))),
                _ => throw new ApiException(ErrorCode.Validation, "Unknown check status",
                    new Dictionary<string, string> { ["checkStatus"] = "Unknown check status" }),
            };
        }

        if (filter.BuyerSite is { } site)
        {
            var listed = query.Where(v => v.Status == VehicleStatus.InStock && checks.Any(x => x.VehicleId == v.Id
                && x.Status == ListingStatus.Ready && x.Current && x.Recommendation == Recommendation.Passed));
            var takenDown = query.Where(v => v.Status == VehicleStatus.Sold
                && _db.Listings.Any(l => l.VehicleId == v.Id && l.Status == ListingStatus.Ready));
            query = site switch
            {
                BuyerSiteFilter.Listed => listed,
                BuyerSiteFilter.TakenDown => takenDown,
                _ => query.Where(v => !listed.Any(l => l.Id == v.Id) && !takenDown.Any(t => t.Id == v.Id)),
            };
        }
        return query;
    }

    public PageResponse<VehicleResponse> List(VehicleFilter filter, int page, int size)
    {
        var tenant = TenantGuard.RequireTenantId();
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
                EF.Functions.Like(v.Model, $"%{q}%") ||
                (v.StockNumber != null && EF.Functions.Like(v.StockNumber, $"%{q}%")));

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
        query = ApplyAdFilters(query, filter);

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

    /// <summary>Adds a vehicle to this dealer's inventory as IN_STOCK; the VIN must be unique in the dealership.</summary>
    public VehicleResponse Create(CreateVehicleRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        RequireModelYearInRange(body.ModelYear);
        RequireCents("purchaseCost", body.PurchaseCost);
        RequireCents("repairCost", body.RepairCost);
        RequireCents("listPrice", body.ListPrice);
        var vin = NormalizeVin(body.Vin);
        var stockNumber = TrimToNull(body.StockNumber);
        RequireUniqueStockNumber(tenant, stockNumber, null);
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
            MileageKm = body.MileageKm,
            ExteriorColor = TrimToNull(body.ExteriorColor),
            FuelType = body.FuelType,
            StockNumber = stockNumber,
            ListPrice = body.ListPrice,
            Status = VehicleStatus.InStock,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        using var tx = _db.Database.BeginTransaction();
        _db.Vehicles.Add(vehicle);
        SaveOrVinDuplicate();
        _audit.Record("VEHICLE", vehicle.Id, "CREATE",
            tenant, TenantContext.ActorUsername(), CreatedVehicleFields(vehicle));
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Vehicle created vehicleId={VehicleId} stockNumber={StockNumber} dealerId={DealerId} by {Actor}",
            vehicle.Id, vehicle.StockNumber, tenant, TenantContext.ActorUsername());

        return ToResponse(vehicle);
    }

    /// <summary>Sales totals, profit and stock value for this dealer, with the last 12 months that had sales.</summary>
    public SalesReport SalesReport()
    {
        var tenant = TenantGuard.RequireTenantId();
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

    /// <summary>Returns one vehicle of this dealer, or NOT_FOUND.</summary>
    public VehicleResponse Get(long id)
    {
        return ToResponse(LoadThisDealer(id));
    }

    /// <summary>
    /// Updates a vehicle under optimistic locking. A sold vehicle only accepts condition changes,
    /// and a condition change sends the vehicle's listing back to DRAFT for a new compliance check.
    /// </summary>
    public VehicleResponse Patch(long id, PatchVehicleRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var vehicle = LoadThisDealer(id);

        if (body.Version != vehicle.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        RequireModelYearInRange(body.ModelYear);
        RequireCents("purchaseCost", body.PurchaseCost);
        RequireCents("repairCost", body.RepairCost);
        RequireCents("listPrice", body.ListPrice);

        // A null value-type field means "not supplied": keep what is stored. The optional
        // fields (repair cost, Carfax link, listing details) are replaced, so null clears them.
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
            body.CarfaxUrl,
            body.MileageKm,
            TrimToNull(body.ExteriorColor),
            body.FuelType,
            TrimToNull(body.StockNumber),
            body.ListPrice);

        if (body.AddedOn != null)
            RequireAddedOnNotInFuture(body.AddedOn.Value);

        var (changed, previous) = ChangedVehicleFields(vehicle, next);

        if (vehicle.Status == VehicleStatus.Sold && PurchaseFieldsChanged(changed))
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        if (changed.ContainsKey("stockNumber"))
            RequireUniqueStockNumber(tenant, next.StockNumber, vehicle.Id);

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
        vehicle.MileageKm = next.MileageKm;
        vehicle.ExteriorColor = next.ExteriorColor;
        vehicle.FuelType = next.FuelType;
        vehicle.StockNumber = next.StockNumber;
        vehicle.ListPrice = next.ListPrice;
        vehicle.UpdatedAt = DateTime.UtcNow;

        if (changed.ContainsKey("conditionCode"))
        {
            long t = tenant;
            var listing = _db.Listings.FirstOrDefault(l => l.VehicleId == vehicle.Id && l.DealerId == t);
            if (listing != null)
            {
                var listingChanges = new Dictionary<string, object>
                {
                    ["vehicleId"] = vehicle.Id, ["contentVersion"] = listing.ContentVersion + 1
                };
                var listingPrevious = new Dictionary<string, object?> { ["contentVersion"] = listing.ContentVersion };
                // Status is recorded only when it really changes, as ListingService does.
                if (listing.Status != ListingStatus.Draft)
                {
                    listingChanges["status"] = EnumWireName.Of(ListingStatus.Draft);
                    listingPrevious["status"] = EnumWireName.Of(listing.Status);
                }
                listing.ContentVersion++;
                listing.Status = ListingStatus.Draft;
                _audit.Record("LISTING", listing.Id, "UPDATE", tenant, TenantContext.ActorUsername(),
                    listingChanges, listingPrevious);
            }
        }

        _audit.Record("VEHICLE", vehicle.Id, "UPDATE",
            tenant, TenantContext.ActorUsername(), changed, previous);
        SaveOrVinDuplicate();
        _logger.LogInformation("Vehicle updated vehicleId={VehicleId} fields={Fields} dealerId={DealerId} by {Actor}",
            vehicle.Id, string.Join(",", changed.Keys), tenant, TenantContext.ActorUsername());

        return ToResponse(vehicle);
    }

    /// <summary>Marks an in-stock vehicle SOLD with its sold date and price; open work orders must be settled first.</summary>
    public VehicleResponse Sell(long id, SellVehicleRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();

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

        var (changed, previous) = ChangedSellFields(vehicle, body);

        vehicle.Status = VehicleStatus.Sold;
        vehicle.SoldOn = body.SoldOn;
        vehicle.SoldPrice = body.SoldPrice;
        vehicle.UpdatedAt = DateTime.UtcNow;

        _audit.Record("VEHICLE", vehicle.Id, "SELL",
            tenant, TenantContext.ActorUsername(), changed, previous);
        _db.SaveChanges();
        _logger.LogInformation("Vehicle sold vehicleId={VehicleId} stockNumber={StockNumber} dealerId={DealerId} by {Actor}",
            vehicle.Id, vehicle.StockNumber, tenant, TenantContext.ActorUsername());

        return ToResponse(vehicle);
    }

    /// <summary>Adds a completed work order's cost to the vehicle's repair cost (WO-04).</summary>
    public void AddRepairCost(long vehicleId, decimal cost)
    {
        var tenant = TenantGuard.RequireTenantId();
        var vehicle = LoadThisDealer(vehicleId);

        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");

        // The cost is added to the repair cost (WO-04). A zero cost still sets an empty repair
        // cost to 0; when nothing changes, no audit row is written.
        var repairCost = (vehicle.RepairCost ?? 0) + cost;
        if (vehicle.RepairCost == repairCost) return;
        var previous = new Dictionary<string, object?> { ["repairCost"] = (object?)vehicle.RepairCost ?? "" };
        vehicle.RepairCost = repairCost;

        _audit.Record("VEHICLE", vehicle.Id, "UPDATE",
            tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["repairCost"] = repairCost }, previous);
        _db.SaveChanges();
        _logger.LogInformation("Vehicle repair cost updated vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
            vehicle.Id, tenant, TenantContext.ActorUsername());
    }

    /// <summary>
    /// Soft-deletes an unsold, unlinked vehicle with no open work orders; its VIN stays reserved.
    /// </summary>
    public void Delete(long id)
    {
        var tenant = TenantGuard.RequireTenantId();
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
        _audit.Record("VEHICLE", vehicle.Id, "DELETE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["deleted"] = true },
            new Dictionary<string, object?> { ["deleted"] = false });
        _db.SaveChanges();
        _logger.LogInformation("Vehicle deleted vehicleId={VehicleId} stockNumber={StockNumber} dealerId={DealerId} by {Actor}",
            vehicle.Id, vehicle.StockNumber, tenant, TenantContext.ActorUsername());
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
        long tenant = TenantGuard.RequireTenantId();
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
            vehicle.MileageKm,
            vehicle.ExteriorColor,
            vehicle.FuelType,
            vehicle.StockNumber,
            vehicle.ListPrice,
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
        string? CarfaxUrl,
        int? MileageKm,
        string? ExteriorColor,
        FuelType? FuelType,
        string? StockNumber,
        decimal? ListPrice);

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
        if (vehicle.MileageKm != null) fields["mileageKm"] = vehicle.MileageKm;
        if (vehicle.ExteriorColor != null) fields["exteriorColor"] = vehicle.ExteriorColor;
        if (vehicle.FuelType != null) fields["fuelType"] = EnumWireName.Of(vehicle.FuelType.Value);
        if (vehicle.StockNumber != null) fields["stockNumber"] = vehicle.StockNumber;
        if (vehicle.ListPrice != null) fields["listPrice"] = vehicle.ListPrice;
        return fields;
    }

    // Builds the audit pair for a patch: the new value (fieldSummary) and the old value (previous)
    // of each changed field, in the same format; a cleared value is recorded as "".
    private static (Dictionary<string, object> Changed, Dictionary<string, object?> Previous) ChangedVehicleFields(
        VehicleEntity vehicle, PatchedVehicleValues next)
    {
        var changed = new Dictionary<string, object>();
        var previous = new Dictionary<string, object?>();
        void Add(string field, object? before, object? after)
        {
            changed[field] = after ?? "";
            previous[field] = before ?? "";
        }

        if (vehicle.Make != next.Make) Add("make", vehicle.Make, next.Make);
        if (vehicle.Model != next.Model) Add("model", vehicle.Model, next.Model);
        if (vehicle.ModelYear != next.ModelYear) Add("modelYear", vehicle.ModelYear, next.ModelYear);
        if (vehicle.Vin != next.Vin) Add("vin", vehicle.Vin, next.Vin);
        if (vehicle.Source != next.Source) Add("source", vehicle.Source.ToString(), next.Source.ToString());
        if (vehicle.PurchaseCost != next.PurchaseCost) Add("purchaseCost", vehicle.PurchaseCost, next.PurchaseCost);
        if (vehicle.AddedOn != next.AddedOn)
            Add("addedOn", vehicle.AddedOn.ToString("yyyy-MM-dd"), next.AddedOn.ToString("yyyy-MM-dd"));
        if (vehicle.ConditionCode != next.ConditionCode)
            Add("conditionCode", vehicle.ConditionCode.ToString(), next.ConditionCode.ToString());
        if (vehicle.BodyType != next.BodyType) Add("bodyType", vehicle.BodyType.ToString(), next.BodyType.ToString());
        if (MoneyChanged(vehicle.RepairCost, next.RepairCost)) Add("repairCost", vehicle.RepairCost, next.RepairCost);
        if (vehicle.CarfaxUrl != next.CarfaxUrl) Add("carfaxUrl", vehicle.CarfaxUrl, next.CarfaxUrl);
        if (vehicle.MileageKm != next.MileageKm) Add("mileageKm", vehicle.MileageKm, next.MileageKm);
        if (vehicle.ExteriorColor != next.ExteriorColor) Add("exteriorColor", vehicle.ExteriorColor, next.ExteriorColor);
        if (vehicle.FuelType != next.FuelType) Add("fuelType", FuelWireName(vehicle.FuelType), FuelWireName(next.FuelType));
        if (vehicle.StockNumber != next.StockNumber) Add("stockNumber", vehicle.StockNumber, next.StockNumber);
        if (MoneyChanged(vehicle.ListPrice, next.ListPrice)) Add("listPrice", vehicle.ListPrice, next.ListPrice);
        return (changed, previous);
    }

    private static string? FuelWireName(FuelType? fuelType) =>
        fuelType == null ? null : EnumWireName.Of(fuelType.Value);

    private static (Dictionary<string, object> Changed, Dictionary<string, object?> Previous) ChangedSellFields(
        VehicleEntity vehicle, SellVehicleRequest body)
    {
        var changed = new Dictionary<string, object>();
        var previous = new Dictionary<string, object?>();
        if (vehicle.Status != VehicleStatus.Sold)
        {
            changed["status"] = "SOLD";
            previous["status"] = EnumWireName.Of(vehicle.Status);
        }
        if (vehicle.SoldOn != body.SoldOn)
        {
            changed["soldOn"] = (object?)body.SoldOn?.ToString("yyyy-MM-dd") ?? "";
            previous["soldOn"] = (object?)vehicle.SoldOn?.ToString("yyyy-MM-dd") ?? "";
        }
        if (MoneyChanged(vehicle.SoldPrice, body.SoldPrice))
        {
            changed["soldPrice"] = (object?)body.SoldPrice ?? "";
            previous["soldPrice"] = (object?)vehicle.SoldPrice ?? "";
        }
        return (changed, previous);
    }

    private static bool PurchaseFieldsChanged(Dictionary<string, object> changed) =>
        changed.ContainsKey("make") || changed.ContainsKey("model") ||
        changed.ContainsKey("modelYear") || changed.ContainsKey("vin") ||
        changed.ContainsKey("source") || changed.ContainsKey("purchaseCost") ||
        changed.ContainsKey("addedOn") || changed.ContainsKey("bodyType") ||
        changed.ContainsKey("repairCost") || changed.ContainsKey("carfaxUrl") ||
        changed.ContainsKey("mileageKm") || changed.ContainsKey("exteriorColor") ||
        changed.ContainsKey("fuelType") || changed.ContainsKey("stockNumber") ||
        changed.ContainsKey("listPrice");

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

    // Stock numbers are the dealership's own lot labels, so two active vehicles cannot share one.
    private void RequireUniqueStockNumber(long tenant, string? stockNumber, long? exceptVehicleId)
    {
        if (stockNumber == null) return;
        if (_db.Vehicles.Any(v => v.DealerId == tenant && v.StockNumber == stockNumber && v.Id != exceptVehicleId))
        {
            const string message = "Stock number is already used by another vehicle.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["stockNumber"] = message });
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

}
