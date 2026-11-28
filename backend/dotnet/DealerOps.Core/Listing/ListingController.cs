using DealerOps.Core.Listing.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DealerOps.Core.Listing;

/// <summary>Ad listing endpoints of the dealer workspace; all calls are tenant scoped.</summary>
[ApiController]
[Authorize]
public class ListingController : ControllerBase
{
    private readonly ListingService _listingService;

    public ListingController(ListingService listingService)
    {
        _listingService = listingService;
    }

    /// <summary>Reads the vehicle's listing, or an empty draft before the first save.</summary>
    [HttpGet("api/v1/vehicles/{id}/listing")]
    public ListingResponse GetByVehicle(long id)
    {
        return _listingService.GetByVehicle(id);
    }

    /// <summary>Creates or edits the vehicle's listing with optimistic versioning.</summary>
    [HttpPatch("api/v1/vehicles/{id}/listing")]
    public ListingResponse PatchByVehicle(long id, [FromBody] PatchListingRequest body)
    {
        return _listingService.PatchByVehicle(id, body);
    }

    /// <summary>Marks a listing whose current content passed its check as READY.</summary>
    [HttpPost("api/v1/listings/{id}/ready")]
    public ListingResponse Ready(long id, [FromBody] VersionBody body)
    {
        return _listingService.Ready(id, body);
    }

    /// <summary>Exports the passed listing as plain text; the export is audited.</summary>
    [HttpPost("api/v1/listings/{id}/exports")]
    public IActionResult Export(long id, [FromBody] VersionBody body)
    {
        return Content(_listingService.Export(id, body), "text/plain; charset=utf-8");
    }
}
