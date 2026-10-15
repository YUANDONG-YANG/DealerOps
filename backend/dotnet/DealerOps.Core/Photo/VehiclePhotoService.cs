using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Photo.Dto;

namespace DealerOps.Core.Photo;

public class VehiclePhotoService
{
    public const string EnhancedContentType = "image/jpeg";

    private readonly AppDbContext _db;
    private readonly PhotoEnhancer _enhancer;
    private readonly IAuditService _audit;
    private readonly long _maxBytes;
    private readonly int _maxPerVehicle;

    public VehiclePhotoService(
        AppDbContext db, PhotoEnhancer enhancer, IAuditService audit, IConfiguration config)
    {
        _db = db;
        _enhancer = enhancer;
        _audit = audit;
        _maxBytes = config.GetValue("Photos:MaxFileSizeMb", 2) * 1024L * 1024L;
        _maxPerVehicle = config.GetValue("Photos:MaxPerVehicle", 10);
    }

    public List<PhotoItem> List(long vehicleId)
    {
        var tenant = RequireVehicle(vehicleId);
        return _db.VehiclePhotos
            .Where(p => p.VehicleId == vehicleId && p.DealerId == tenant)
            .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)
            .Select(p => new PhotoItem(p.Id, p.VehicleId, p.ContentType, p.Enhancement, p.UploadedBy, p.CreatedAt))
            .ToList();
    }

    public PhotoItem Upload(long vehicleId, IFormFile file)
    {
        var tenant = RequireVehicle(vehicleId);
        if (file == null || file.Length == 0)
            throw new ApiException(ErrorCode.Validation, "Choose a photo to upload.");
        if (file.Length > _maxBytes)
            throw new ApiException(ErrorCode.Validation, $"Photo must be {_maxBytes / (1024 * 1024)} MB or smaller.");
        if (_db.VehiclePhotos.Count(p => p.VehicleId == vehicleId && p.DealerId == tenant) >= _maxPerVehicle)
            throw new ApiException(ErrorCode.Validation, $"A vehicle can have at most {_maxPerVehicle} photos.");

        using var ms = new MemoryStream();
        file.CopyTo(ms);
        var data = ms.ToArray();

        var photo = new VehiclePhotoEntity
        {
            DealerId = tenant,
            VehicleId = vehicleId,
            ContentType = _enhancer.DetectContentType(data),
            OriginalData = data,
            UploadedBy = ActorUsername()
        };
        using var tx = _db.Database.BeginTransaction();
        _db.VehiclePhotos.Add(photo);
        _db.SaveChanges();
        _audit.Record("VEHICLE_PHOTO", photo.Id, "CREATE", tenant, ActorUsername(),
            new Dictionary<string, object> { ["vehicleId"] = vehicleId });
        _db.SaveChanges();
        tx.Commit();
        return ToItem(photo);
    }

    public VehiclePhotoEntity Content(long vehicleId, long photoId)
    {
        var tenant = RequireVehicle(vehicleId);
        return Load(photoId, vehicleId, tenant);
    }

    public PhotoItem Enhance(long vehicleId, long photoId, PhotoPreset preset)
    {
        var tenant = RequireVehicle(vehicleId);
        var photo = Load(photoId, vehicleId, tenant);
        photo.EnhancedData = _enhancer.Enhance(photo.OriginalData, preset);
        photo.Enhancement = preset;

        _audit.Record("VEHICLE_PHOTO", photo.Id, "UPDATE", tenant, ActorUsername(),
            new Dictionary<string, object> { ["vehicleId"] = vehicleId, ["enhancement"] = preset.ToString() });
        _db.SaveChanges();
        return ToItem(photo);
    }

    public void Delete(long vehicleId, long photoId)
    {
        var tenant = RequireVehicle(vehicleId);
        var photo = Load(photoId, vehicleId, tenant);
        _db.VehiclePhotos.Remove(photo);
        _audit.Record("VEHICLE_PHOTO", photoId, "DELETE", tenant, ActorUsername(),
            new Dictionary<string, object> { ["vehicleId"] = vehicleId });
        _db.SaveChanges();
    }

    private VehiclePhotoEntity Load(long photoId, long vehicleId, long tenant) =>
        _db.VehiclePhotos.FirstOrDefault(p => p.Id == photoId && p.VehicleId == vehicleId && p.DealerId == tenant)
        ?? throw new ApiException(ErrorCode.NotFound, "Not found");

    private long RequireVehicle(long vehicleId)
    {
        TenantGuard.RequireDealerUser();
        var tenant = TenantGuard.RequireTenantId();
        if (!_db.Vehicles.Any(v => v.Id == vehicleId && v.DealerId == tenant))
            throw new ApiException(ErrorCode.NotFound, "Not found");
        return tenant;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";

    private static PhotoItem ToItem(VehiclePhotoEntity p) =>
        new(p.Id, p.VehicleId, p.ContentType, p.Enhancement, p.UploadedBy, p.CreatedAt);
}
