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

    [HttpGet("inventory")]
    public PublicInventory Inventory(long dealerId) => _service.Inventory(dealerId);

    [HttpGet("vehicles/{vehicleId}/photo")]
    public IActionResult Photo(long dealerId, long vehicleId)
    {
        var (data, contentType) = _service.Photo(dealerId, vehicleId);
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=300";
        return File(data, contentType);
    }

    [HttpPost("inquiries")]
    [ProducesResponseType(204)]
    public IActionResult Inquire(long dealerId, [FromBody] InquiryRequest body)
    {
        _service.Inquire(dealerId, body);
        return NoContent();
    }
}
