using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Customer.Dto;
using DealerOps.Core.Data;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Customer;

public class CustomerService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public CustomerService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public PageResponse<CustomerListItem> List(string? q, bool? linked, int page, int size)
    {
        var tenant = RequireTenant();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);

        IQueryable<CustomerEntity> query = _db.Customers.Where(c => c.DealerId == tenant);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            // Email is stored lower-case, so match it against the lower-cased term (CRM-03).
            var emailTerm = term.ToLowerInvariant();
            query = query.Where(c =>
                c.Name.Contains(term) ||
                c.Email.Contains(emailTerm) ||
                c.Phone.Contains(term));
        }

        if (linked.HasValue)
        {
            var linkedCustomerIds = _db.CustomerVehicles
                .Where(cv => cv.DealerId == tenant)
                .Select(cv => cv.CustomerId)
                .Distinct();

            query = linked.Value
                ? query.Where(c => linkedCustomerIds.Contains(c.Id))
                : query.Where(c => !linkedCustomerIds.Contains(c.Id));
        }

        var total = query.Count();
        var items = query.OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id)
            .Skip(p * s).Take(s)
            // Materialised before projecting: the projection below queries the database
            // per row, which cannot share the connection with a still-open result set.
            .ToList()
            .Select(ToListItem).ToList();

        return new PageResponse<CustomerListItem>(items, p, s, total);
    }

    public CustomerDetail Create(CreateCustomerRequest body)
    {
        var tenant = RequireTenant();
        var name = body.Name.Trim();
        var email = NormalizeEmail(body.Email);
        var phone = body.Phone.Trim();
        var homeAddress = body.HomeAddress.Trim();
        RequireUniqueContact(tenant, email, phone, excludingId: null);
        var customer = new CustomerEntity
        {
            DealerId = tenant,
            Name = name,
            Email = email,
            Phone = phone,
            HomeAddress = homeAddress
        };
        // A caller such as lead creation may already own a transaction (LEAD-01); begin one
        // only when none is active, and commit only the one begun here.
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        _db.Customers.Add(customer);
        _db.SaveChanges();
        _audit.Record("CUSTOMER", customer.Id, "CREATE", tenant, ActorUsername(),
            ContactFieldChanges(null, null, null, null, name, email, phone, homeAddress));
        _db.SaveChanges();
        tx?.Commit();
        return ToDetail(customer);
    }

    public CustomerDetail Get(long id)
    {
        return ToDetail(LoadThisDealer(id));
    }

    public CustomerDetail Patch(long id, PatchCustomerRequest body)
    {
        var tenant = RequireTenant();
        var customer = LoadThisDealer(id);
        if (body.Version != customer.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var name = body.Name.Trim();
        var email = NormalizeEmail(body.Email);
        var phone = body.Phone.Trim();
        var homeAddress = body.HomeAddress.Trim();
        RequireUniqueContact(tenant, email, phone, excludingId: customer.Id);
        var fieldSummary = ContactFieldChanges(
            customer.Name, customer.Email, customer.Phone, customer.HomeAddress,
            name, email, phone, homeAddress);

        customer.Name = name;
        customer.Email = email;
        customer.Phone = phone;
        customer.HomeAddress = homeAddress;
        customer.UpdatedAt = DateTime.UtcNow;

        _audit.Record("CUSTOMER", customer.Id, "UPDATE", tenant, ActorUsername(), fieldSummary);
        _db.SaveChanges();
        return ToDetail(customer);
    }

    public LinkResponse Link(long customerId, long vehicleId)
    {
        var tenant = RequireTenant();
        var customer = _db.Customers.FirstOrDefault(c => c.Id == customerId && c.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        var vehicle = _db.Vehicles.FirstOrDefault(v => v.Id == vehicleId && v.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        if (_db.CustomerVehicles.Any(cv => cv.VehicleId == vehicleId))
            throw new ApiException(ErrorCode.VehicleAlreadyLinked, "Vehicle is already linked.");

        var row = new CustomerVehicleEntity
        {
            DealerId = tenant,
            CustomerId = customer.Id,
            VehicleId = vehicle.Id
        };
        using var tx = _db.Database.CurrentTransaction is null ? _db.Database.BeginTransaction() : null;
        _db.CustomerVehicles.Add(row);
        _db.SaveChanges();
        _audit.Record("CUSTOMER_VEHICLE", row.Id, "LINK", tenant, ActorUsername(),
            new Dictionary<string, object> { ["customerId"] = customer.Id, ["vehicleId"] = vehicle.Id });
        _db.SaveChanges();
        tx?.Commit();
        return new LinkResponse(row.Id, row.CustomerId, row.VehicleId, row.LinkedAt);
    }

    public void Unlink(long customerId, long vehicleId)
    {
        var tenant = RequireTenant();
        if (!_db.Customers.Any(c => c.Id == customerId && c.DealerId == tenant))
            throw new ApiException(ErrorCode.NotFound, "Not found");
        var vehicle = _db.Vehicles.FirstOrDefault(v => v.Id == vehicleId && v.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        var row = _db.CustomerVehicles.FirstOrDefault(
            cv => cv.CustomerId == customerId && cv.VehicleId == vehicleId)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        if (vehicle.Status == VehicleStatus.Sold)
            throw new ApiException(ErrorCode.SoldLocked, "Sold vehicle cannot be unlinked.");

        var entityId = row.Id;
        _db.CustomerVehicles.Remove(row);

        _audit.Record("CUSTOMER_VEHICLE", entityId, "UNLINK", tenant, ActorUsername(),
            new Dictionary<string, object> { ["customerId"] = customerId, ["vehicleId"] = vehicleId });
        _db.SaveChanges();
    }

    private CustomerListItem ToListItem(CustomerEntity customer)
    {
        var links = _db.CustomerVehicles
            .Where(cv => cv.CustomerId == customer.Id)
            .OrderByDescending(cv => cv.LinkedAt)
            .ToList();

        LinkedVehicleBrief? brief = null;
        if (links.Count > 0)
        {
            var v = _db.Vehicles.FirstOrDefault(
                v => v.Id == links[0].VehicleId && v.DealerId == customer.DealerId);
            if (v != null)
                brief = new LinkedVehicleBrief(v.Id, v.ModelYear, v.Make, v.Model);
        }

        return new CustomerListItem(
            customer.Id, customer.Name, customer.Email, customer.Phone,
            customer.HomeAddress, brief, links.Count, customer.Version);
    }

    private CustomerDetail ToDetail(CustomerEntity customer)
    {
        var tenant = customer.DealerId;
        var items = _db.CustomerVehicles
            .Where(cv => cv.CustomerId == customer.Id)
            .OrderByDescending(cv => cv.LinkedAt)
            .ToList()
            .Select(link => _db.Vehicles.FirstOrDefault(v => v.Id == link.VehicleId && v.DealerId == tenant))
            .Where(v => v != null)
            .Select(v => new LinkedVehicleItem(v!.Id, v.Vin, v.ModelYear, v.Make, v.Model, v.Status))
            .ToList();

        // CRM-13: families share one email, so a duplicate inside the dealership is reported
        // as a flag the form can warn on, never as a rejected save.
        var duplicateEmail = _db.Customers.Any(
            c => c.DealerId == tenant && c.Id != customer.Id && c.Email == customer.Email);

        return new CustomerDetail(
            customer.Id, customer.Name, customer.Email, customer.Phone,
            customer.HomeAddress, items, customer.Version, duplicateEmail);
    }

    private static Dictionary<string, object> ContactFieldChanges(
        string? previousName, string? previousEmail, string? previousPhone, string? previousHomeAddress,
        string name, string email, string phone, string homeAddress)
    {
        var changed = new Dictionary<string, object>();
        if (previousName != name) changed["name"] = name;
        if (previousEmail != email) changed["email"] = true;
        if (previousPhone != phone) changed["phone"] = true;
        if (previousHomeAddress != homeAddress) changed["homeAddress"] = true;
        return changed;
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private CustomerEntity LoadThisDealer(long id)
    {
        var tenant = RequireTenant();
        return _db.Customers.FirstOrDefault(c => c.Id == id && c.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
