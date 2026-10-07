CREATE TABLE dealer (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  legal_name VARCHAR(200) NOT NULL,
  contact_phone VARCHAR(40) NOT NULL,
  contact_email VARCHAR(120) NOT NULL,
  contact_address VARCHAR(300) NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE app_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(32) NOT NULL,
  dealer_id BIGINT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_username (username),
  CONSTRAINT fk_user_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id)
);

CREATE TABLE membership (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  username VARCHAR(64) NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_membership (dealer_id, username),
  CONSTRAINT fk_mem_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id)
);

CREATE TABLE vehicle (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  vin VARCHAR(32) NOT NULL,
  make VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  model_year INT NOT NULL,
  source VARCHAR(32) NOT NULL,
  purchase_cost DECIMAL(12,2) NOT NULL,
  added_on DATE NOT NULL,
  condition_code VARCHAR(24) NOT NULL,
  repair_cost DECIMAL(12,2) NULL,
  carfax_url VARCHAR(500) NULL,
  sold_on DATE NULL,
  sold_price DECIMAL(12,2) NULL,
  status VARCHAR(16) NOT NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_vehicle_vin (dealer_id, vin),
  CONSTRAINT fk_vehicle_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id)
);

CREATE TABLE customer (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  home_address VARCHAR(300) NOT NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id)
);

CREATE TABLE customer_vehicle (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cv_vehicle (vehicle_id),
  CONSTRAINT fk_cv_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_cv_customer FOREIGN KEY (customer_id) REFERENCES customer(id),
  CONSTRAINT fk_cv_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);

CREATE TABLE listing (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  ad_kind VARCHAR(16) NOT NULL,
  medium VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  content_version INT NOT NULL DEFAULT 1,
  last_check_id BIGINT NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_listing_vehicle (vehicle_id),
  CONSTRAINT fk_listing_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_listing_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);

CREATE TABLE compliance_check (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  listing_id BIGINT NOT NULL,
  content_version INT NOT NULL,
  rule_findings JSON NOT NULL,
  ai_status VARCHAR(24) NOT NULL,
  ai_notes JSON NULL,
  recommendation VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_check_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_check_listing FOREIGN KEY (listing_id) REFERENCES listing(id)
);

CREATE TABLE audit_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NULL,
  actor_username VARCHAR(64) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id BIGINT NOT NULL,
  action VARCHAR(32) NOT NULL,
  field_summary JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_entity (entity_type, entity_id)
);
