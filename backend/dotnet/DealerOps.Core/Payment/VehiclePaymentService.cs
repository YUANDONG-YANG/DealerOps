using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Dealer;
using DealerOps.Core.Payment.Dto;
using DealerOps.Core.Vehicle;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Payment;

/// <summary>
/// Payment ledger of a sold vehicle (design/14 payments): lists, records and removes payments
/// against the sold price, and writes each change to the vehicle's audit history.
/// </summary>
public class VehiclePaymentService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly ILogger<VehiclePaymentService> _logger;

    public VehiclePaymentService(AppDbContext db, IAuditService audit, ILogger<VehiclePaymentService> logger)
    {
        _db = db;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>
    /// Returns the vehicle's payments, newest first, with the paid total and balance due.
    /// Manager only: staff record payments but do not see the ledger (PAY-05).
    /// </summary>
    public PaymentLedger Ledger(long vehicleId)
    {
        // Another dealership's vehicle stays 404 for every caller; only then is the role checked.
        var vehicle = LoadVehicle(vehicleId, TenantGuard.RequireTenantId());
        TenantGuard.RequireManager();
        return ToLedger(vehicle);
    }

    /// <summary>
    /// Records a payment on a sold vehicle. The amount must not exceed the balance due and the
    /// date must fall between the sold date and today. A manager gets the updated ledger back;
    /// staff get only the payment they recorded (PAY-05).
    /// </summary>
    public object Create(long vehicleId, CreatePaymentRequest body)
    {
        var user = TenantGuard.RequireDealerUser();
        var tenant = user.TenantDealerId!.Value;
        using var tx = _db.Database.BeginTransaction();
        // Lock the vehicle row first, so two payments recorded at the same time cannot both pass
        // the balance check. It must be the transaction's first read: MySQL takes the snapshot for
        // the reads below only after the lock is granted.
        _db.Database.ExecuteSqlInterpolated(
            $"SELECT id FROM vehicle WHERE id = {vehicleId} AND dealer_id = {tenant} FOR UPDATE");
        var vehicle = LoadVehicle(vehicleId, tenant);
        if (vehicle.Status != VehicleStatus.Sold || vehicle.SoldPrice == null || vehicle.SoldOn == null)
            throw new ApiException(ErrorCode.Validation, "Record the sale before adding payments.");

        var amount = body.Amount!.Value;
        if (decimal.Round(amount, 2) != amount)
            throw FieldError("amount", "Use at most 2 decimals.");
        var paid = PaymentsOf(vehicle).Sum(p => (decimal?)p.Amount) ?? 0;
        if (amount > vehicle.SoldPrice.Value - paid)
            throw FieldError("amount", "Amount is more than the balance due.");
        var paidOn = body.PaidOn!.Value;
        if (paidOn > DateOnly.FromDateTime(DateTime.UtcNow))
            throw FieldError("paidOn", "Payment date must not be later than today.");
        if (paidOn < vehicle.SoldOn.Value)
            throw FieldError("paidOn", "Payment date must not be before the sold date.");

        var actor = TenantContext.ActorUsername();
        var payment = new VehiclePaymentEntity
        {
            DealerId = tenant,
            VehicleId = vehicle.Id,
            Amount = amount,
            Method = body.Method!.Value,
            PaidOn = paidOn,
            Note = string.IsNullOrWhiteSpace(body.Note) ? null : body.Note.Trim(),
            RecordedBy = actor
        };
        _db.VehiclePayments.Add(payment);
        var method = EnumWireName.Of(payment.Method);
        var paidOnText = paidOn.ToString("yyyy-MM-dd");
        // Payments are part of the vehicle's sale, so they appear in the vehicle's history.
        _audit.Record("VEHICLE", vehicle.Id, "UPDATE", tenant, actor,
            new Dictionary<string, object>
            {
                ["paymentAdded"] = amount,
                ["paymentMethod"] = method,
                ["paidOn"] = paidOnText
            });
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Payment recorded paymentId={PaymentId} vehicleId={VehicleId} dealerId={DealerId} amount={Amount} method={Method} paidOn={PaidOn} by {Actor}",
            payment.Id, vehicle.Id, tenant, amount, method, paidOnText, actor);
        if (user.DealerRole == DealerRole.Manager)
            return ToLedger(vehicle);
        return new PaymentItem(payment.Id, payment.Amount, payment.Method, payment.PaidOn, payment.Note,
            payment.RecordedBy, DateTime.SpecifyKind(payment.CreatedAt, DateTimeKind.Utc));
    }

    /// <summary>
    /// Removes one payment from the vehicle's ledger. The audit row keeps the removed payment's
    /// amount, method, date and whether it had a note in <c>previous</c>.
    /// </summary>
    public PaymentLedger Delete(long vehicleId, long paymentId)
    {
        var tenant = TenantGuard.RequireTenantId();
        var vehicle = LoadVehicle(vehicleId, tenant);
        TenantGuard.RequireManager();
        var payment = PaymentsOf(vehicle).FirstOrDefault(p => p.Id == paymentId)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        var actor = TenantContext.ActorUsername();
        using var tx = _db.Database.BeginTransaction();
        _db.VehiclePayments.Remove(payment);
        var paidOnText = payment.PaidOn.ToString("yyyy-MM-dd");
        var method = EnumWireName.Of(payment.Method);
        // The removed row is gone after this change, so previous keeps what it held; the note
        // body stays out of the audit (only whether one existed).
        _audit.Record("VEHICLE", vehicle.Id, "UPDATE", tenant, actor,
            new Dictionary<string, object>
            {
                ["paymentRemoved"] = payment.Amount,
                ["paidOn"] = paidOnText
            },
            new Dictionary<string, object?>
            {
                ["amount"] = payment.Amount,
                ["paymentMethod"] = method,
                ["paidOn"] = paidOnText,
                ["hasNote"] = payment.Note != null
            });
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation("Payment removed paymentId={PaymentId} vehicleId={VehicleId} dealerId={DealerId} amount={Amount} method={Method} paidOn={PaidOn} by {Actor}",
            paymentId, vehicle.Id, tenant, payment.Amount, method, paidOnText, actor);
        return ToLedger(vehicle);
    }

    /// <summary>Builds the ledger response: payments newest paid date first, paid total and balance due.</summary>
    private PaymentLedger ToLedger(VehicleEntity vehicle)
    {
        var items = PaymentsOf(vehicle)
            .OrderByDescending(p => p.PaidOn).ThenByDescending(p => p.Id)
            .Select(p => new PaymentItem(p.Id, p.Amount, p.Method, p.PaidOn, p.Note, p.RecordedBy, DateTime.SpecifyKind(p.CreatedAt, DateTimeKind.Utc)))
            .ToList();
        var paid = items.Sum(p => p.Amount);
        return new PaymentLedger(vehicle.SoldPrice, paid, vehicle.SoldPrice - paid, items);
    }

    /// <summary>Payments of one vehicle, scoped to the vehicle's dealership.</summary>
    private IQueryable<VehiclePaymentEntity> PaymentsOf(VehicleEntity vehicle) =>
        _db.VehiclePayments.Where(p => p.VehicleId == vehicle.Id && p.DealerId == vehicle.DealerId);

    private VehicleEntity LoadVehicle(long vehicleId, long tenant) =>
        _db.Vehicles.FirstOrDefault(v => v.Id == vehicleId && v.DealerId == tenant)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    private static ApiException FieldError(string field, string message) =>
        new(ErrorCode.Validation, message, new Dictionary<string, string> { [field] = message });

}
