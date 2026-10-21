using DealerOps.Core.Common;
using DealerOps.Core.Vehicle.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Vehicle;

/// <summary>Dealer inventory endpoints; every call is scoped to the signed-in dealer user's dealership.</summary>
[ApiController]
[Route("api/v1/vehicles")]
[Authorize]
public class VehicleController : ControllerBase
{
    private readonly VehicleService _vehicleService;

    public VehicleController(VehicleService vehicleService)
    {
        _vehicleService = vehicleService;
    }

    /// <summary>Lists vehicles matching the filters, newest first.</summary>
    [HttpGet]
    public PageResponse<VehicleResponse> List(
        [FromQuery] string? q,
        [FromQuery] VehicleStatus? status,
        [FromQuery] ConditionCode? condition,
        [FromQuery] VehicleBodyType? bodyType,
        [FromQuery] string? make,
        [FromQuery] string? model,
        [FromQuery] int? modelYear,
        [FromQuery] bool unlinkedOnly = false,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _vehicleService.List(
            new VehicleFilter(q, status, condition, bodyType, make, model, modelYear, unlinkedOnly), page, size);
    }

    /// <summary>Adds a vehicle and returns 201 with the created record.</summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public IActionResult Create([FromBody] CreateVehicleRequest body)
    {
        return StatusCode(201, _vehicleService.Create(body));
    }

    /// <summary>Returns the dealership sales report.</summary>
    [HttpGet("report/sales")]
    public SalesReport SalesReport() => _vehicleService.SalesReport();

    /// <summary>Returns one vehicle.</summary>
    [HttpGet("{id}")]
    public VehicleResponse Get(long id)
    {
        return _vehicleService.Get(id);
    }

    /// <summary>Updates a vehicle; the body carries the version read by the client.</summary>
    [HttpPatch("{id}")]
    public VehicleResponse Patch(long id, [FromBody] PatchVehicleRequest body)
    {
        return _vehicleService.Patch(id, body);
    }

    /// <summary>Records the sale of a vehicle.</summary>
    [HttpPost("{id}/sell")]
    public VehicleResponse Sell(long id, [FromBody] SellVehicleRequest body)
    {
        return _vehicleService.Sell(id, body);
    }

    /// <summary>Soft-deletes a vehicle and returns 204.</summary>
    [HttpDelete("{id}")]
    public IActionResult Delete(long id)
    {
        _vehicleService.Delete(id);
        return NoContent();
    }
}
