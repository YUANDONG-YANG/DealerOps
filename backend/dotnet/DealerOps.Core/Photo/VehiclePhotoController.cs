using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Photo.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace DealerOps.Core.Photo;

/// <summary>
/// Dealership endpoints for a vehicle's photos: gallery list, upload, content stream, enhancement and
/// delete. Tenant checks, audit and logging live in <see cref="VehiclePhotoService"/>.
/// </summary>
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

    /// <summary>Lists the vehicle's photos in gallery order (oldest first).</summary>
    [HttpGet]
    public List<PhotoItem> List(long vehicleId) => _photoService.List(vehicleId);

    /// <summary>Uploads one JPEG or PNG photo; returns 201 with the new photo.</summary>
    [HttpPost]
    [RequestSizeLimit(3_145_728)]
    [ProducesResponseType(201)]
    public IActionResult Upload(long vehicleId, IFormFile file) =>
        StatusCode(201, _photoService.Upload(vehicleId, file));

    /// <summary>Streams the original or enhanced image bytes without caching.</summary>
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

    /// <summary>Applies an enhancement preset to the photo and returns the updated photo.</summary>
    [HttpPost("{photoId}/enhance")]
    public PhotoItem Enhance(long vehicleId, long photoId, [FromBody] EnhancePhotoRequest request) =>
        _photoService.Enhance(vehicleId, photoId, request.Preset!.Value);

    /// <summary>Deletes the photo; returns 204.</summary>
    [HttpDelete("{photoId}")]
    public IActionResult Delete(long vehicleId, long photoId)
    {
        _photoService.Delete(vehicleId, photoId);
        return NoContent();
    }
}
