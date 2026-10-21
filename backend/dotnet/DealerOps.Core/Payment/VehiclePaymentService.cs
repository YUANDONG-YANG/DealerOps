using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Payment.Dto;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Payment;

public class VehiclePaymentService
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public VehiclePaymentService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public PaymentLedger Ledger(long vehicleId)
    {
        var tenant = RequireTenant();
        return ToLedger(LoadVehicle(vehicleId, tenant));
    }

    public PaymentLedger Create(long vehicleId, CreatePaymentRequest body)
    {
        var tenant = RequireTenant();
        var vehicle = LoadVehicle(vehicleId, tenant);
        if (vehicle.Status != VehicleStatus.Sold || vehicle.SoldPrice == null || vehicle.SoldOn == null)
            throw new ApiException(ErrorCode.Validation, "Record the sale before adding payments.");

        var amount = body.Amount!.Value;
        if (decimal.Round(amount, 2) != amount)
            throw FieldError("amount", "Use at most 2 decimals.");
        var paid = PaidTotal(vehicle);
        if (amount > vehicle.SoldPrice.Value - paid)
            throw FieldError("amount", "Amount is more than the balance due.");
        var paidOn = body.PaidOn!.Value;
        if (paidOn > DateOnly.FromDateTime(DateTime.UtcNow))
            throw FieldError("paidOn", "Payment date must not be later than today.");
        if (paidOn < vehicle.SoldOn.Value)
            throw FieldError("paidOn", "Payment date must not be before the sold date.");

        var payment = new VehiclePaymentEntity
        {
            DealerId = tenant,
            VehicleId = vehicle.Id,
            Amount = amount,
            Method = body.Method!.Value,
            PaidOn = paidOn,
            Note = string.IsNullOrWhiteSpace(body.Note) ? null : body.Note.Trim(),
            RecordedBy = ActorUsername()
        };
        using var tx = _db.Database.BeginTransaction();
        _db.VehiclePayments.Add(payment);
        // Payments are part of the vehicle's sale, so they appear in the vehicle's history.
        _audit.Record("VEHICLE", vehicle.Id, "UPDATE", tenant, ActorUsername(),
            new Dictionary<string, object>
            {
                ["paymentAdded"] = amount,
                ["paymentMethod"] = EnumWireName.Of(payment.Method),
                ["paidOn"] = paidOn.ToString("yyyy-MM-dd")
            });
        _db.SaveChanges();
        tx.Commit();
        return ToLedger(vehicle);
    }

    public PaymentLedger Delete(long vehicleId, long paymentId)
    {
        var tenant = RequireTenant();
        var vehicle = LoadVehicle(vehicleId, tenant);
        var payment = _db.VehiclePayments.FirstOrDefault(p =>
                          p.Id == paymentId && p.VehicleId == vehicleId && p.DealerId == tenant)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        using var tx = _db.Database.BeginTransaction();
        _db.VehiclePayments.Remove(payment);
        _audit.Record("VEHICLE", vehicle.Id, "UPDATE", tenant, ActorUsername(),
            new Dictionary<string, object>
            {
                ["paymentRemoved"] = payment.Amount,
                ["paidOn"] = payment.PaidOn.ToString("yyyy-MM-dd")
            });
        _db.SaveChanges();
        tx.Commit();
        return ToLedger(vehicle);
    }

    private PaymentLedger ToLedger(VehicleEntity vehicle)
    {
        var items = _db.VehiclePayments
            .Where(p => p.VehicleId == vehicle.Id && p.DealerId == vehicle.DealerId)
            .OrderByDescending(p => p.PaidOn).ThenByDescending(p => p.Id)
            .Select(p => new PaymentItem(p.Id, p.Amount, p.Method, p.PaidOn, p.Note, p.RecordedBy, p.CreatedAt))
            .ToList();
        var paid = items.Sum(p => p.Amount);
        return new PaymentLedger(vehicle.SoldPrice, paid, vehicle.SoldPrice - paid, items);
    }

    private decimal PaidTotal(VehicleEntity vehicle) =>
        _db.VehiclePayments.Where(p => p.VehicleId == vehicle.Id && p.DealerId == vehicle.DealerId)
            .Sum(p => (decimal?)p.Amount) ?? 0;

    private VehicleEntity LoadVehicle(long vehicleId, long tenant) =>
        _db.Vehicles.FirstOrDefault(v => v.Id == vehicleId && v.DealerId == tenant)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    private static ApiException FieldError(string field, string message) =>
        new(ErrorCode.Validation, message, new Dictionary<string, string> { [field] = message });

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
