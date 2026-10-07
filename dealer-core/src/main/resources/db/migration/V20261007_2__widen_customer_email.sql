-- Customer email allows up to 254 characters (requirements/analysis/03-CRM-Customers.md, field 2).
ALTER TABLE customer
  MODIFY COLUMN email VARCHAR(254) NOT NULL;
