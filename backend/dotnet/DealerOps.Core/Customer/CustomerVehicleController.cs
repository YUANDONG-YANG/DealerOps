using DealerOps.Core.Customer.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Customer;

/// <summary>Links and unlinks a dealership vehicle to a customer (audited as LINK and UNLINK).</summary>
[ApiController]
[Route("api/v1/customers/{id}/vehicles")]
[Authorize]
public class CustomerVehicleController : ControllerBase
{
    private readonly CustomerService _service;

    public CustomerVehicleController(CustomerService service)
    {
        _service = service;
    }

    [HttpPut("{vehicleId}")]
    public LinkResponse Link(long id, long vehicleId)
    {
        return _service.Link(id, vehicleId);
    }

    [HttpDelete("{vehicleId}")]
    public IActionResult Unlink(long id, long vehicleId)
    {
        _service.Unlink(id, vehicleId);
        return NoContent();
    }
}
