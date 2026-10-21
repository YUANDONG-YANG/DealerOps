using DealerOps.Core.BuyerSite.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace DealerOps.Core.BuyerSite;

/// <summary>Anonymous buyer site: a dealership's listed vehicles and the inquiry form.</summary>
[ApiController]
[Route("api/v1/public/dealers/{dealerId}")]
[AllowAnonymous]
public class BuyerSiteController : ControllerBase
{
    private readonly BuyerSiteService _service;

    public BuyerSiteController(BuyerSiteService service)
    {
        _service = service;
    }

    /// <summary>The dealership's contact card and its publicly listed vehicles, newest first. 404 for an unknown or inactive dealership.</summary>
    [HttpGet("inventory")]
    public PublicInventory Inventory(long dealerId) => _service.Inventory(dealerId);

    /// <summary>
    /// The first photo of a publicly listed vehicle (enhanced when available), cacheable for five
    /// minutes. 404 when the vehicle is not listed or has no photo.
    /// </summary>
    [HttpGet("vehicles/{vehicleId}/photo")]
    public IActionResult Photo(long dealerId, long vehicleId)
    {
        var (data, contentType) = _service.Photo(dealerId, vehicleId);
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=300";
        return File(data, contentType);
    }

    /// <summary>
    /// Files a buyer inquiry on a publicly listed vehicle as a new lead (and a new customer when the
    /// phone is not known). Returns 204; 404 when the vehicle is no longer listed.
    /// </summary>
    [HttpPost("inquiries")]
    [ProducesResponseType(204)]
    public IActionResult Inquire(long dealerId, [FromBody] InquiryRequest body)
    {
        _service.Inquire(dealerId, body);
        return NoContent();
    }
}
