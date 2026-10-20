package com.dealerops.core.photo;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.photo.dto.EnhancePhotoRequest;
import com.dealerops.core.photo.dto.PhotoItem;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Image Studio photos of one vehicle (design/21-Feature-Extensions.md §6). */
@RestController
@RequestMapping("/api/v1/vehicles/{vehicleId}/photos")
public class VehiclePhotoController {

  private final VehiclePhotoService photoService;

  public VehiclePhotoController(VehiclePhotoService photoService) {
    this.photoService = photoService;
  }

  @GetMapping
  public List<PhotoItem> list(@PathVariable Long vehicleId) {
    return photoService.list(vehicleId);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public PhotoItem upload(@PathVariable Long vehicleId, @RequestPart("file") MultipartFile file) {
    return photoService.upload(vehicleId, file);
  }

  @GetMapping("/{photoId}/content")
  public ResponseEntity<byte[]> content(
      @PathVariable Long vehicleId,
      @PathVariable Long photoId,
      @RequestParam(defaultValue = "original") String variant) {
    VehiclePhotoEntity photo = photoService.content(vehicleId, photoId);
    byte[] body;
    String type;
    switch (variant) {
      case "original" -> {
        body = photo.getOriginalData();
        type = photo.getContentType();
      }
      case "enhanced" -> {
        if (photo.getEnhancedData() == null) {
          throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
        }
        body = photo.getEnhancedData();
        type = VehiclePhotoService.ENHANCED_CONTENT_TYPE;
      }
      default -> throw new ApiException(ErrorCode.VALIDATION, "Variant must be original or enhanced.");
    }
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(type))
        .cacheControl(CacheControl.noStore())
        .body(body);
  }

  @PostMapping("/{photoId}/enhance")
  public PhotoItem enhance(
      @PathVariable Long vehicleId,
      @PathVariable Long photoId,
      @Valid @RequestBody EnhancePhotoRequest body) {
    return photoService.enhance(vehicleId, photoId, body.preset());
  }

  @DeleteMapping("/{photoId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long vehicleId, @PathVariable Long photoId) {
    photoService.delete(vehicleId, photoId);
  }
}
