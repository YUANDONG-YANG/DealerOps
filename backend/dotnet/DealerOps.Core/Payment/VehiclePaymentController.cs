using DealerOps.Core.Payment.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Payment;

/// <summary>Payment ledger of a sold vehicle: list, record and remove payments (dealer users only).</summary>
[ApiController]
[Route("api/v1/vehicles/{vehicleId}/payments")]
[Authorize]
public class VehiclePaymentController : ControllerBase
{
    private readonly VehiclePaymentService _service;

    public VehiclePaymentController(VehiclePaymentService service)
    {
        _service = service;
    }

    /// <summary>Returns the payments, paid total and balance due (manager only).</summary>
    [HttpGet]
    public PaymentLedger Ledger(long vehicleId) => _service.Ledger(vehicleId);

    /// <summary>Records a payment; a manager gets the updated ledger, staff get the recorded payment.</summary>
    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create(long vehicleId, [FromBody] CreatePaymentRequest body)
    {
        return StatusCode(201, _service.Create(vehicleId, body));
    }

    /// <summary>Removes a payment and returns the updated ledger (manager only).</summary>
    [HttpDelete("{paymentId}")]
    public PaymentLedger Delete(long vehicleId, long paymentId) => _service.Delete(vehicleId, paymentId);
}
