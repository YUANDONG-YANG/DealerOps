using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance;
using DealerOps.Core.Data;
using DealerOps.Core.Lead;
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
    private readonly DealerOps.Core.Notifications.NotificationService _notifications;
    private readonly DealerOps.Core.Catalog.VehicleCatalogService _catalog;

    public VehicleService(AppDbContext db, IAuditService audit, ILogger<VehicleService> logger,
        DealerOps.Core.Notifications.NotificationService notifications,
        DealerOps.Core.Catalog.VehicleCatalogService catalog)
    {
        _db = db;
        _audit = audit;
        _logger = logger;
        _notifications = notifications;
        _catalog = catalog;
    }

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

    /// <summary>
    /// Fields the DMS list sorts by (C7): VehicleResponse wire names. <c>soldToName</c> orders by the
    /// linked customer's name or, without one, the typed buyer name.
    /// </summary>
    private static readonly string[] SortFields =
    [
        "stockNumber", "bodyType", "source", "conditionCode", "purchaseCost", "listPrice", "addedOn",
        "openWorkOrders", "leadCount", "status", "soldOn", "soldBy", "soldToName",
    ];

    // The requested order, then newest first so equal keys keep a stable page order.
    private IOrderedQueryable<VehicleEntity> Sorted(IQueryable<VehicleEntity> query, string? sort)
    {
        var parsed = Paging.ParseSort(sort, SortFields);
        if (parsed == null)
            return query.OrderByDescending(v => v.CreatedAt).ThenByDescending(v => v.Id);
        var (field, desc) = parsed.Value;
        var ordered = field switch
        {
            "stockNumber" => query.OrderByDirectionBlanksLast(v => v.StockNumber, desc),
            "bodyType" => query.OrderByDirection(v => v.BodyType, desc),
            "source" => query.OrderByDirection(v => v.Source, desc),
            "conditionCode" => query.OrderByDirection(v => v.ConditionCode, desc),
            "purchaseCost" => query.OrderByDirection(v => v.PurchaseCost, desc),
            "listPrice" => query.OrderByDirectionBlanksLast(v => v.ListPrice, desc),
            "addedOn" => query.OrderByDirection(v => v.AddedOn, desc),
            "openWorkOrders" => query.OrderByDirection(v => _db.WorkOrders.Count(wo =>
                wo.VehicleId == v.Id && wo.DealerId == v.DealerId &&
                (wo.Status == WorkOrderStatus.Open || wo.Status == WorkOrderStatus.InProgress)), desc),
            "leadCount" => query.OrderByDirection(v => _db.Leads.Count(l => l.VehicleId == v.Id), desc),
            "status" => query.OrderByDirection(v => v.Status, desc),
            "soldOn" => query.OrderByDirectionBlanksLast(v => v.SoldOn, desc),
            "soldBy" => query.OrderByDirectionBlanksLast(v => v.SoldBy, desc),
            // The linked customer's name, else the typed buyer name, as the DMS column shows it.
            _ => query.OrderByDirectionBlanksLast(v => (from cv in _db.CustomerVehicles
                join c in _db.Customers on cv.CustomerId equals c.Id
                where cv.VehicleId == v.Id
                select c.Name).FirstOrDefault() ?? v.SoldToName, desc),
        };
        return ordered.ThenByDescending(v => v.CreatedAt).ThenByDescending(v => v.Id);
    }

    /// <summary>Lists this dealer's vehicles matching the filter, newest first unless the filter names a sort.</summary>
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
        // D-4: vehicles with at least one OPEN or IN_PROGRESS work order, as counted in openWorkOrders.
        if (filter.OpenWorkOrdersOnly)
            query = query.Where(v => _db.WorkOrders.Any(wo => wo.VehicleId == v.Id && wo.DealerId == v.DealerId &&
                (wo.Status == WorkOrderStatus.Open || wo.Status == WorkOrderStatus.InProgress)));
        query = ApplyAdFilters(query, filter);

        var total = query.LongCount();
        var items = Sorted(query, filter.Sort)
            .Skip(p * s).Take(s)
            // Materialised before projecting: the projection below queries the database
            // per row, which cannot share the connection with a still-open result set.
            .ToList()
            .Select(ToResponse)
            .ToList();

        return new PageResponse<VehicleResponse>(items, p, s, total);
    }

    /// <summary>Adds a vehicle to this dealer's inventory as IN_STOCK; the VIN must be unique in the dealership.</summary>
    public async Task<VehicleResponse> Create(CreateVehicleRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        RequireModelYearInRange(body.ModelYear);
        MoneyRules.RequireCents("purchaseCost", body.PurchaseCost);
        MoneyRules.RequireCents("repairCost", body.RepairCost);
        MoneyRules.RequireCents("listPrice", body.ListPrice);
        var vin = NormalizeVin(body.Vin);
        await RequireVinMatchesVehicle(vin, body.Make.Trim(), body.Model.Trim(), body.ModelYear);
        RequireCarfaxLink(body.CarfaxUrl);
        var stockNumber = TrimToNull(body.StockNumber);
        RequireUniqueStockNumber(tenant, stockNumber, null);
        var addedOn = body.AddedOn!.Value;
        RequireAddedOnNotInFuture(addedOn);

        // Deleted vehicles keep their VIN under the unique key, so the check includes them.
        if (_db.Vehicles.IgnoreQueryFilters().Any(v => v.DealerId == tenant && v.Vin == vin))
        {
            _logger.LogWarning(
                "Vehicle create rejected because the VIN is already in the dealership dealerId={DealerId} by {Actor}",
                tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership, possibly on a deleted vehicle.");
        }

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

    /// <summary>
    /// Sales totals, profit and stock value for this dealer, with the last 12 months that had sales.
    /// With a period it also returns that period's totals; the per-salesperson table covers the
    /// period, or all time without one.
    /// </summary>
    public SalesReport SalesReport(SalesPeriod? period = null)
    {
        var tenant = TenantGuard.RequireTenantId();
        var vehicles = _db.Vehicles.AsNoTracking()
            .Where(v => v.DealerId == tenant)
            .Select(v => new { v.Status, v.PurchaseCost, v.RepairCost, v.AddedOn, v.SoldOn, v.SoldPrice, v.SoldBy })
            .ToList();
        var sold = vehicles
            .Where(v => v.Status == VehicleStatus.Sold && v.SoldOn != null && v.SoldPrice != null)
            .Select(v => (SoldOn: v.SoldOn!.Value, Price: v.SoldPrice!.Value,
                Profit: v.SoldPrice!.Value - v.PurchaseCost - (v.RepairCost ?? 0),
                Days: v.SoldOn!.Value.DayNumber - v.AddedOn.DayNumber, v.SoldBy))
            .ToList();

        var today = Today();
        var from = period switch
        {
            SalesPeriod.Today => today,
            SalesPeriod.Week => today.AddDays(-(((int)today.DayOfWeek + 6) % 7)),
            SalesPeriod.Month => new DateOnly(today.Year, today.Month, 1),
            SalesPeriod.Year => new DateOnly(today.Year, 1, 1),
            _ => DateOnly.MinValue,
        };
        var inPeriod = period == null ? sold : sold.Where(s => s.SoldOn >= from && s.SoldOn <= today).ToList();
        PeriodSales? periodSales = period is { } p
            ? new PeriodSales(p, from, today, inPeriod.Count, inPeriod.Sum(s => s.Price), inPeriod.Sum(s => s.Profit))
            : null;
        var salespeople = Salespeople(tenant,
            inPeriod.Select(s => (s.SoldBy, s.Price, s.Profit)).ToList(),
            period == null ? (DateTime?)null : from.ToDateTime(TimeOnly.MinValue));
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
            months,
            periodSales,
            salespeople);
    }

    /// <summary>
    /// One row per active member of the dealership, plus anyone else who sold a vehicle in the
    /// period (a former member). Won leads count leads last updated as WON since <paramref name="wonSince"/>
    /// (UTC), or all won leads without it.
    /// </summary>
    private List<SalespersonSales> Salespeople(long tenant,
        List<(string? SoldBy, decimal Price, decimal Profit)> sales, DateTime? wonSince)
    {
        var members = _db.Memberships.AsNoTracking()
            .Where(m => m.DealerId == tenant && m.Active)
            .Select(m => m.Username)
            .ToList();
        var usernames = members
            .Concat(sales.Where(s => s.SoldBy != null).Select(s => s.SoldBy!))
            .Distinct()
            .ToList();
        var names = _db.AppUsers.AsNoTracking()
            .Where(u => usernames.Contains(u.Username))
            .Select(u => new { u.Username, u.DisplayName })
            .ToDictionary(u => u.Username, u => u.DisplayName);
        var leads = _db.Leads.AsNoTracking()
            .Where(l => l.DealerId == tenant && l.OwnerUsername != null && usernames.Contains(l.OwnerUsername))
            .Select(l => new { l.OwnerUsername, l.Stage, l.UpdatedAt })
            .ToList();

        return usernames
            .Select(u =>
            {
                var own = sales.Where(s => s.SoldBy == u).ToList();
                var owned = leads.Where(l => l.OwnerUsername == u).ToList();
                return new SalespersonSales(u, names.GetValueOrDefault(u, u), members.Contains(u),
                    own.Count, own.Sum(s => s.Price), own.Sum(s => s.Profit),
                    owned.Count(l => !l.Stage.IsClosed()),
                    owned.Count(l => l.Stage == LeadStage.Won && (wonSince == null || l.UpdatedAt >= wonSince)));
            })
            .OrderByDescending(r => r.Revenue)
            .ThenBy(r => r.DisplayName)
            .ToList();
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
    public async Task<VehicleResponse> Patch(long id, PatchVehicleRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var vehicle = LoadThisDealer(id);

        if (body.Version != vehicle.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        RequireModelYearInRange(body.ModelYear);
        MoneyRules.RequireCents("purchaseCost", body.PurchaseCost);
        MoneyRules.RequireCents("repairCost", body.RepairCost);
        MoneyRules.RequireCents("listPrice", body.ListPrice);

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
        {
            _logger.LogWarning(
                "Vehicle update rejected because the vehicle is sold vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");
        }

        if (changed.ContainsKey("stockNumber"))
            RequireUniqueStockNumber(tenant, next.StockNumber, vehicle.Id);

        // Checked only when edited, so a stored vehicle saved before these rules can still be updated.
        if (changed.ContainsKey("vin") || changed.ContainsKey("modelYear")
            || changed.ContainsKey("make") || changed.ContainsKey("model"))
            await RequireVinMatchesVehicle(next.Vin, next.Make, next.Model, next.ModelYear);
        if (changed.ContainsKey("carfaxUrl"))
            RequireCarfaxLink(next.CarfaxUrl);

        if (changed.ContainsKey("vin") && _db.Vehicles.IgnoreQueryFilters().Any(v => v.DealerId == tenant && v.Vin == next.Vin))
        {
            _logger.LogWarning(
                "Vehicle update rejected because the VIN is already in the dealership vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.VinDup, "VIN already exists in this dealership, possibly on a deleted vehicle.");
        }

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
        MoneyRules.RequireCents("soldPrice", body.SoldPrice);

        var vehicle = LoadThisDealer(id);

        if (body.Version != vehicle.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        if (vehicle.Status == VehicleStatus.Sold)
        {
            _logger.LogWarning(
                "Vehicle sale rejected because the vehicle is already sold vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");
        }

        var openWorkOrders = CountOpenWorkOrders(vehicle);
        if (openWorkOrders > 0)
        {
            _logger.LogWarning(
                "Vehicle sale blocked by open work orders vehicleId={VehicleId} openWorkOrders={OpenWorkOrders} dealerId={DealerId} by {Actor}",
                vehicle.Id, openWorkOrders, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.WorkOrdersOpen, "Finish or cancel open work orders before selling.");
        }

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

        // The buyer is a CRM customer of this dealership, or "Other" with a typed name (D-10).
        var buyerName = TrimToNull(body.BuyerName);
        var buyer = body.BuyerCustomerId is { } buyerId
            ? _db.Customers.FirstOrDefault(c => c.Id == buyerId && c.DealerId == tenant)
              ?? throw new ApiException(ErrorCode.Validation, "Customer not found.",
                  new Dictionary<string, string> { ["buyerCustomerId"] = "Customer not found." })
            : null;
        if (buyer == null && buyerName == null)
        {
            const string message = "Choose a customer, or Other with the buyer's name.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { ["buyerName"] = message });
        }

        // A vehicle has one owner link (CRM-07): an existing link must be the chosen buyer.
        var existingLink = _db.CustomerVehicles.FirstOrDefault(cv => cv.VehicleId == vehicle.Id);
        if (existingLink != null && existingLink.CustomerId != buyer?.Id)
        {
            _logger.LogWarning(
                "Vehicle sale rejected because another customer is linked vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.VehicleAlreadyLinked,
                "This vehicle is linked to another customer. Choose that customer or unlink first.");
        }

        var actor = TenantContext.ActorUsername();
        var (changed, previous) = ChangedSellFields(vehicle, body);
        changed["soldBy"] = actor;
        previous["soldBy"] = vehicle.SoldBy ?? "";
        if (buyer != null)
            changed["buyerCustomerId"] = buyer.Id;
        else
            changed["soldToName"] = true; // free text is never copied into the audit

        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;

        vehicle.Status = VehicleStatus.Sold;
        vehicle.SoldOn = body.SoldOn;
        vehicle.SoldPrice = body.SoldPrice;
        vehicle.SoldBy = actor;
        vehicle.SoldToName = buyer == null ? buyerName : null;
        vehicle.UpdatedAt = DateTime.UtcNow;

        _audit.Record("VEHICLE", vehicle.Id, "SELL", tenant, actor, changed, previous);

        if (buyer != null && existingLink == null)
        {
            var link = new DealerOps.Core.Customer.CustomerVehicleEntity
            {
                DealerId = tenant,
                CustomerId = buyer.Id,
                VehicleId = vehicle.Id
            };
            _db.CustomerVehicles.Add(link);
            try
            {
                _db.SaveChanges();
            }
            catch (DbUpdateException ex) when (DuplicateKey.Is(ex))
            {
                // A concurrent request linked the vehicle after the check above (CRM-07).
                throw new ApiException(ErrorCode.VehicleAlreadyLinked, "Vehicle is already linked.");
            }
            _audit.Record("CUSTOMER_VEHICLE", link.Id, "LINK", tenant, actor,
                new Dictionary<string, object> { ["customerId"] = buyer.Id, ["vehicleId"] = vehicle.Id });
        }

        var closedLeads = CloseLeadsForSale(vehicle.Id, buyer?.Id, tenant, actor);
        _db.SaveChanges();
        tx?.Commit();

        foreach (var leadId in closedLeads)
            _notifications.ResolveByCorrelation(tenant, DealerOps.Core.Notifications.NotificationService.BuyerInquiry, "leadId",
                leadId.ToString(), "TAKEN", actor);

        _logger.LogInformation(
            "Vehicle sold vehicleId={VehicleId} stockNumber={StockNumber} buyerCustomerId={BuyerCustomerId} closedLeads={ClosedLeads} dealerId={DealerId} by {Actor}",
            vehicle.Id, vehicle.StockNumber, buyer?.Id, closedLeads.Count, tenant, actor);

        return ToResponse(vehicle);
    }

    /// <summary>
    /// Closes the open leads on a sold vehicle (L6): the buyer's leads become WON, every other open
    /// lead becomes LOST with the reason "Vehicle sold". Returns the closed lead ids.
    /// </summary>
    private List<long> CloseLeadsForSale(long vehicleId, long? buyerCustomerId, long tenant, string actor)
    {
        var open = _db.Leads
            .Where(l => l.VehicleId == vehicleId && l.DealerId == tenant &&
                        l.Stage != LeadStage.Won && l.Stage != LeadStage.Lost)
            .ToList();
        foreach (var lead in open)
        {
            var stage = lead.CustomerId == buyerCustomerId ? LeadStage.Won : LeadStage.Lost;
            var changed = new Dictionary<string, object> { ["stage"] = EnumWireName.Of(stage) };
            var previous = new Dictionary<string, object?> { ["stage"] = EnumWireName.Of(lead.Stage) };
            if (stage == LeadStage.Lost)
            {
                changed["lostReason"] = true;
                previous["lostReason"] = null;
            }
            lead.Stage = stage;
            lead.LostReason = stage == LeadStage.Lost ? "Vehicle sold" : null;
            lead.UpdatedAt = DateTime.UtcNow;
            _audit.Record("LEAD", lead.Id, "UPDATE", tenant, actor, changed, previous);
        }
        return open.Select(l => l.Id).ToList();
    }

    /// <summary>Adds a completed work order's cost to the vehicle's repair cost (WO-04).</summary>
    public void AddRepairCost(long vehicleId, decimal cost)
    {
        var tenant = TenantGuard.RequireTenantId();
        var vehicle = LoadThisDealer(vehicleId);

        if (vehicle.Status == VehicleStatus.Sold)
        {
            _logger.LogWarning(
                "Vehicle repair cost update rejected because the vehicle is sold vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle is locked.");
        }

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
        {
            _logger.LogWarning(
                "Vehicle delete rejected because the vehicle is sold vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle cannot be deleted.");
        }
        if (_db.CustomerVehicles.Any(cv => cv.VehicleId == vehicle.Id))
        {
            _logger.LogWarning(
                "Vehicle delete rejected because a customer is still linked vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                vehicle.Id, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.VehicleAlreadyLinked, "Unlink the customer before deleting this vehicle.");
        }
        var openWorkOrders = CountOpenWorkOrders(vehicle);
        if (openWorkOrders > 0)
        {
            _logger.LogWarning(
                "Vehicle delete blocked by open work orders vehicleId={VehicleId} openWorkOrders={OpenWorkOrders} dealerId={DealerId} by {Actor}",
                vehicle.Id, openWorkOrders, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.WorkOrdersOpen, "Finish or cancel open work orders before deleting.");
        }
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
            vehicle.SoldBy,
            vehicle.SoldToName,
            vehicle.Status,
            linked,
            CountOpenWorkOrders(vehicle),
            // Every lead on the vehicle, open or closed (D-11).
            _db.Leads.Count(l => l.VehicleId == vehicle.Id && l.DealerId == dealerId),
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
            _logger.LogWarning(
                "Vehicle save rejected because the VIN is already in the dealership dealerId={DealerId} by {Actor}",
                TenantGuard.RequireTenantId(), TenantContext.ActorUsername());
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

    // Model-year codes of the VIN's 10th character for 1980-2009; the cycle repeats every 30 years
    // (A = 1980 or 2010, Y = 2000 or 2030), so a code matches either year of its pair.
    private const string VinYearCodes = "ABCDEFGHJKLMNPRSTVWXY123456789";

    /// <summary>D-8: the VIN's model-year code must match the entered year. Years before 1980 predate the code.</summary>
    private static void RequireVinMatchesModelYear(string vin, int modelYear)
    {
        if (modelYear < 1980 || vin.Length != 17) return;
        var code = vin[9];
        var expected = VinYearCodes[(modelYear - 1980) % VinYearCodes.Length];
        if (code == expected) return;
        var index = VinYearCodes.IndexOf(code);
        var message = index < 0
            ? $"VIN character 10 '{code}' is not a model-year code. Check the VIN."
            : $"VIN does not match the model year: character 10 '{code}' means {1980 + index} or {2010 + index}, not {modelYear}.";
        throw new ApiException(ErrorCode.Validation, message,
            new Dictionary<string, string> { ["vin"] = message });
    }

    /// <summary>
    /// CR-047: the entered make, model and model year must agree with the VIN decode. A decoded
    /// field vPIC leaves blank is not checked. If the decode is unavailable (vPIC down, timed out,
    /// or no vehicle for this VIN) the save falls back to the D-8 model-year character check, so a
    /// vehicle is never unaddable because an external service is down.
    /// </summary>
    private async Task RequireVinMatchesVehicle(string vin, string make, string model, int modelYear)
    {
        DealerOps.Core.Catalog.VinDecodeResponse decoded;
        try
        {
            // The vPIC client's configured 5-second timeout bounds this call; any failure, including
            // that timeout and a VIN vPIC does not know, degrades to the year-code check below.
            decoded = await _catalog.DecodeVinAsync(vin, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("VIN decode check skipped error={Error}; falling back to the model-year code",
                ex.GetType().Name);
            RequireVinMatchesModelYear(vin, modelYear);
            return;
        }

        RequireDecodedFieldMatches("make", "Make", make, decoded.Make);
        RequireDecodedFieldMatches("model", "Model", model, decoded.Model);

        if (decoded.ModelYear is not { } decodedYear)
        {
            // vPIC gave no model year, so the VIN's own year code is still the only year check.
            RequireVinMatchesModelYear(vin, modelYear);
            return;
        }
        if (decodedYear == modelYear) return;
        var message =
            $"Model year does not match the VIN: the VIN decodes to {decodedYear}, not {modelYear}. "
            + "Correct the model year or the VIN.";
        throw new ApiException(ErrorCode.Validation, message,
            new Dictionary<string, string> { ["modelYear"] = message });
    }

    // Compares one entered text field with its decoded value, ignoring case, spacing and punctuation
    // so that "Mercedes Benz" is accepted for the decoder's "Mercedes-Benz".
    private static void RequireDecodedFieldMatches(string field, string label, string entered, string? decoded)
    {
        if (string.IsNullOrWhiteSpace(decoded)) return;
        if (TextKey(entered) == TextKey(decoded)) return;
        var message = $"{label} does not match the VIN: the VIN decodes to \"{decoded.Trim()}\", "
            + $"not \"{entered.Trim()}\". Correct the {label.ToLowerInvariant()} or the VIN.";
        throw new ApiException(ErrorCode.Validation, message,
            new Dictionary<string, string> { [field] = message });
    }

    // Letters and digits only, upper case: the forgiving form used to compare decoded text.
    private static string TextKey(string value)
    {
        var sb = new System.Text.StringBuilder(value.Length);
        foreach (var c in value)
            if (char.IsLetterOrDigit(c)) sb.Append(char.ToUpperInvariant(c));
        return sb.ToString();
    }

    /// <summary>D-9: a Carfax link must be https on carfax.com or carfax.ca (or one of their subdomains).</summary>
    private static void RequireCarfaxLink(string? carfaxUrl)
    {
        if (string.IsNullOrWhiteSpace(carfaxUrl)) return;
        if (Uri.TryCreate(carfaxUrl.Trim(), UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps
            && IsCarfaxHost(uri.Host))
            return;
        const string message = "Carfax URL must be an https link on carfax.com or carfax.ca.";
        throw new ApiException(ErrorCode.Validation, message,
            new Dictionary<string, string> { ["carfaxUrl"] = message });
    }

    private static bool IsCarfaxHost(string host)
    {
        host = host.ToLowerInvariant();
        return host is "carfax.com" or "carfax.ca" || host.EndsWith(".carfax.com") || host.EndsWith(".carfax.ca");
    }

    // Stock numbers are the dealership's own lot labels, so two active vehicles cannot share one.
    private void RequireUniqueStockNumber(long tenant, string? stockNumber, long? exceptVehicleId)
    {
        if (stockNumber == null) return;
        if (_db.Vehicles.Any(v => v.DealerId == tenant && v.StockNumber == stockNumber && v.Id != exceptVehicleId))
        {
            _logger.LogWarning(
                "Vehicle save rejected because the stock number is already used dealerId={DealerId} by {Actor}",
                tenant, TenantContext.ActorUsername());
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
