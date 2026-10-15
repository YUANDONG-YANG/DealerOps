using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Catalog;

[ApiController]
[Route("api/v1/catalog")]
public class VehicleCatalogController : ControllerBase
{
    private readonly VehicleCatalogService _catalogService;

    public VehicleCatalogController(VehicleCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    [HttpGet("makes")]
    [AllowAnonymous]
    public List<string> Makes() => _catalogService.Makes();

    [HttpGet("models")]
    [AllowAnonymous]
    public List<string> Models([FromQuery] string? make) => _catalogService.Models(make);

    [HttpGet("vin/{vin}")]
    [AllowAnonymous]
    public VinDecodeResponse DecodeVin(string vin) => _catalogService.DecodeVin(vin);
}
