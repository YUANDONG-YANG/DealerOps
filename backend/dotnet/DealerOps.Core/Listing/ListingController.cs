using DealerOps.Core.Listing.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Listing;

[ApiController]
[Authorize]
public class ListingController : ControllerBase
{
    private readonly ListingService _listingService;

    public ListingController(ListingService listingService)
    {
        _listingService = listingService;
    }

    [HttpGet("api/v1/vehicles/{id}/listing")]
    public ListingResponse GetByVehicle(long id)
    {
        return _listingService.GetByVehicle(id);
    }

    [HttpPatch("api/v1/vehicles/{id}/listing")]
    public ListingResponse PatchByVehicle(long id, [FromBody] PatchListingRequest body)
    {
        return _listingService.PatchByVehicle(id, body);
    }

    [HttpPost("api/v1/listings/{id}/ready")]
    public ListingResponse Ready(long id, [FromBody] VersionBody body)
    {
        return _listingService.Ready(id, body);
    }

    [HttpPost("api/v1/listings/{id}/exports")]
    public IActionResult Export(long id, [FromBody] VersionBody body)
    {
        return Content(_listingService.Export(id, body), "text/plain; charset=utf-8");
    }
}
