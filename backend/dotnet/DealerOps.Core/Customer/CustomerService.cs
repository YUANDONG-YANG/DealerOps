using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Customer.Dto;
using DealerOps.Core.Data;
using DealerOps.Core.Vehicle;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Customer;

/// <summary>
/// Dealership customer records (CRM) and their vehicle links. Every create, update, delete, link
/// and unlink writes an audit row in the same SaveChanges as the change (AUD-07), contact values
/// included (AUD-04). Logs carry ids only, never personal data.
/// </summary>
public class CustomerService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(AppDbContext db, IAuditService audit, ILogger<CustomerService> logger)
    {
        _db = db;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>Lists this dealership's customers newest first, filtered by search term and link state.</summary>
    public PageResponse<CustomerListItem> List(string? q, bool? linked, int page, int size)
    {
        var tenant = TenantGuard.RequireTenantId();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);

        IQueryable<CustomerEntity> query = _db.Customers.Where(c => c.DealerId == tenant);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            // Email is stored lower-case, so match it against the lower-cased term (CRM-03).
            var emailTerm = term.ToLowerInvariant();
            // Phones keep the formatting they were typed with, so "4035550123" must still find
            // "403-555-0123": a phone-like term is compared digits only, stripping the symbols
            // the phone rule allows. Terms with letters (names, emails) never take this path.
            var phoneDigits = term.All(ch => char.IsDigit(ch) || " -()+.".Contains(ch))
                ? new string(term.Where(char.IsDigit).ToArray())
                : "";
            query = query.Where(c =>
                c.Name.Contains(term) ||
                c.Email.Contains(emailTerm) ||
                c.Phone.Contains(term) ||
                (phoneDigits.Length >= 3 && c.Phone.Replace(" ", "").Replace("-", "").Replace("(", "")
                    .Replace(")", "").Replace("+", "").Contains(phoneDigits)));
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

    /// <summary>Creates a customer; a duplicate phone is rejected, a duplicate email only warns (CRM-13).</summary>
    public CustomerDetail Create(CreateCustomerRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var name = body.Name.Trim();
        var email = NormalizeEmail(body.Email);
        var phone = body.Phone.Trim();
        var homeAddress = body.HomeAddress.Trim();
        RequireUniquePhone(tenant, phone, excludingId: null);
        var emailWarning = DuplicateEmailWarning(tenant, email, excludingId: null);
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
        _audit.Record("CUSTOMER", customer.Id, "CREATE", tenant, TenantContext.ActorUsername(),
            ContactFieldChanges(null, null, null, null, name, email, phone, homeAddress));
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation("Customer created customerId={CustomerId} dealerId={DealerId} by {Actor}",
            customer.Id, tenant, TenantContext.ActorUsername());
        return ToDetail(customer, emailWarning);
    }

    /// <summary>Returns one customer of this dealership with its linked vehicles, newest link first.</summary>
    public CustomerDetail Get(long id)
    {
        return ToDetail(LoadThisDealer(id));
    }

    /// <summary>
    /// Updates a customer under optimistic locking. The audit row holds the new and the replaced
    /// value of every changed field, contact fields included (AUD-04).
    /// </summary>
    public CustomerDetail Patch(long id, PatchCustomerRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var customer = LoadThisDealer(id);
        if (body.Version != customer.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var name = body.Name.Trim();
        var email = NormalizeEmail(body.Email);
        var phone = body.Phone.Trim();
        var homeAddress = body.HomeAddress.Trim();
        RequireUniquePhone(tenant, phone, excludingId: customer.Id);
        var emailWarning = DuplicateEmailWarning(tenant, email, excludingId: customer.Id);
        var fieldSummary = ContactFieldChanges(
            customer.Name, customer.Email, customer.Phone, customer.HomeAddress,
            name, email, phone, homeAddress);

        // Like a vehicle patch, a save that changes nothing writes no audit entry.
        if (fieldSummary.Count == 0)
            return ToDetail(customer, emailWarning);

        // Every changed field keeps its replaced value, contact fields included, so each version
        // of the customer can be traced (AUD-04, AUD-13).
        var before = new Dictionary<string, object?>
        {
            ["name"] = customer.Name, ["email"] = customer.Email,
            ["phone"] = customer.Phone, ["homeAddress"] = customer.HomeAddress
        };
        var previous = fieldSummary.Keys.ToDictionary(k => k, k => before[k]);
        customer.Name = name;
        customer.Email = email;
        customer.Phone = phone;
        customer.HomeAddress = homeAddress;
        customer.UpdatedAt = DateTime.UtcNow;

        _audit.Record("CUSTOMER", customer.Id, "UPDATE", tenant, TenantContext.ActorUsername(), fieldSummary, previous);
        _db.SaveChanges();
        _logger.LogInformation(
            "Customer updated customerId={CustomerId} dealerId={DealerId} fields={Fields} by {Actor}",
            customer.Id, tenant, string.Join(",", fieldSummary.Keys), TenantContext.ActorUsername());
        return ToDetail(customer, emailWarning);
    }

    /// <summary>Links a vehicle of this dealership to a customer; a vehicle has at most one owner link (CRM-07).</summary>
    public LinkResponse Link(long customerId, long vehicleId)
    {
        var tenant = TenantGuard.RequireTenantId();
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
        try
        {
            _db.SaveChanges();
        }
        catch (DbUpdateException ex) when (DuplicateKey.Is(ex))
        {
            // A concurrent request linked the same vehicle after the check above (CRM-07).
            // Error 1062 is enough: customer_vehicle's only unique key is the vehicle id.
            throw new ApiException(ErrorCode.VehicleAlreadyLinked, "Vehicle is already linked.");
        }
        _audit.Record("CUSTOMER_VEHICLE", row.Id, "LINK", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["customerId"] = customer.Id, ["vehicleId"] = vehicle.Id });
        _db.SaveChanges();
        tx?.Commit();
        _logger.LogInformation(
            "Customer vehicle linked linkId={LinkId} customerId={CustomerId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
            row.Id, customer.Id, vehicle.Id, tenant, TenantContext.ActorUsername());
        return new LinkResponse(row.Id, row.CustomerId, row.VehicleId, row.LinkedAt);
    }

    /// <summary>Soft-deletes a customer (CRM-14); the row stays for leads, links and audit history.</summary>
    public void Delete(long id)
    {
        var tenant = TenantGuard.RequireTenantId();
        var customer = LoadThisDealer(id);
        customer.DeletedAt = DateTime.UtcNow;
        _audit.Record("CUSTOMER", customer.Id, "DELETE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["deleted"] = true },
            new Dictionary<string, object?> { ["deleted"] = false });
        _db.SaveChanges();
        _logger.LogInformation("Customer deleted customerId={CustomerId} dealerId={DealerId} by {Actor}",
            customer.Id, tenant, TenantContext.ActorUsername());
    }

    /// <summary>Removes a customer-vehicle link; a sold vehicle's link is locked.</summary>
    public void Unlink(long customerId, long vehicleId)
    {
        var tenant = TenantGuard.RequireTenantId();
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

        _audit.Record("CUSTOMER_VEHICLE", entityId, "UNLINK", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["customerId"] = customerId, ["vehicleId"] = vehicleId });
        _db.SaveChanges();
        _logger.LogInformation(
            "Customer vehicle unlinked linkId={LinkId} customerId={CustomerId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
            entityId, customerId, vehicleId, tenant, TenantContext.ActorUsername());
    }

    private CustomerListItem ToListItem(CustomerEntity customer)
    {
        var links = _db.CustomerVehicles
            .Where(cv => cv.CustomerId == customer.Id)
            .OrderByDescending(cv => cv.LinkedAt).ThenByDescending(cv => cv.Id)
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

    private CustomerDetail ToDetail(CustomerEntity customer, string? emailWarning = null)
    {
        var tenant = customer.DealerId;
        var items = _db.CustomerVehicles
            .Where(cv => cv.CustomerId == customer.Id)
            .OrderByDescending(cv => cv.LinkedAt).ThenByDescending(cv => cv.Id)
            .ToList()
            .Select(link => _db.Vehicles.FirstOrDefault(v => v.Id == link.VehicleId && v.DealerId == tenant))
            .Where(v => v != null)
            .Select(v => new LinkedVehicleItem(v!.Id, v.Vin, v.ModelYear, v.Make, v.Model, v.Status))
            .ToList();

        return new CustomerDetail(
            customer.Id, customer.Name, customer.Email, customer.Phone,
            customer.HomeAddress, items, customer.Version, emailWarning);
    }

    // Phone stays unique inside the dealership. Email may be shared (CRM-13): the caller
    // warns and still saves. On a Patch, excludingId skips the customer being edited.
    private void RequireUniquePhone(long tenant, string phone, long? excludingId)
    {
        var duplicatePhone = _db.Customers.Any(c =>
            c.DealerId == tenant && c.Phone == phone && (excludingId == null || c.Id != excludingId));
        if (duplicatePhone)
        {
            const string message = "That phone number is already used by another customer.";
            throw new ApiException(ErrorCode.PhoneTaken, message,
                new Dictionary<string, string> { ["phone"] = message });
        }
    }

    private string? DuplicateEmailWarning(long tenant, string email, long? excludingId)
    {
        var duplicateEmail = _db.Customers.Any(c =>
            c.DealerId == tenant && c.Email == email && (excludingId == null || c.Id != excludingId));
        return duplicateEmail
            ? "Another customer at this dealership already uses this email. The customer was saved."
            : null;
    }

    /// <summary>
    /// Audit summary of changed customer fields with their new values, contact fields included
    /// (AUD-04). Null previous values mean a create, so every field is listed.
    /// </summary>
    internal static Dictionary<string, object> ContactFieldChanges(
        string? previousName, string? previousEmail, string? previousPhone, string? previousHomeAddress,
        string name, string email, string phone, string homeAddress)
    {
        var changed = new Dictionary<string, object>();
        if (previousName != name) changed["name"] = name;
        if (previousEmail != email) changed["email"] = email;
        if (previousPhone != phone) changed["phone"] = phone;
        if (previousHomeAddress != homeAddress) changed["homeAddress"] = homeAddress;
        return changed;
    }

    /// <summary>Emails are stored trimmed and lower-case (CRM-03).</summary>
    internal static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private CustomerEntity LoadThisDealer(long id)
    {
        var tenant = TenantGuard.RequireTenantId();
        return _db.Customers.FirstOrDefault(c => c.Id == id && c.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

}
