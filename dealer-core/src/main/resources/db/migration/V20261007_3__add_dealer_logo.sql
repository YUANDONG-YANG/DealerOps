-- Optional dealership logo, stored as a downscaled image data URL (design/14-Backend-API-Contract.md §3.4).
ALTER TABLE dealer
  ADD COLUMN logo_data_url MEDIUMTEXT NULL;
