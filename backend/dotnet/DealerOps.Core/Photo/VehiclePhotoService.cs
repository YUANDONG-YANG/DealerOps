using DealerOps.Core.Audit;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Photo.Dto;

namespace DealerOps.Core.Photo;

/// <summary>
/// Stores, enhances and deletes the photos of a dealership's vehicles. Every change is audited as
/// VEHICLE_PHOTO with the owning <c>vehicleId</c> in the summary so the vehicle history finds it;
/// audit rows and logs never carry image bytes.
/// </summary>
public class VehiclePhotoService
{
    /// <summary>Content type of every enhanced variant; the enhancer always encodes JPEG.</summary>
    public const string EnhancedContentType = "image/jpeg";

    private readonly AppDbContext _db;
    private readonly PhotoEnhancer _enhancer;
    private readonly IAuditService _audit;
    private readonly ILogger<VehiclePhotoService> _logger;
    private readonly long _maxBytes;
    private readonly int _maxPerVehicle;

    public VehiclePhotoService(
        AppDbContext db, PhotoEnhancer enhancer, IAuditService audit, IConfiguration config,
        ILogger<VehiclePhotoService> logger)
    {
        _db = db;
        _enhancer = enhancer;
        _audit = audit;
        _logger = logger;
        _maxBytes = config.GetValue("Photos:MaxFileSizeMb", 2) * 1024L * 1024L;
        _maxPerVehicle = config.GetValue("Photos:MaxPerVehicle", 10);
    }

    /// <summary>
    /// Lists a vehicle's photos in gallery order: oldest upload first, so the first photo stays the
    /// cover image. This is a product rule and intentionally not the newest-first order of record lists.
    /// </summary>
    public List<PhotoItem> List(long vehicleId)
    {
        var tenant = RequireVehicle(vehicleId);
        return _db.VehiclePhotos
            .Where(p => p.VehicleId == vehicleId && p.DealerId == tenant)
            .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)
            .AsEnumerable()
            .Select(ToItem)
            .ToList();
    }

    /// <summary>Validates and stores a JPEG or PNG upload and audits it as VEHICLE_PHOTO CREATE.</summary>
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
            UploadedBy = TenantContext.ActorUsername()
        };
        using var tx = _db.Database.BeginTransaction();
        _db.VehiclePhotos.Add(photo);
        _db.SaveChanges();
        _audit.Record("VEHICLE_PHOTO", photo.Id, "CREATE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["vehicleId"] = vehicleId });
        _db.SaveChanges();
        tx.Commit();
        _logger.LogInformation(
            "Vehicle photo uploaded photoId={PhotoId} vehicleId={VehicleId} dealerId={DealerId} bytes={Bytes} by {Actor}",
            photo.Id, vehicleId, tenant, data.Length, photo.UploadedBy);
        return ToItem(photo);
    }

    /// <summary>Loads a photo with its image data for streaming; reads are not audited.</summary>
    public VehiclePhotoEntity Content(long vehicleId, long photoId)
    {
        var tenant = RequireVehicle(vehicleId);
        return Load(photoId, vehicleId, tenant);
    }

    /// <summary>
    /// Replaces the enhanced variant with the original processed by <paramref name="preset"/> and audits
    /// it as VEHICLE_PHOTO UPDATE, recording the preset it replaced in previous.
    /// </summary>
    public PhotoItem Enhance(long vehicleId, long photoId, PhotoPreset preset)
    {
        var tenant = RequireVehicle(vehicleId);
        var photo = Load(photoId, vehicleId, tenant);
        byte[] enhanced;
        try
        {
            enhanced = _enhancer.Enhance(photo.OriginalData, preset);
        }
        catch (ApiException ex)
        {
            _logger.LogWarning(
                "Vehicle photo enhancement rejected photoId={PhotoId} vehicleId={VehicleId} preset={Preset} code={Code}",
                photoId, vehicleId, preset, ex.Code);
            throw;
        }
        var previousPreset = photo.Enhancement;
        photo.EnhancedData = enhanced;
        photo.Enhancement = preset;

        _audit.Record("VEHICLE_PHOTO", photo.Id, "UPDATE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["vehicleId"] = vehicleId, ["enhancement"] = preset.ToString() },
            new Dictionary<string, object?> { ["enhancement"] = previousPreset?.ToString() });
        _db.SaveChanges();
        _logger.LogInformation(
            "Vehicle photo enhanced photoId={PhotoId} vehicleId={VehicleId} preset={Preset} previousPreset={PreviousPreset} bytes={Bytes} by {Actor}",
            photo.Id, vehicleId, preset, previousPreset, enhanced.Length, TenantContext.ActorUsername());
        return ToItem(photo);
    }

    /// <summary>Deletes a photo and both its variants, auditing it as VEHICLE_PHOTO DELETE.</summary>
    public void Delete(long vehicleId, long photoId)
    {
        var tenant = RequireVehicle(vehicleId);
        var photo = Load(photoId, vehicleId, tenant);
        _db.VehiclePhotos.Remove(photo);
        _audit.Record("VEHICLE_PHOTO", photoId, "DELETE", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object> { ["vehicleId"] = vehicleId });
        _db.SaveChanges();
        _logger.LogInformation(
            "Vehicle photo deleted photoId={PhotoId} vehicleId={VehicleId} dealerId={DealerId} bytes={Bytes} by {Actor}",
            photoId, vehicleId, tenant, photo.OriginalData.Length, TenantContext.ActorUsername());
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


    // MySQL returns DATETIME values without a kind; they are stored in UTC (contract §1.3).
    private static PhotoItem ToItem(VehiclePhotoEntity p) =>
        new(p.Id, p.VehicleId, p.ContentType, p.Enhancement, p.UploadedBy,
            DateTime.SpecifyKind(p.CreatedAt, DateTimeKind.Utc));
}
