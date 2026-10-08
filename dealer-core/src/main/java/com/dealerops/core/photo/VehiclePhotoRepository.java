package com.dealerops.core.photo;

import com.dealerops.core.photo.dto.PhotoItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VehiclePhotoRepository extends JpaRepository<VehiclePhotoEntity, Long> {

  Optional<VehiclePhotoEntity> findByIdAndVehicleIdAndDealerId(Long id, Long vehicleId, Long dealerId);

  long countByVehicleIdAndDealerId(Long vehicleId, Long dealerId);

  boolean existsByIdAndDealerId(Long id, Long dealerId);

  /** Metadata only, so listing never loads the image bytes. */
  @Query(
      """
      select new com.dealerops.core.photo.dto.PhotoItem(
        p.id, p.vehicleId, p.contentType, p.enhancement, p.uploadedBy, p.createdAt)
      from VehiclePhotoEntity p
      where p.vehicleId = :vehicleId and p.dealerId = :dealerId
      order by p.createdAt asc, p.id asc
      """)
  List<PhotoItem> listItems(@Param("vehicleId") Long vehicleId, @Param("dealerId") Long dealerId);
}
