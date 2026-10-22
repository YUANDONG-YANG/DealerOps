using DealerOps.Core.Audit;
using DealerOps.Core.BuyerSite.Dto;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Compliance;
using DealerOps.Core.Customer;
using DealerOps.Core.Data;
using DealerOps.Core.Lead;
using DealerOps.Core.Listing;
using DealerOps.Core.Notifications;
using DealerOps.Core.Photo;
using DealerOps.Core.Vehicle;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.BuyerSite;

/// <summary>
/// The anonymous buyer site. Requests carry no tenant, so every query ignores the tenant filters
/// and names the dealership explicitly. A vehicle is public only while it is in stock and its ad
/// is ready with a passed, current check: the same rule that allows the TXT export (AD-13).
/// </summary>
public class BuyerSiteService
{
    /// <summary>Recorded as the author of rows the buyer site writes, so staff can tell them apart.</summary>
    public const string Actor = "buyer-site";

    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly ILogger<BuyerSiteService> _logger;

    public BuyerSiteService(AppDbContext db, IAuditService audit, NotificationService notifications,
        ILogger<BuyerSiteService> logger)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
        _logger = logger;
    }

    /// <summary>
    /// The active dealership's contact card and its publicly listed vehicles, newest first. The
    /// dealership is named by its slug, or by its numeric id for links made before slugs.
    /// </summary>
    public PublicInventory Inventory(string dealerRef)
    {
        var active = _db.Dealers.AsNoTracking().Where(d => d.Active)
            .Select(d => new { d.Id, d.LegalName }).ToList();
        var slugs = Dealer.DealerSlug.Assign(active.Select(d => (d.Id, d.LegalName)));
        var reference = dealerRef.Trim().ToLowerInvariant();
        var dealerId = slugs.Where(s => s.Value == reference).Select(s => (long?)s.Key).FirstOrDefault()
                       ?? (long.TryParse(reference, out var id) && slugs.ContainsKey(id)
                           ? id
                           : throw new ApiException(ErrorCode.NotFound, "Not found"));
        var dealer = LoadDealer(dealerId);
        var vehicles = PublicVehicles(dealerId)
            .OrderByDescending(x => x.Vehicle.AddedOn).ThenByDescending(x => x.Vehicle.Id)
            .Select(x => new PublicVehicle(
                x.Vehicle.Id, x.Vehicle.ModelYear, x.Vehicle.Make, x.Vehicle.Model,
                x.Vehicle.BodyType, x.Vehicle.ConditionCode, x.Vehicle.MileageKm,
                x.Vehicle.ExteriorColor, x.Vehicle.FuelType, x.Listing.Title, x.Listing.Body,
                _db.VehiclePhotos.IgnoreQueryFilters()
                    .Any(p => p.VehicleId == x.Vehicle.Id && p.DealerId == dealerId)))
            .ToList();
        return new PublicInventory(dealer.Id, slugs[dealer.Id], dealer.LegalName, dealer.ContactPhone,
            dealer.ContactEmail, dealer.ContactAddress, vehicles);
    }

    /// <summary>
    /// The active dealership's logo, decoded from the data URL the profile stores (PNG, JPEG or
    /// WebP, validated on save).
    /// </summary>
    public (byte[] Data, string ContentType) Logo(long dealerId)
    {
        var logo = LoadDealer(dealerId).LogoDataUrl;
        var comma = logo?.IndexOf(',') ?? -1;
        if (logo == null || !logo.StartsWith("data:") || comma < 0)
            throw new ApiException(ErrorCode.NotFound, "Not found");
        var contentType = logo[5..comma].Replace(";base64", "");
        return (Convert.FromBase64String(logo[(comma + 1)..]), contentType);
    }

    /// <summary>The vehicle's first photo, enhanced when an enhancement exists.</summary>
    public (byte[] Data, string ContentType) Photo(long dealerId, long vehicleId)
    {
        LoadDealer(dealerId);
        RequirePublicVehicle(dealerId, vehicleId);
        var photo = _db.VehiclePhotos.IgnoreQueryFilters().AsNoTracking()
                        .Where(p => p.VehicleId == vehicleId && p.DealerId == dealerId)
                        .OrderBy(p => p.Id)
                        .FirstOrDefault()
                    ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        return photo.EnhancedData != null
            ? (photo.EnhancedData, VehiclePhotoService.EnhancedContentType)
            : (photo.OriginalData, photo.ContentType);
    }

    /// <summary>
    /// Files the inquiry as a NEW lead on the vehicle, due for follow-up today. The buyer is
    /// matched to an existing customer by phone (unique per dealership, CRM-09); otherwise a
    /// customer is created. The message and the contact details as typed go in the first note,
    /// and every member of the dealership gets a <c>BUYER_INQUIRY</c> inbox message.
    /// </summary>
    public void Inquire(long dealerId, InquiryRequest body)
    {
        LoadDealer(dealerId);
        var vehicleId = body.VehicleId!.Value;
        var vehicle = RequirePublicVehicle(dealerId, vehicleId);

        var contact = body.Contact;
        var name = contact.Name.Trim();
        var email = CustomerService.NormalizeEmail(contact.Email);
        var phone = contact.Phone.Trim();
        var homeAddress = contact.HomeAddress.Trim();

        using var tx = _db.Database.BeginTransaction();
        var customer = _db.Customers.IgnoreQueryFilters()
            .FirstOrDefault(c => c.DealerId == dealerId && c.DeletedAt == null && c.Phone == phone);
        var newCustomer = customer == null;
        if (customer == null)
        {
            customer = new CustomerEntity
            {
                DealerId = dealerId, Name = name, Email = email, Phone = phone, HomeAddress = homeAddress
            };
            _db.Customers.Add(customer);
            _db.SaveChanges();
            _audit.Record("CUSTOMER", customer.Id, "CREATE", dealerId, Actor,
                CustomerService.ContactFieldChanges(null, null, null, null, name, email, phone, homeAddress));
        }

        var lead = new LeadEntity
        {
            DealerId = dealerId,
            CustomerId = customer.Id,
            VehicleId = vehicleId,
            Stage = LeadStage.New,
            NextFollowUpOn = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        _db.Leads.Add(lead);
        _db.SaveChanges();
        _audit.Record("LEAD", lead.Id, "CREATE", dealerId, Actor,
            new Dictionary<string, object>
            {
                ["customerId"] = customer.Id,
                ["stage"] = EnumWireName.Of(LeadStage.New),
                ["vehicleId"] = vehicleId,
                ["source"] = "BUYER_SITE"
            });

        var note = new LeadNoteEntity
        {
            DealerId = dealerId,
            LeadId = lead.Id,
            AuthorUsername = Actor,
            Body = $"Website inquiry from {name} ({email}, {phone}): {body.Message.Trim()}"
        };
        _db.LeadNotes.Add(note);
        _db.SaveChanges();
        _audit.Record("LEAD", lead.Id, "NOTE", dealerId, Actor,
            new Dictionary<string, object> { ["noteId"] = note.Id });
        _db.SaveChanges();
        // leadId is a string because the inbox resolves messages by a string payload field.
        _notifications.Create(dealerId, NotificationService.BuyerInquiry, new
        {
            leadId = lead.Id.ToString(),
            customerName = name,
            vehicle = $"{vehicle.ModelYear} {vehicle.Make} {vehicle.Model}"
        });
        tx.Commit();
        // Ids only: the buyer's contact details stay out of the log.
        _logger.LogInformation("Buyer inquiry filed leadId={LeadId} dealerId={DealerId} vehicleId={VehicleId} customerId={CustomerId} newCustomer={NewCustomer}",
            lead.Id, dealerId, vehicleId, customer.Id, newCustomer);
    }

    private sealed class PublicRow
    {
        public VehicleEntity Vehicle { get; init; } = null!;
        public ListingEntity Listing { get; init; } = null!;
    }

    /// <summary>The dealership's publicly listed vehicles with their ads (the AD-13 export rule).</summary>
    private IQueryable<PublicRow> PublicVehicles(long dealerId) =>
        from l in _db.Listings.IgnoreQueryFilters()
        join c in _db.ComplianceChecks.IgnoreQueryFilters() on l.LastCheckId equals c.Id
        join v in _db.Vehicles.IgnoreQueryFilters() on l.VehicleId equals v.Id
        where l.DealerId == dealerId && c.DealerId == dealerId && v.DealerId == dealerId
              && l.Status == ListingStatus.Ready
              && c.ListingId == l.Id
              && c.ContentVersion == l.ContentVersion
              && c.Recommendation == Recommendation.Passed
              && v.Status == VehicleStatus.InStock
              && v.DeletedAt == null
        select new PublicRow { Vehicle = v, Listing = l };

    private VehicleEntity RequirePublicVehicle(long dealerId, long vehicleId) =>
        PublicVehicles(dealerId).Where(x => x.Vehicle.Id == vehicleId).Select(x => x.Vehicle).FirstOrDefault()
        ?? throw new ApiException(ErrorCode.NotFound, "This vehicle is no longer listed.");

    private Dealer.DealerEntity LoadDealer(long dealerId) =>
        _db.Dealers.AsNoTracking().FirstOrDefault(d => d.Id == dealerId && d.Active)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");
}
