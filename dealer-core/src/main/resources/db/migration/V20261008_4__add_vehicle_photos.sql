-- Image Studio vehicle photos (design/21-Feature-Extensions.md §6). The original is never changed.
CREATE TABLE vehicle_photo (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  content_type VARCHAR(32) NOT NULL,
  original_data MEDIUMBLOB NOT NULL,
  enhanced_data MEDIUMBLOB NULL,
  enhancement VARCHAR(16) NULL,
  uploaded_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vehicle_photo_vehicle (dealer_id, vehicle_id),
  CONSTRAINT fk_vehicle_photo_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_vehicle_photo_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);
