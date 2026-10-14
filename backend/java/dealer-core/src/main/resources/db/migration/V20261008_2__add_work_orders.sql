-- Reconditioning work orders (design/21-Feature-Extensions.md §4).
CREATE TABLE work_order (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  task VARCHAR(200) NOT NULL,
  assignee_username VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL,
  due_on DATE NULL,
  cost DECIMAL(12,2) NULL,
  completion_note VARCHAR(500) NULL,
  completed_on DATE NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_work_order_vehicle (dealer_id, vehicle_id, status),
  CONSTRAINT fk_work_order_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_work_order_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);
