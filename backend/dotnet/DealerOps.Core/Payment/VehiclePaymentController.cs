using DealerOps.Core.Payment.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Payment;

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

    [HttpGet]
    public PaymentLedger Ledger(long vehicleId) => _service.Ledger(vehicleId);

    [HttpPost]
    [ProducesResponseType(201)]
    public IActionResult Create(long vehicleId, [FromBody] CreatePaymentRequest body)
    {
        return StatusCode(201, _service.Create(vehicleId, body));
    }

    [HttpDelete("{paymentId}")]
    public PaymentLedger Delete(long vehicleId, long paymentId) => _service.Delete(vehicleId, paymentId);
}
