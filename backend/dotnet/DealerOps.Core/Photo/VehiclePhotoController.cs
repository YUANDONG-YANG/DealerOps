using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Photo.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace DealerOps.Core.Photo;

[ApiController]
[Route("api/v1/vehicles/{vehicleId}/photos")]
[Authorize]
public class VehiclePhotoController : ControllerBase
{
    private readonly VehiclePhotoService _photoService;

    public VehiclePhotoController(VehiclePhotoService photoService)
    {
        _photoService = photoService;
    }

    [HttpGet]
    public List<PhotoItem> List(long vehicleId) => _photoService.List(vehicleId);

    [HttpPost]
    [RequestSizeLimit(3_145_728)]
    [ProducesResponseType(201)]
    public IActionResult Upload(long vehicleId, IFormFile file) =>
        StatusCode(201, _photoService.Upload(vehicleId, file));

    [HttpGet("{photoId}/content")]
    public IActionResult Content(long vehicleId, long photoId, [FromQuery] string variant = "original")
    {
        var photo = _photoService.Content(vehicleId, photoId);
        Response.Headers[HeaderNames.CacheControl] = "no-store";
        return variant switch
        {
            "original" => File(photo.OriginalData, photo.ContentType),
            "enhanced" => photo.EnhancedData != null
                ? File(photo.EnhancedData, VehiclePhotoService.EnhancedContentType)
                : throw new ApiException(ErrorCode.NotFound, "Not found"),
            _ => throw new ApiException(ErrorCode.Validation, "Variant must be original or enhanced.")
        };
    }

    [HttpPost("{photoId}/enhance")]
    public PhotoItem Enhance(long vehicleId, long photoId, [FromBody] EnhancePhotoRequest request) =>
        _photoService.Enhance(vehicleId, photoId, request.Preset!.Value);

    [HttpDelete("{photoId}")]
    public IActionResult Delete(long vehicleId, long photoId)
    {
        _photoService.Delete(vehicleId, photoId);
        return NoContent();
    }
}
