package com.dealerops.core.photo;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.photo.dto.PhotoItem;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.vehicle.VehicleRepository;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

/** Image Studio: vehicle photos and their enhanced copies (design/21-Feature-Extensions.md §6). */
@Service
public class VehiclePhotoService {

  /** Enhanced copies are always written as JPEG. */
  public static final String ENHANCED_CONTENT_TYPE = "image/jpeg";

  private final VehiclePhotoRepository photoRepository;
  private final VehicleRepository vehicleRepository;
  private final PhotoEnhancer enhancer;
  private final AuditService auditService;
  private final long maxBytes;
  private final int maxPerVehicle;

  public VehiclePhotoService(
      VehiclePhotoRepository photoRepository,
      VehicleRepository vehicleRepository,
      PhotoEnhancer enhancer,
      AuditService auditService,
      @Value("${spring.servlet.multipart.max-file-size}") DataSize maxFileSize,
      @Value("${dealerops.photos.max-per-vehicle:10}") int maxPerVehicle) {
    this.photoRepository = photoRepository;
    this.vehicleRepository = vehicleRepository;
    this.enhancer = enhancer;
    this.auditService = auditService;
    this.maxBytes = maxFileSize.toBytes();
    this.maxPerVehicle = maxPerVehicle;
  }

  @Transactional(readOnly = true)
  public List<PhotoItem> list(Long vehicleId) {
    Long tenant = requireVehicle(vehicleId);
    return photoRepository.listItems(vehicleId, tenant);
  }

  @Transactional
  public PhotoItem upload(Long vehicleId, MultipartFile file) {
    Long tenant = requireVehicle(vehicleId);
    if (file == null || file.isEmpty()) {
      throw new ApiException(ErrorCode.VALIDATION, "Choose a photo to upload.");
    }
    if (file.getSize() > maxBytes) {
      throw new ApiException(ErrorCode.VALIDATION, tooLargeMessage(maxBytes));
    }
    if (photoRepository.countByVehicleIdAndDealerId(vehicleId, tenant) >= maxPerVehicle) {
      throw new ApiException(
          ErrorCode.VALIDATION, "A vehicle can have at most " + maxPerVehicle + " photos.");
    }
    byte[] data = read(file);
    VehiclePhotoEntity photo = new VehiclePhotoEntity();
    photo.setDealerId(tenant);
    photo.setVehicleId(vehicleId);
    photo.setContentType(enhancer.detectContentType(data));
    photo.setOriginalData(data);
    photo.setUploadedBy(actorUsername());
    photo = photoRepository.save(photo);
    audit(photo.getId(), AuditAction.CREATE, tenant, Map.of("vehicleId", vehicleId));
    return toItem(photo);
  }

  /** Returns the photo; the caller picks the original or the enhanced bytes. */
  @Transactional(readOnly = true)
  public VehiclePhotoEntity content(Long vehicleId, Long photoId) {
    Long tenant = requireVehicle(vehicleId);
    return load(photoId, vehicleId, tenant);
  }

  @Transactional
  public PhotoItem enhance(Long vehicleId, Long photoId, PhotoPreset preset) {
    Long tenant = requireVehicle(vehicleId);
    VehiclePhotoEntity photo = load(photoId, vehicleId, tenant);
    photo.setEnhancedData(enhancer.enhance(photo.getOriginalData(), preset));
    photo.setEnhancement(preset);
    photo = photoRepository.save(photo);
    audit(photo.getId(), AuditAction.UPDATE, tenant, Map.of("vehicleId", vehicleId, "enhancement", preset.name()));
    return toItem(photo);
  }

  @Transactional
  public void delete(Long vehicleId, Long photoId) {
    Long tenant = requireVehicle(vehicleId);
    VehiclePhotoEntity photo = load(photoId, vehicleId, tenant);
    photoRepository.delete(photo);
    audit(photoId, AuditAction.DELETE, tenant, Map.of("vehicleId", vehicleId));
  }

  private VehiclePhotoEntity load(Long photoId, Long vehicleId, Long tenant) {
    return photoRepository
        .findByIdAndVehicleIdAndDealerId(photoId, vehicleId, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  /** Another dealership's vehicle id is 404, as for every vehicle endpoint. */
  private Long requireVehicle(Long vehicleId) {
    TenantGuard.requireDealerUser();
    Long tenant = TenantContext.get().tenantDealerId();
    if (vehicleRepository.findByIdAndDealerId(vehicleId, tenant).isEmpty()) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }
    return tenant;
  }

  private static byte[] read(MultipartFile file) {
    try {
      return file.getBytes();
    } catch (IOException ex) {
      throw new ApiException(ErrorCode.VALIDATION, "Could not read the photo.");
    }
  }

  /** Shared with the multipart size-limit handler so both paths return the same copy. */
  public static String tooLargeMessage(long maxBytes) {
    return "Photo must be " + DataSize.ofBytes(maxBytes).toMegabytes() + " MB or smaller.";
  }

  private void audit(Long photoId, AuditAction action, Long tenant, Map<String, Object> fields) {
    auditService.record(EntityType.VEHICLE_PHOTO.name(), photoId, action.name(), tenant, actorUsername(), fields);
  }

  private static PhotoItem toItem(VehiclePhotoEntity photo) {
    return new PhotoItem(
        photo.getId(),
        photo.getVehicleId(),
        photo.getContentType(),
        photo.getEnhancement(),
        photo.getUploadedBy(),
        photo.getCreatedAt());
  }

  private static String actorUsername() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.username();
  }
}
