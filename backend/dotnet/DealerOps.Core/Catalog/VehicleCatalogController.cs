using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Catalog;

[ApiController]
[Route("api/v1/vehicle-catalog")]
public class VehicleCatalogController : ControllerBase
{
    private readonly VehicleCatalogService _catalogService;

    public VehicleCatalogController(VehicleCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    [HttpGet("makes")]
    [Authorize]
    public List<string> Makes() => _catalogService.Makes();

    [HttpGet("models")]
    [Authorize]
    public List<string> Models([FromQuery] string? make) => _catalogService.Models(make);

    [HttpGet("vin/{vin}")]
    public VinDecodeResponse DecodeVin(string vin) => _catalogService.DecodeVin(vin);
}
