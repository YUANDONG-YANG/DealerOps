-- Lead follow-up (design/21-Feature-Extensions.md §3). LEAD is a reserved word in MySQL 8.
CREATE TABLE sales_lead (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  vehicle_id BIGINT NULL,
  owner_username VARCHAR(64) NULL,
  stage VARCHAR(16) NOT NULL,
  next_follow_up_on DATE NULL,
  lost_reason VARCHAR(300) NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lead_dealer_stage (dealer_id, stage),
  CONSTRAINT fk_lead_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_lead_customer FOREIGN KEY (customer_id) REFERENCES customer(id),
  CONSTRAINT fk_lead_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id)
);

CREATE TABLE sales_lead_note (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  lead_id BIGINT NOT NULL,
  author_username VARCHAR(64) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lead_note_lead (lead_id),
  CONSTRAINT fk_lead_note_dealer FOREIGN KEY (dealer_id) REFERENCES dealer(id),
  CONSTRAINT fk_lead_note_lead FOREIGN KEY (lead_id) REFERENCES sales_lead(id)
);
