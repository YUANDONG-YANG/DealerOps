using DealerOps.Core.Photo;

namespace DealerOps.Core.Photo.Dto;

public record PhotoItem(
    long Id,
    long VehicleId,
    string ContentType,
    PhotoPreset? Enhancement,
    string UploadedBy,
    DateTime CreatedAt);
