using DealerOps.Core.Common;
using DealerOps.Core.Vehicle.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Vehicle;

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

    [HttpGet]
    public PageResponse<VehicleResponse> List(
        [FromQuery] string? q,
        [FromQuery] VehicleStatus? status,
        [FromQuery] ConditionCode? condition,
        [FromQuery] VehicleBodyType? bodyType,
        [FromQuery] string? make,
        [FromQuery] string? model,
        [FromQuery] int? modelYear,
        [FromQuery] int page = 0,
        [FromQuery] int size = 10)
    {
        return _vehicleService.List(
            new VehicleFilter(q, status, condition, bodyType, make, model, modelYear), page, size);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public IActionResult Create([FromBody] CreateVehicleRequest body)
    {
        return StatusCode(201, _vehicleService.Create(body));
    }

    [HttpGet("{id}")]
    public VehicleResponse Get(long id)
    {
        return _vehicleService.Get(id);
    }

    [HttpPatch("{id}")]
    public VehicleResponse Patch(long id, [FromBody] PatchVehicleRequest body)
    {
        return _vehicleService.Patch(id, body);
    }

    [HttpPost("{id}/sell")]
    public VehicleResponse Sell(long id, [FromBody] SellVehicleRequest body)
    {
        return _vehicleService.Sell(id, body);
    }
}
