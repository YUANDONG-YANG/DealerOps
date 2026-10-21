using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Catalog;

/// <summary>
/// Anonymous vehicle reference data from NHTSA vPIC: makes, models of a make, and VIN decode.
/// Answers are cached; vPIC failures return 502 CATALOG_UNAVAILABLE.
/// </summary>
[ApiController]
[Route("api/v1/catalog")]
public class VehicleCatalogController : ControllerBase
{
    private readonly VehicleCatalogService _catalogService;

    public VehicleCatalogController(VehicleCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    /// <summary>Passenger car and MPV makes, alphabetical.</summary>
    [HttpGet("makes")]
    [AllowAnonymous]
    public Task<List<string>> Makes(CancellationToken cancellationToken)
        => _catalogService.MakesAsync(cancellationToken);

    /// <summary>Models of one make, alphabetical. 400 without a make; 404 for an unknown make.</summary>
    [HttpGet("models")]
    [AllowAnonymous]
    public Task<List<string>> Models([FromQuery] string? make, CancellationToken cancellationToken)
        => _catalogService.ModelsAsync(make, cancellationToken);

    /// <summary>Decodes a 17-character VIN. 400 for a malformed VIN; 404 when vPIC knows no vehicle for it.</summary>
    [HttpGet("vin/{vin}")]
    [AllowAnonymous]
    public Task<VinDecodeResponse> DecodeVin(string vin, CancellationToken cancellationToken)
        => _catalogService.DecodeVinAsync(vin, cancellationToken);
}
