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
    public Task<List<string>> Makes(CancellationToken cancellationToken)
        => _catalogService.MakesAsync(cancellationToken);

    [HttpGet("models")]
    [AllowAnonymous]
    public Task<List<string>> Models([FromQuery] string? make, CancellationToken cancellationToken)
        => _catalogService.ModelsAsync(make, cancellationToken);

    [HttpGet("vin/{vin}")]
    [AllowAnonymous]
    public Task<VinDecodeResponse> DecodeVin(string vin, CancellationToken cancellationToken)
        => _catalogService.DecodeVinAsync(vin, cancellationToken);
}
