-- DealerOps demo seed: vehicle inventory (120 vehicles across 30 dealerships).
-- Source, condition, status and dates come from contract/vehicles-plan.json.
-- Identity, model year, trim, mileage and asking price are real Ontario Kijiji listings
-- (contract/kijiji-snapshot.json, kijiji_url in contract/vehicles-plan.json). Derived values:
--   purchase_cost = wholesale acquisition (about 72-82% of the asking price for CERTIFIED, 60-72% for
--   AS_IS, 30-42% for UNFIT, parts value $500-$3,000 for IRREPARABLE);
--   sold_price = within a few percent of the asking price for the condition at the time of sale.
-- Carfax links use the CARFAX Canada report-link format (https://vhr.carfax.ca/?id=...);
-- the tokens are synthetic and do not resolve to real reports.
-- Timestamps are UTC (dealer-local business hours, America/Toronto).

SET NAMES utf8mb4;

SET @d01 = (SELECT id FROM dealer WHERE contact_email = 'sales@lakeshoreautosales.ca');
SET @d02 = (SELECT id FROM dealer WHERE contact_email = 'sales@northgatemotors.ca');
SET @d03 = (SELECT id FROM dealer WHERE contact_email = 'sales@mapleleafpreowned.ca');
SET @d04 = (SELECT id FROM dealer WHERE contact_email = 'sales@trilliumcarcentre.ca');
SET @d05 = (SELECT id FROM dealer WHERE contact_email = 'sales@huronvalleyauto.ca');
SET @d06 = (SELECT id FROM dealer WHERE contact_email = 'sales@carlingavenuemotors.ca');
SET @d07 = (SELECT id FROM dealer WHERE contact_email = 'sales@riversideautogroup.ca');
SET @d08 = (SELECT id FROM dealer WHERE contact_email = 'sales@baystreetautos.ca');
SET @d09 = (SELECT id FROM dealer WHERE contact_email = 'sales@kingswaycarcompany.ca');
SET @d10 = (SELECT id FROM dealer WHERE contact_email = 'sales@limestonecitymotors.ca');
SET @d11 = (SELECT id FROM dealer WHERE contact_email = 'sales@goldenhorseshoeauto.ca');
SET @d12 = (SELECT id FROM dealer WHERE contact_email = 'sales@royaloakautosales.ca');
SET @d13 = (SELECT id FROM dealer WHERE contact_email = 'sales@escarpmentmotors.ca');
SET @d14 = (SELECT id FROM dealer WHERE contact_email = 'sales@pinecrestautosales.ca');
SET @d15 = (SELECT id FROM dealer WHERE contact_email = 'sales@thamesvalleymotors.ca');
SET @d16 = (SELECT id FROM dealer WHERE contact_email = 'sales@grandriverauto.ca');
SET @d17 = (SELECT id FROM dealer WHERE contact_email = 'sales@ambassadorautosales.ca');
SET @d18 = (SELECT id FROM dealer WHERE contact_email = 'sales@simcoecountymotors.ca');
SET @d19 = (SELECT id FROM dealer WHERE contact_email = 'sales@lakeviewpreowned.ca');
SET @d20 = (SELECT id FROM dealer WHERE contact_email = 'sales@canalstreetauto.ca');
SET @d21 = (SELECT id FROM dealer WHERE contact_email = 'sales@northernlightsmotors.ca');
SET @d22 = (SELECT id FROM dealer WHERE contact_email = 'sales@rideauautocentre.ca');
SET @d23 = (SELECT id FROM dealer WHERE contact_email = 'sales@crossroadscarsales.ca');
SET @d24 = (SELECT id FROM dealer WHERE contact_email = 'sales@eastgateautomart.ca');
SET @d25 = (SELECT id FROM dealer WHERE contact_email = 'sales@westsidemotorco.ca');
SET @d26 = (SELECT id FROM dealer WHERE contact_email = 'sales@highlandautosales.ca');
SET @d27 = (SELECT id FROM dealer WHERE contact_email = 'sales@brockstreetmotors.ca');
SET @d28 = (SELECT id FROM dealer WHERE contact_email = 'sales@heritageautosales.ca');
SET @d29 = (SELECT id FROM dealer WHERE contact_email = 'sales@summitautogroup.ca');
SET @d30 = (SELECT id FROM dealer WHERE contact_email = 'sales@parkwaymotors.ca');

INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d01, '3MZBM1L75FM193583', 'Mazda', 'Mazda3', 2015, 'HATCHBACK', 'OTHER', 'CERTIFIED', 9175.00, 1843.86, 'https://vhr.carfax.ca/?id=TL92HoHrdkUWZOVWOPPdRaV5MEwKAQP8', '2026-01-05', 'SOLD', '2026-02-14', 12395.00, 1, '2026-01-05 19:37:25', '2026-02-14 21:07:27'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d01 AND vin = '3MZBM1L75FM193583');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d01, '3GCUKREC5JG425679', 'Chevrolet', 'Silverado 1500', 2018, 'TRUCK', 'AUCTION', 'AS_IS', 18200.00, NULL, NULL, '2026-08-25', 'IN_STOCK', NULL, NULL, 0, '2026-08-25 20:14:35', '2026-08-25 20:14:35'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d01 AND vin = '3GCUKREC5JG425679');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d01, '1FMCU9H60MUA41107', 'Ford', 'Escape', 2021, 'SUV', 'PRIVATE_PURCHASE', 'CERTIFIED', 13100.00, 681.80, 'https://vhr.carfax.ca/?id=jYf4YW0zCEes8i3hkWtOvOhDwMMOd4eu', '2026-01-26', 'IN_STOCK', NULL, NULL, 0, '2026-01-26 15:22:04', '2026-01-26 15:22:04'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d01 AND vin = '1FMCU9H60MUA41107');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d01, '5YJ3E1EA0PF402327', 'Tesla', 'Model 3', 2023, 'SEDAN', 'PRIVATE_PURCHASE', 'CERTIFIED', 19100.00, 1218.26, NULL, '2026-01-21', 'IN_STOCK', NULL, NULL, 0, '2026-01-21 20:59:32', '2026-01-21 20:59:32'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d01 AND vin = '5YJ3E1EA0PF402327');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d02, '3TYGZ5AN6PT156924', 'Toyota', 'Tacoma', 2023, 'TRUCK', 'TRADE_IN', 'CERTIFIED', 38775.00, 1736.84, 'https://vhr.carfax.ca/?id=V0MCMvn0E6P5bCF4ezYBcR51RtS9PA6f', '2026-05-22', 'IN_STOCK', NULL, NULL, 0, '2026-05-22 20:47:59', '2026-05-22 20:47:59'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d02 AND vin = '3TYGZ5AN6PT156924');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d02, '7MMVABCM7RN233189', 'Mazda', 'CX-5', 2024, 'SUV', 'PRIVATE_PURCHASE', 'AS_IS', 24450.00, 546.46, 'https://vhr.carfax.ca/?id=n1xYwabAd83nHSpLcNKUoJlBQt75mEfP', '2026-03-27', 'SOLD', '2026-10-08', 31495.00, 1, '2026-03-27 16:06:00', '2026-10-08 17:44:11'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d02 AND vin = '7MMVABCM7RN233189');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d02, '3VW6T7BU9KM162376', 'Volkswagen', 'Jetta', 2019, 'SEDAN', 'TRADE_IN', 'UNFIT', 8100.00, 3827.13, NULL, '2026-06-02', 'IN_STOCK', NULL, NULL, 0, '2026-06-02 13:08:47', '2026-06-02 13:08:47'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d02 AND vin = '3VW6T7BU9KM162376');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d02, 'WMWXR3C0XM2N97912', 'Mini', 'Cooper', 2021, 'HATCHBACK', 'AUCTION', 'CERTIFIED', 16250.00, 1942.43, 'https://vhr.carfax.ca/?id=BJmUzgQ2Zk2QdQ6YaPilZlXqzx6J0xCO', '2026-07-22', 'IN_STOCK', NULL, NULL, 0, '2026-07-22 18:34:15', '2026-07-22 18:34:15'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d02 AND vin = 'WMWXR3C0XM2N97912');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d03, 'KMHLM4AG0MU194544', 'Hyundai', 'Elantra', 2021, 'SEDAN', 'AUCTION', 'CERTIFIED', 14175.00, 1734.22, NULL, '2026-01-11', 'IN_STOCK', NULL, NULL, 0, '2026-01-11 20:47:09', '2026-01-11 20:47:09'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d03 AND vin = 'KMHLM4AG0MU194544');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d03, '3GNAXUEV6NL221700', 'Chevrolet', 'Equinox', 2022, 'SUV', 'TRADE_IN', 'CERTIFIED', 16725.00, 2354.76, 'https://vhr.carfax.ca/?id=SgxG9FBhLNtF5gc17kyg7aNZ1Pceb9PT', '2026-06-19', 'IN_STOCK', NULL, NULL, 0, '2026-06-19 15:49:18', '2026-06-19 15:49:18'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d03 AND vin = '3GNAXUEV6NL221700');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d03, '3KPF34AD4PE666077', 'Kia', 'Forte', 2023, 'SEDAN', 'TRADE_IN', 'CERTIFIED', 13700.00, 1501.91, 'https://vhr.carfax.ca/?id=Aqmw9uVwzz7arxfIKzMzcgzdB2FmKMXd', '2026-09-11', 'IN_STOCK', NULL, NULL, 0, '2026-09-11 19:01:59', '2026-09-11 19:01:59'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d03 AND vin = '3KPF34AD4PE666077');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d03, '1FTEW1E58LKE53452', 'Ford', 'F-150', 2020, 'TRUCK', 'TRADE_IN', 'CERTIFIED', 17550.00, NULL, 'https://vhr.carfax.ca/?id=krE7jWti7PrelTNyBqrXlOnGZvHWHjHM', '2026-01-09', 'IN_STOCK', NULL, NULL, 0, '2026-01-09 22:40:15', '2026-01-09 22:40:15'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d03 AND vin = '1FTEW1E58LKE53452');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d04, '3VWGM7BU7RM082991', 'Volkswagen', 'Jetta', 2024, 'SEDAN', 'PRIVATE_PURCHASE', 'AS_IS', 16575.00, NULL, 'https://vhr.carfax.ca/?id=ykHVsJ1Ewtyv9iZexkUWdtuwfRBQDjdH', '2026-09-21', 'IN_STOCK', NULL, NULL, 0, '2026-09-21 21:11:03', '2026-09-21 21:11:03'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d04 AND vin = '3VWGM7BU7RM082991');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d04, '1G1ZF5SUXJF193588', 'Chevrolet', 'Malibu', 2018, 'SEDAN', 'AUCTION', 'AS_IS', 5325.00, 239.11, 'https://vhr.carfax.ca/?id=8XRtIkQZtXrln9wpE86xDpaCBcAiJITw', '2026-05-28', 'IN_STOCK', NULL, NULL, 0, '2026-05-28 20:44:58', '2026-05-28 20:44:58'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d04 AND vin = '1G1ZF5SUXJF193588');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d04, '5NMP3DGL5RH001123', 'Hyundai', 'Santa Fe', 2024, 'SUV', 'AUCTION', 'AS_IS', 26750.00, NULL, 'https://vhr.carfax.ca/?id=OpzpnOq85sDUYTkayAQpHsM9ddkrPYyq', '2026-04-25', 'IN_STOCK', NULL, NULL, 0, '2026-04-25 13:13:26', '2026-04-25 13:13:26'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d04 AND vin = '5NMP3DGL5RH001123');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d04, '4T1DAACK5SU040700', 'Toyota', 'Camry', 2025, 'SEDAN', 'TRADE_IN', 'AS_IS', 21100.00, 0.00, NULL, '2026-05-28', 'SOLD', '2026-08-24', 29295.00, 1, '2026-05-28 18:48:36', '2026-08-24 20:06:47'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d04 AND vin = '4T1DAACK5SU040700');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d05, 'WA15AAGU0S2125437', 'Audi', 'Q5', 2025, 'SUV', 'TRADE_IN', 'AS_IS', 37850.00, NULL, NULL, '2025-12-20', 'IN_STOCK', NULL, NULL, 0, '2025-12-20 15:16:07', '2025-12-20 15:16:07'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d05 AND vin = 'WA15AAGU0S2125437');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d05, '3VV8B7AX9PM007636', 'Volkswagen', 'Tiguan', 2023, 'SUV', 'AUCTION', 'CERTIFIED', 19200.00, 1909.03, 'https://vhr.carfax.ca/?id=mwOe2kHd3AYJabw0NfnZoeYJkSLZt1BT', '2026-02-24', 'SOLD', '2026-08-03', 24595.00, 1, '2026-02-24 15:40:19', '2026-08-03 16:15:47'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d05 AND vin = '3VV8B7AX9PM007636');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d05, '5N1AT2MT1FC885548', 'Nissan', 'Rogue', 2015, 'SUV', 'TRADE_IN', 'AS_IS', 6725.00, 250.48, 'https://vhr.carfax.ca/?id=tuxshw3UQNKl9Xc0e5NBn9MtROl48ipH', '2026-08-06', 'SOLD', '2026-08-23', 8400.00, 1, '2026-08-06 14:01:37', '2026-08-23 16:53:27'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d05 AND vin = '5N1AT2MT1FC885548');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d05, '5NMS3DAJ0MH316230', 'Hyundai', 'Santa Fe', 2021, 'SUV', 'TRADE_IN', 'CERTIFIED', 13450.00, 1706.81, 'https://vhr.carfax.ca/?id=FcusmNAAHb5SVU3STtEaxe0xgFWHSIfp', '2026-09-22', 'IN_STOCK', NULL, NULL, 0, '2026-09-22 21:03:09', '2026-09-22 21:03:09'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d05 AND vin = '5NMS3DAJ0MH316230');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d06, '2T3B1RFV8MC183809', 'Toyota', 'RAV4', 2021, 'SUV', 'AUCTION', 'CERTIFIED', 20275.00, 1778.58, 'https://vhr.carfax.ca/?id=U0207uIaF3PXiqlY7O0GIWYBRZoKpq7s', '2026-07-21', 'SOLD', '2026-08-21', 28400.00, 1, '2026-07-21 13:30:35', '2026-08-21 21:25:54'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d06 AND vin = '2T3B1RFV8MC183809');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d06, '5FNRL6H44LB501598', 'Honda', 'Odyssey', 2020, 'VAN', 'TRADE_IN', 'AS_IS', 22575.00, NULL, 'https://vhr.carfax.ca/?id=vJBWC3YSOrjY0gcqDBGFSgw4ZV4tWPYw', '2026-09-04', 'IN_STOCK', NULL, NULL, 0, '2026-09-04 18:15:35', '2026-09-04 18:15:35'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d06 AND vin = '5FNRL6H44LB501598');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d06, 'WA1EAAFY8N2095595', 'Audi', 'Q5', 2022, 'SUV', 'AUCTION', 'AS_IS', 17050.00, 357.19, 'https://vhr.carfax.ca/?id=QARbxkKV1sg4jp7EeV9wCDjMXIQJVqIw', '2026-03-27', 'SOLD', '2026-04-21', 23795.00, 1, '2026-03-27 16:54:40', '2026-04-21 16:55:51'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d06 AND vin = 'WA1EAAFY8N2095595');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d06, '1FTEW1EB5JFD63803', 'Ford', 'F-150', 2018, 'TRUCK', 'AUCTION', 'CERTIFIED', 13650.00, 1585.65, NULL, '2025-11-28', 'IN_STOCK', NULL, NULL, 0, '2025-11-28 19:37:26', '2025-11-28 19:37:26'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d06 AND vin = '1FTEW1EB5JFD63803');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d07, '3VV4B7AX7NM176503', 'Volkswagen', 'Tiguan', 2022, 'SUV', 'AUCTION', 'AS_IS', 20250.00, 895.68, 'https://vhr.carfax.ca/?id=25ijctc6G0PVZSzrXojZfHdocth8K5ln', '2026-09-15', 'SOLD', '2026-10-05', 27895.00, 1, '2026-09-15 16:33:59', '2026-10-05 13:26:22'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d07 AND vin = '3VV4B7AX7NM176503');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d07, 'KNDPUCDF7S7414552', 'Kia', 'Sportage', 2025, 'SUV', 'TRADE_IN', 'AS_IS', 18750.00, NULL, NULL, '2026-02-19', 'IN_STOCK', NULL, NULL, 0, '2026-02-19 18:06:05', '2026-02-19 18:06:05'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d07 AND vin = 'KNDPUCDF7S7414552');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d07, '2GCUDEED2P1129760', 'Chevrolet', 'Silverado 1500', 2023, 'TRUCK', 'AUCTION', 'AS_IS', 26050.00, 0.00, 'https://vhr.carfax.ca/?id=dWs0kWTcm6KKaLFDJoACcgZAy73c2QBD', '2025-12-06', 'IN_STOCK', NULL, NULL, 0, '2025-12-06 21:54:49', '2025-12-06 21:54:49'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d07 AND vin = '2GCUDEED2P1129760');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d07, '5NMS3DAJ1PH645619', 'Hyundai', 'Santa Fe', 2023, 'SUV', 'PRIVATE_PURCHASE', 'CERTIFIED', 19775.00, 1970.45, NULL, '2026-04-22', 'SOLD', '2026-04-28', 26695.00, 1, '2026-04-22 17:07:51', '2026-04-28 17:39:01'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d07 AND vin = '5NMS3DAJ1PH645619');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d08, '2HKRW2H93HH117574', 'Honda', 'CR-V', 2017, 'SUV', 'TRADE_IN', 'AS_IS', 11675.00, NULL, 'https://vhr.carfax.ca/?id=QpGyKYV47bQN66L4h1bqOgTSHsPWu7sH', '2026-04-14', 'IN_STOCK', NULL, NULL, 0, '2026-04-14 17:43:37', '2026-04-14 17:43:37'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d08 AND vin = '2HKRW2H93HH117574');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d08, '1N4BL4BW3PN391124', 'Nissan', 'Altima', 2023, 'SEDAN', 'AUCTION', 'CERTIFIED', 16800.00, 994.71, 'https://vhr.carfax.ca/?id=K8kkrtIJF2HCWNQ3zDjip1tGXoZP9fxf', '2026-07-04', 'SOLD', '2026-08-08', 21595.00, 1, '2026-07-04 19:52:46', '2026-08-08 16:36:30'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d08 AND vin = '1N4BL4BW3PN391124');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d08, 'WA1BNAFY5K2117975', 'Audi', 'Q5', 2019, 'SUV', 'AUCTION', 'AS_IS', 12275.00, NULL, 'https://vhr.carfax.ca/?id=C9D0LkoI2brWeF9pPM8fa2TMBT9pDLKO', '2025-12-16', 'IN_STOCK', NULL, NULL, 0, '2025-12-16 16:10:21', '2025-12-16 16:10:21'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d08 AND vin = 'WA1BNAFY5K2117975');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d08, '1FA6P8TH2H5311178', 'Ford', 'Mustang', 2017, 'COUPE', 'TRADE_IN', 'CERTIFIED', 11550.00, 1329.23, NULL, '2026-01-24', 'IN_STOCK', NULL, NULL, 0, '2026-01-24 14:44:13', '2026-01-24 14:44:13'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d08 AND vin = '1FA6P8TH2H5311178');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d09, '1C4RJFAG2MC684492', 'Jeep', 'Grand Cherokee', 2021, 'SUV', 'TRADE_IN', 'CERTIFIED', 19650.00, 555.88, 'https://vhr.carfax.ca/?id=IhgTGkiAo3TbLBq6wG4DIx1d39Ssfogd', '2026-03-18', 'SOLD', '2026-04-18', 24595.00, 1, '2026-03-18 15:07:05', '2026-04-18 13:20:21'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d09 AND vin = '1C4RJFAG2MC684492');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d09, 'WBA3C3C55FK202646', 'BMW', '3 Series', 2015, 'SEDAN', 'OTHER', 'CERTIFIED', 9525.00, NULL, 'https://vhr.carfax.ca/?id=RQDCxFjwpInanah5oGS4X6YjeSmOpVq0', '2026-02-17', 'SOLD', '2026-03-15', 12900.00, 1, '2026-02-17 14:03:27', '2026-03-15 14:07:39'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d09 AND vin = 'WBA3C3C55FK202646');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d09, '4S4BTHJD9L3216900', 'Subaru', 'Outback', 2020, 'SUV', 'TRADE_IN', 'CERTIFIED', 19350.00, 2243.14, 'https://vhr.carfax.ca/?id=EhNANYe1KLQuI6mMu3FBh8s1RI8Ito2g', '2026-08-11', 'SOLD', '2026-10-14', 24395.00, 1, '2026-08-11 17:36:37', '2026-10-14 15:49:53'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d09 AND vin = '4S4BTHJD9L3216900');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d09, 'KNAFX5A88G5623738', 'Kia', 'Forte', 2016, 'SEDAN', 'OTHER', 'CERTIFIED', 7300.00, NULL, 'https://vhr.carfax.ca/?id=WtDsLBRKjfOpGPg7E2ZA3CUO0L4HoMue', '2026-03-10', 'IN_STOCK', NULL, NULL, 0, '2026-03-10 16:33:27', '2026-03-10 16:33:27'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d09 AND vin = 'KNAFX5A88G5623738');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d10, 'JN8BT3AB0RW443555', 'Nissan', 'Rogue', 2024, 'SUV', 'TRADE_IN', 'AS_IS', 16025.00, 885.02, 'https://vhr.carfax.ca/?id=WtdILN3LYoJOtkguli7aX5KBZHl4ULYz', '2026-02-07', 'SOLD', '2026-10-03', 24100.00, 1, '2026-02-07 16:38:11', '2026-10-03 15:33:04'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d10 AND vin = 'JN8BT3AB0RW443555');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d10, '1N4AL3AP9HN349543', 'Nissan', 'Altima', 2017, 'SEDAN', 'OTHER', 'CERTIFIED', 5600.00, 359.26, NULL, '2026-07-13', 'IN_STOCK', NULL, NULL, 0, '2026-07-13 18:51:42', '2026-07-13 18:51:42'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d10 AND vin = '1N4AL3AP9HN349543');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d10, '2GNAXUEV6K6157626', 'Chevrolet', 'Equinox', 2019, 'SUV', 'AUCTION', 'AS_IS', 11425.00, NULL, 'https://vhr.carfax.ca/?id=Nt8VRqc3JExPrwAYak5MxblA9aRihOwv', '2026-04-01', 'IN_STOCK', NULL, NULL, 0, '2026-04-01 13:22:50', '2026-04-01 13:22:50'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d10 AND vin = '2GNAXUEV6K6157626');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d10, '1FA6P8TH3R5103652', 'Ford', 'Mustang', 2024, 'COUPE', 'AUCTION', 'AS_IS', 22000.00, 0.00, 'https://vhr.carfax.ca/?id=qZxRK97VKctR0FLYn74YQ9Ntn3z650iy', '2026-09-02', 'IN_STOCK', NULL, NULL, 0, '2026-09-02 21:49:11', '2026-09-02 21:49:11'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d10 AND vin = '1FA6P8TH3R5103652');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d11, '4T1B11HK7JU029289', 'Toyota', 'Camry', 2018, 'SEDAN', 'PRIVATE_PURCHASE', 'CERTIFIED', 14875.00, 742.08, 'https://vhr.carfax.ca/?id=qV8bH9nPfQ7T9iqXTnbaxumwvzWeqr8d', '2026-06-28', 'IN_STOCK', NULL, NULL, 0, '2026-06-28 15:17:52', '2026-06-28 15:17:52'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d11 AND vin = '4T1B11HK7JU029289');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d11, '1FTFW1E57LKF56334', 'Ford', 'F-150', 2020, 'TRUCK', 'TRADE_IN', 'UNFIT', 9825.00, 3181.04, 'https://vhr.carfax.ca/?id=gtqZasPCawfDImtgn76twbfA7Bn1KARU', '2026-03-01', 'SOLD', '2026-07-14', 20400.00, 1, '2026-03-01 22:02:24', '2026-07-14 18:09:56'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d11 AND vin = '1FTFW1E57LKF56334');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d11, 'WMWXM5C50F3A60360', 'Mini', 'Cooper', 2015, 'HATCHBACK', 'TRADE_IN', 'AS_IS', 5700.00, 699.41, 'https://vhr.carfax.ca/?id=vIOTkJdb6nVdbnn0vv4akL0tbAs6Rsq2', '2026-06-16', 'IN_STOCK', NULL, NULL, 0, '2026-06-16 18:01:50', '2026-06-16 18:01:50'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d11 AND vin = 'WMWXM5C50F3A60360');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d11, '2T1BURHE4HC876282', 'Toyota', 'Corolla', 2017, 'SEDAN', 'TRADE_IN', 'CERTIFIED', 11025.00, 439.74, 'https://vhr.carfax.ca/?id=V96bzpHBk3Z3xQsPY7x8KPEH2uPe6CFZ', '2025-12-29', 'IN_STOCK', NULL, NULL, 0, '2025-12-29 21:18:36', '2025-12-29 21:18:36'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d11 AND vin = '2T1BURHE4HC876282');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d12, '1GCUDDED6RZ242812', 'Chevrolet', 'Silverado 1500', 2024, 'TRUCK', 'AUCTION', 'AS_IS', 28625.00, 564.20, 'https://vhr.carfax.ca/?id=cL2Urof5KssIvAmrNgxvYWVt3SlaNbmR', '2026-08-20', 'IN_STOCK', NULL, NULL, 0, '2026-08-20 18:09:27', '2026-08-20 18:09:27'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d12 AND vin = '1GCUDDED6RZ242812');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d12, '1N4BL4CW2RN406679', 'Nissan', 'Altima', 2024, 'SEDAN', 'AUCTION', 'AS_IS', 20000.00, NULL, NULL, '2026-01-08', 'SOLD', '2026-07-18', 25895.00, 1, '2026-01-08 18:32:43', '2026-07-18 18:32:07'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d12 AND vin = '1N4BL4CW2RN406679');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d12, '2T3B1RFV3RC484270', 'Toyota', 'RAV4', 2024, 'SUV', 'TRADE_IN', 'CERTIFIED', 28500.00, 952.14, 'https://vhr.carfax.ca/?id=c5l4nPBq4Gk8aTLnNUgCfDI58uhRMany', '2026-06-29', 'IN_STOCK', NULL, NULL, 0, '2026-06-29 20:39:38', '2026-06-29 20:39:38'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d12 AND vin = '2T3B1RFV3RC484270');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d12, '5FNRL6H42SB500240', 'Honda', 'Odyssey', 2025, 'VAN', 'PRIVATE_PURCHASE', 'CERTIFIED', 37325.00, 1893.78, NULL, '2026-06-25', 'IN_STOCK', NULL, NULL, 0, '2026-06-25 20:32:04', '2026-06-25 20:32:04'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d12 AND vin = '5FNRL6H42SB500240');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d13, '3VWSM7BUXNM031523', 'Volkswagen', 'Jetta', 2022, 'SEDAN', 'TRADE_IN', 'AS_IS', 15700.00, NULL, NULL, '2026-03-11', 'SOLD', '2026-09-17', 20995.00, 1, '2026-03-11 14:37:13', '2026-09-17 14:22:49'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d13 AND vin = '3VWSM7BUXNM031523');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d13, '1FMCU9J93HUD22487', 'Ford', 'Escape', 2017, 'SUV', 'AUCTION', 'CERTIFIED', 11675.00, 2333.66, NULL, '2026-06-27', 'IN_STOCK', NULL, NULL, 0, '2026-06-27 21:03:52', '2026-06-27 21:03:52'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d13 AND vin = '1FMCU9J93HUD22487');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d13, '2T1BURHE7FC453774', 'Toyota', 'Corolla', 2015, 'SEDAN', 'OTHER', 'CERTIFIED', 10075.00, 978.28, 'https://vhr.carfax.ca/?id=nH9Ff2tPqTRDHx4xJvNcXPmM8cA1inm2', '2026-01-06', 'SOLD', '2026-09-03', 12195.00, 1, '2026-01-06 22:10:46', '2026-09-03 21:09:38'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d13 AND vin = '2T1BURHE7FC453774');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d13, '5FNRL6H67NB502894', 'Honda', 'Odyssey', 2022, 'VAN', 'TRADE_IN', 'CERTIFIED', 28475.00, 2143.54, 'https://vhr.carfax.ca/?id=6utavJoeN3bLHhIoTQMobuUxbczKgvQj', '2025-11-21', 'IN_STOCK', NULL, NULL, 0, '2025-11-21 18:57:18', '2025-11-21 18:57:18'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d13 AND vin = '5FNRL6H67NB502894');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d14, 'JM3KFBDL6H0207454', 'Mazda', 'CX-5', 2017, 'SUV', 'AUCTION', 'AS_IS', 11025.00, 585.27, NULL, '2026-08-12', 'SOLD', '2026-08-31', 16495.00, 1, '2026-08-12 19:20:19', '2026-08-31 14:59:16'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d14 AND vin = 'JM3KFBDL6H0207454');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d14, '1N4AL3AP7JC236935', 'Nissan', 'Altima', 2018, 'SEDAN', 'TRADE_IN', 'CERTIFIED', 10500.00, 1859.48, 'https://vhr.carfax.ca/?id=IRXHvRWDSXOlENM7m4OdbRb4pp2h0X8R', '2026-01-29', 'IN_STOCK', NULL, NULL, 0, '2026-01-29 22:02:17', '2026-01-29 22:02:17'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d14 AND vin = '1N4AL3AP7JC236935');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d14, '3VV2B7AX7LM006064', 'Volkswagen', 'Tiguan', 2020, 'SUV', 'OTHER', 'AS_IS', 14400.00, 213.48, NULL, '2025-12-11', 'SOLD', '2026-03-14', 18595.00, 1, '2025-12-11 20:05:57', '2026-03-14 15:16:57'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d14 AND vin = '3VV2B7AX7LM006064');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d14, '1C4RJHEG4P8765359', 'Jeep', 'Grand Cherokee', 2023, 'SUV', 'TRADE_IN', 'AS_IS', 30025.00, 667.02, 'https://vhr.carfax.ca/?id=5kuwBz3cwAPNMroS2WgsZnL2UOU9DvwF', '2026-07-09', 'IN_STOCK', NULL, NULL, 0, '2026-07-09 15:16:08', '2026-07-09 15:16:08'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d14 AND vin = '1C4RJHEG4P8765359');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d15, '1C4RJHAG6RC112196', 'Jeep', 'Grand Cherokee', 2024, 'SUV', 'PRIVATE_PURCHASE', 'AS_IS', 23100.00, NULL, 'https://vhr.carfax.ca/?id=I1DZk61hclAfWTYAwumwBH04hRbgiFsK', '2026-06-19', 'SOLD', '2026-08-18', 33295.00, 1, '2026-06-19 15:20:07', '2026-08-18 15:56:42'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d15 AND vin = '1C4RJHAG6RC112196');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d15, '1C4HJXDG1PW643254', 'Jeep', 'Wrangler', 2023, 'SUV', 'TRADE_IN', 'CERTIFIED', 28075.00, 1300.84, 'https://vhr.carfax.ca/?id=o67NNgmghkQJnDUl5P5iaaRdynIZgrs7', '2026-01-20', 'SOLD', '2026-09-09', 36795.00, 1, '2026-01-20 14:53:51', '2026-09-09 20:36:41'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d15 AND vin = '1C4HJXDG1PW643254');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d15, '3MW5R7J01L8B23381', 'BMW', '3 Series', 2020, 'SEDAN', 'PRIVATE_PURCHASE', 'AS_IS', 16425.00, NULL, 'https://vhr.carfax.ca/?id=26Gqp8ZOCldKO9h6P30KPBLvnylmzxtM', '2026-08-08', 'IN_STOCK', NULL, NULL, 0, '2026-08-08 16:35:15', '2026-08-08 16:35:15'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d15 AND vin = '3MW5R7J01L8B23381');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d15, '1C6SRFVT0NN277933', 'Ram', '1500', 2022, 'TRUCK', 'TRADE_IN', 'AS_IS', 28075.00, NULL, 'https://vhr.carfax.ca/?id=qP93JmaWahb8rgjhnoOVUuF5pn1F4Ut2', '2026-06-21', 'SOLD', '2026-07-22', 37200.00, 1, '2026-06-21 16:17:24', '2026-07-22 20:15:30'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d15 AND vin = '1C6SRFVT0NN277933');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d16, 'JN8BT3CB5RW178306', 'Nissan', 'Rogue', 2024, 'SUV', 'AUCTION', 'CERTIFIED', 24450.00, 1011.21, 'https://vhr.carfax.ca/?id=9D4gYg1RPygvZ48EuHEWvHRf8iM84khh', '2026-06-01', 'IN_STOCK', NULL, NULL, 0, '2026-06-01 18:01:01', '2026-06-01 18:01:01'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d16 AND vin = 'JN8BT3CB5RW178306');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d16, '1C4AJWAG6GL224317', 'Jeep', 'Wrangler', 2016, 'SUV', 'TRADE_IN', 'AS_IS', 9800.00, NULL, NULL, '2026-03-25', 'SOLD', '2026-07-30', 14095.00, 1, '2026-03-25 19:25:09', '2026-07-30 17:57:09'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d16 AND vin = '1C4AJWAG6GL224317');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d16, '5YFBPMBE4NP322514', 'Toyota', 'Corolla', 2022, 'SEDAN', 'OTHER', 'AS_IS', 14625.00, 0.00, 'https://vhr.carfax.ca/?id=QWT8JUV3CvvoRW71ZnWts7TA3NSj4vYM', '2026-01-06', 'IN_STOCK', NULL, NULL, 0, '2026-01-06 18:08:06', '2026-01-06 18:08:06'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d16 AND vin = '5YFBPMBE4NP322514');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d16, '2T2BZMCA6JC137831', 'Lexus', 'RX 350', 2018, 'SUV', 'TRADE_IN', 'CERTIFIED', 21275.00, NULL, 'https://vhr.carfax.ca/?id=tHTSpF09z4TN4CQTo7pBS0dA3apFw8Zi', '2026-04-16', 'SOLD', '2026-05-17', 26195.00, 1, '2026-04-16 14:16:21', '2026-05-17 20:06:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d16 AND vin = '2T2BZMCA6JC137831');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d17, '2HGFC2F71LH012211', 'Honda', 'Civic', 2020, 'SEDAN', 'OTHER', 'CERTIFIED', 17350.00, 503.32, 'https://vhr.carfax.ca/?id=6IWB4eWVwojFsowuOMjedCI0YujmnrPI', '2026-03-18', 'IN_STOCK', NULL, NULL, 0, '2026-03-18 18:53:19', '2026-03-18 18:53:19'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d17 AND vin = '2HGFC2F71LH012211');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d17, '1C6RR7KT2KS582016', 'Ram', '1500', 2019, 'TRUCK', 'AUCTION', 'UNFIT', 7700.00, 3036.89, 'https://vhr.carfax.ca/?id=v8CIqeggMkNpd5BIleMdJNeGg1XYSD85', '2026-06-08', 'IN_STOCK', NULL, NULL, 0, '2026-06-08 18:15:26', '2026-06-08 18:15:26'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d17 AND vin = '1C6RR7KT2KS582016');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d17, '2GNALBEK7H1564513', 'Chevrolet', 'Equinox', 2017, 'SUV', 'OTHER', 'CERTIFIED', 6400.00, NULL, 'https://vhr.carfax.ca/?id=Oij2VrGe8VcKbJBbb32w9BrFyXjKK3gx', '2026-10-01', 'SOLD', '2026-10-12', 7995.00, 1, '2026-10-01 17:20:33', '2026-10-12 17:37:13'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d17 AND vin = '2GNALBEK7H1564513');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d17, '3KPF54ADXLE214168', 'Kia', 'Forte', 2020, 'SEDAN', 'TRADE_IN', 'AS_IS', 10825.00, 0.00, 'https://vhr.carfax.ca/?id=vPOwC0nW0mJ5Fwti2zzCwoYOLEoaMhnZ', '2026-05-28', 'SOLD', '2026-06-30', 13800.00, 1, '2026-05-28 17:06:33', '2026-06-30 17:38:11'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d17 AND vin = '3KPF54ADXLE214168');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d18, '1FMCU0G93FUB53006', 'Ford', 'Escape', 2015, 'SUV', 'AUCTION', 'UNFIT', 2375.00, 3597.22, 'https://vhr.carfax.ca/?id=atBwimrFwUbZqRTZwRZrEFNPRSeJ5mXc', '2026-01-03', 'SOLD', '2026-02-03', 4300.00, 1, '2026-01-03 14:34:38', '2026-02-03 15:18:43'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d18 AND vin = '1FMCU0G93FUB53006');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d18, 'WVGLV7AX8HK012136', 'Volkswagen', 'Tiguan', 2017, 'SUV', 'OTHER', 'CERTIFIED', 13925.00, 2043.58, 'https://vhr.carfax.ca/?id=Dw8vY0hLZ5iQaPmFoFgwWQ5NBN8fFAtt', '2026-02-13', 'IN_STOCK', NULL, NULL, 0, '2026-02-13 21:35:55', '2026-02-13 21:35:55'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d18 AND vin = 'WVGLV7AX8HK012136');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d18, '1HGCV1F37KA801674', 'Honda', 'Accord', 2019, 'SEDAN', 'AUCTION', 'CERTIFIED', 16000.00, 1090.03, 'https://vhr.carfax.ca/?id=XsXjTOKmwOWt8H30Xyjk092dAh07wBfc', '2026-07-06', 'SOLD', '2026-09-15', 20095.00, 1, '2026-07-06 17:24:15', '2026-09-15 16:19:27'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d18 AND vin = '1HGCV1F37KA801674');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d18, '5NMP4DGL7SH126188', 'Hyundai', 'Santa Fe', 2025, 'SUV', 'AUCTION', 'AS_IS', 27025.00, 652.05, 'https://vhr.carfax.ca/?id=c1zl7uq5YiVO3GPAOJUwH5gNU6hHibWU', '2026-07-31', 'SOLD', '2026-09-09', 36295.00, 1, '2026-07-31 18:17:55', '2026-09-09 16:58:29'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d18 AND vin = '5NMP4DGL7SH126188');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d19, 'KMHLM4DG2RU851525', 'Hyundai', 'Elantra', 2024, 'SEDAN', 'TRADE_IN', 'CERTIFIED', 16800.00, NULL, 'https://vhr.carfax.ca/?id=F5VJPb5xXqJCPzBjd9YJ7BIQ3XFYRdR3', '2025-12-20', 'IN_STOCK', NULL, NULL, 0, '2025-12-20 16:33:19', '2025-12-20 16:33:19'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d19 AND vin = 'KMHLM4DG2RU851525');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d19, '3VWEX7BU2SM062572', 'Volkswagen', 'Jetta', 2025, 'SEDAN', 'PRIVATE_PURCHASE', 'AS_IS', 17025.00, NULL, 'https://vhr.carfax.ca/?id=oCnNRKpXAii6t6sw9e2ACoMbqbX4UIdO', '2026-02-17', 'IN_STOCK', NULL, NULL, 0, '2026-02-17 18:56:42', '2026-02-17 18:56:42'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d19 AND vin = '3VWEX7BU2SM062572');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d19, 'JF1VA1A61G9812611', 'Subaru', 'WRX', 2016, 'SEDAN', 'TRADE_IN', 'UNFIT', 5150.00, 2970.97, 'https://vhr.carfax.ca/?id=P567TCZcA3mfa6iJbPGDrZfVh6qabD0b', '2026-05-01', 'IN_STOCK', NULL, NULL, 0, '2026-05-01 19:34:28', '2026-05-01 19:34:28'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d19 AND vin = 'JF1VA1A61G9812611');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d19, 'WA1EAAFY1M2058693', 'Audi', 'Q5', 2021, 'SUV', 'TRADE_IN', 'CERTIFIED', 19850.00, 1518.21, 'https://vhr.carfax.ca/?id=LzLGR5OTh1wZQxo2niGZLG3XIQQDIJR1', '2026-09-21', 'IN_STOCK', NULL, NULL, 0, '2026-09-21 19:34:48', '2026-09-21 19:34:48'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d19 AND vin = 'WA1EAAFY1M2058693');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d20, '1C4HJXEG8KW629665', 'Jeep', 'Wrangler', 2019, 'SUV', 'PRIVATE_PURCHASE', 'CERTIFIED', 22675.00, 2259.21, 'https://vhr.carfax.ca/?id=fWLHS4zEmrEkmvrUAdITeuqteP8fiFJA', '2026-04-28', 'IN_STOCK', NULL, NULL, 0, '2026-04-28 21:19:27', '2026-04-28 21:19:27'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d20 AND vin = '1C4HJXEG8KW629665');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d20, '1N4BL4BW6RN363093', 'Nissan', 'Altima', 2024, 'SEDAN', 'PRIVATE_PURCHASE', 'CERTIFIED', 17800.00, 2114.63, 'https://vhr.carfax.ca/?id=zHGYyk2sOlgOodifYQKoS5CdQvUdxpJQ', '2026-09-09', 'IN_STOCK', NULL, NULL, 0, '2026-09-09 20:35:35', '2026-09-09 20:35:35'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d20 AND vin = '1N4BL4BW6RN363093');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d20, 'NM0LS7S26M1499303', 'Ford', 'Transit Connect', 2021, 'VAN', 'TRADE_IN', 'CERTIFIED', 19600.00, 594.60, NULL, '2026-09-14', 'IN_STOCK', NULL, NULL, 0, '2026-09-14 13:44:56', '2026-09-14 13:44:56'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d20 AND vin = 'NM0LS7S26M1499303');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d20, '3VW217AU9HM041037', 'Volkswagen', 'Golf', 2017, 'HATCHBACK', 'TRADE_IN', 'CERTIFIED', 10950.00, 838.52, 'https://vhr.carfax.ca/?id=cXhZZPXcEf2nwwpRzjHV0M6xBRMVlqcQ', '2026-03-18', 'IN_STOCK', NULL, NULL, 0, '2026-03-18 15:11:39', '2026-03-18 15:11:39'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d20 AND vin = '3VW217AU9HM041037');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d21, '5N1AT3ABXPC856603', 'Nissan', 'Rogue', 2023, 'SUV', 'TRADE_IN', 'CERTIFIED', 16750.00, 1393.54, NULL, '2026-01-28', 'IN_STOCK', NULL, NULL, 0, '2026-01-28 19:12:41', '2026-01-28 19:12:41'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d21 AND vin = '5N1AT3ABXPC856603');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d21, 'NM0LS7T27P1550911', 'Ford', 'Transit Connect', 2023, 'VAN', 'TRADE_IN', 'CERTIFIED', 26375.00, 1877.62, 'https://vhr.carfax.ca/?id=7EXxaH6hYrUeESbpUbb3GtUzOSSTpAxx', '2026-05-04', 'IN_STOCK', NULL, NULL, 0, '2026-05-04 13:26:07', '2026-05-04 13:26:07'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d21 AND vin = 'NM0LS7T27P1550911');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d21, '1G1ZG5ST1PF161528', 'Chevrolet', 'Malibu', 2023, 'SEDAN', 'TRADE_IN', 'AS_IS', 12150.00, 366.86, 'https://vhr.carfax.ca/?id=MnMYvFAHO9rVwsToZSCJUewhkNXq6Zpb', '2026-07-21', 'SOLD', '2026-09-21', 16300.00, 1, '2026-07-21 14:30:09', '2026-09-21 17:19:25'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d21 AND vin = '1G1ZG5ST1PF161528');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d21, '3TYLB5JN0ST093184', 'Toyota', 'Tacoma', 2025, 'TRUCK', 'PRIVATE_PURCHASE', 'AS_IS', 34600.00, 861.89, 'https://vhr.carfax.ca/?id=Gyw4AZu2L4gGfRAO8Gu6d4oMIwPvoAt4', '2026-03-04', 'SOLD', '2026-04-11', 44795.00, 1, '2026-03-04 15:07:49', '2026-04-11 14:14:57'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d21 AND vin = '3TYLB5JN0ST093184');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d22, '3KPF34AD3PE571560', 'Kia', 'Forte', 2023, 'SEDAN', 'AUCTION', 'UNFIT', 7900.00, 3371.86, NULL, '2025-12-07', 'IN_STOCK', NULL, NULL, 0, '2025-12-07 16:53:08', '2025-12-07 16:53:08'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d22 AND vin = '3KPF34AD3PE571560');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d22, '2T1BURHE9JC993152', 'Toyota', 'Corolla', 2018, 'SEDAN', 'TRADE_IN', 'IRREPARABLE', 1150.00, NULL, 'https://vhr.carfax.ca/?id=rjn7gbgUCGsiQeAkBRRahyRPPCqw9T8I', '2026-04-11', 'IN_STOCK', NULL, NULL, 0, '2026-04-11 14:31:23', '2026-04-11 14:31:23'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d22 AND vin = '2T1BURHE9JC993152');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d22, '1C4RJFAG0JC161743', 'Jeep', 'Grand Cherokee', 2018, 'SUV', 'PRIVATE_PURCHASE', 'CERTIFIED', 12975.00, 1415.26, NULL, '2025-12-09', 'IN_STOCK', NULL, NULL, 0, '2025-12-09 20:15:50', '2025-12-09 20:15:50'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d22 AND vin = '1C4RJFAG0JC161743');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d22, '2T2BAMCA0PC002988', 'Lexus', 'RX 350', 2023, 'SUV', 'PRIVATE_PURCHASE', 'AS_IS', 31825.00, 401.62, 'https://vhr.carfax.ca/?id=vtUcvwry1egV8tO491XzXvSTMkbXgLkD', '2025-12-30', 'IN_STOCK', NULL, NULL, 0, '2025-12-30 18:32:24', '2025-12-30 18:32:24'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d22 AND vin = '2T2BAMCA0PC002988');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d23, 'WMWWH9C54H3A78158', 'Mini', 'Cooper', 2017, 'HATCHBACK', 'TRADE_IN', 'AS_IS', 15950.00, NULL, 'https://vhr.carfax.ca/?id=NcMMAXwq34OQJM8IBKkY4d6Y3u2zIaON', '2026-07-04', 'SOLD', '2026-08-07', 20900.00, 1, '2026-07-04 19:36:30', '2026-08-07 20:13:38'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d23 AND vin = 'WMWWH9C54H3A78158');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d23, '5YFBPRBE7LP050387', 'Toyota', 'Corolla', 2020, 'SEDAN', 'TRADE_IN', 'AS_IS', 13575.00, NULL, 'https://vhr.carfax.ca/?id=DH5DnROSqL5K5DVOsEWQcksD73IZNM29', '2025-12-18', 'SOLD', '2026-08-11', 20095.00, 1, '2025-12-18 17:39:39', '2026-08-11 13:19:36'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d23 AND vin = '5YFBPRBE7LP050387');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d23, '4T1B21HK1JU500446', 'Toyota', 'Camry', 2018, 'SEDAN', 'PRIVATE_PURCHASE', 'AS_IS', 11975.00, 0.00, NULL, '2026-03-29', 'SOLD', '2026-09-19', 17600.00, 1, '2026-03-29 16:32:57', '2026-09-19 16:12:01'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d23 AND vin = '4T1B21HK1JU500446');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d23, 'W1KAF4HB4PR089194', 'Mercedes-Benz', 'C-Class', 2023, 'SEDAN', 'PRIVATE_PURCHASE', 'UNFIT', 12125.00, 2624.81, 'https://vhr.carfax.ca/?id=9qGalxIckudBZ7a405RqaTuZHPkeaim0', '2025-12-23', 'IN_STOCK', NULL, NULL, 0, '2025-12-23 16:51:01', '2025-12-23 16:51:01'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d23 AND vin = 'W1KAF4HB4PR089194');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d24, '3VW2K7AJ6FM419489', 'Volkswagen', 'Jetta', 2015, 'SEDAN', 'PRIVATE_PURCHASE', 'UNFIT', 3475.00, 4462.32, NULL, '2026-03-30', 'SOLD', '2026-05-03', 6795.00, 1, '2026-03-30 19:25:52', '2026-05-03 14:06:57'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d24 AND vin = '3VW2K7AJ6FM419489');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d24, 'JM1BPBMY5P1618290', 'Mazda', 'Mazda3', 2023, 'HATCHBACK', 'TRADE_IN', 'CERTIFIED', 21050.00, 750.98, 'https://vhr.carfax.ca/?id=RyzMQmO55GdXgFmbiuwoHvLhvgGNBsmZ', '2026-09-21', 'SOLD', '2026-09-27', 26995.00, 1, '2026-09-21 19:57:11', '2026-09-27 18:48:17'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d24 AND vin = 'JM1BPBMY5P1618290');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d24, '2HKRW2H98MH212108', 'Honda', 'CR-V', 2021, 'SUV', 'AUCTION', 'IRREPARABLE', 2275.00, NULL, 'https://vhr.carfax.ca/?id=qMdC8PskkqRZa2LIOiMaigeMPsWLvtrY', '2026-03-14', 'IN_STOCK', NULL, NULL, 0, '2026-03-14 21:10:11', '2026-03-14 21:10:11'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d24 AND vin = '2HKRW2H98MH212108');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d24, 'NM0LS7F79H1299043', 'Ford', 'Transit Connect', 2017, 'VAN', 'AUCTION', 'CERTIFIED', 4500.00, 2472.70, NULL, '2026-04-01', 'SOLD', '2026-04-15', 6100.00, 1, '2026-04-01 16:28:21', '2026-04-15 17:58:56'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d24 AND vin = 'NM0LS7F79H1299043');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d25, '1C4RJHBGXPC627147', 'Jeep', 'Grand Cherokee', 2023, 'SUV', 'PRIVATE_PURCHASE', 'UNFIT', 10850.00, 2971.49, 'https://vhr.carfax.ca/?id=5vNr3dGraxUwqrkm4MlLJAeIoM1ap7ON', '2026-04-21', 'IN_STOCK', NULL, NULL, 0, '2026-04-21 13:18:05', '2026-04-21 13:18:05'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d25 AND vin = '1C4RJHBGXPC627147');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d25, '2HGFE1F93NH001414', 'Honda', 'Civic', 2022, 'SEDAN', 'AUCTION', 'CERTIFIED', 23625.00, NULL, 'https://vhr.carfax.ca/?id=t9ynCtTIIluXyomUyA53bD9D59NiFOyO', '2026-03-05', 'IN_STOCK', NULL, NULL, 0, '2026-03-05 20:35:45', '2026-03-05 20:35:45'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d25 AND vin = '2HGFE1F93NH001414');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d25, '4T1BF1FK1EU819066', 'Toyota', 'Camry', 2014, 'SEDAN', 'AUCTION', 'AS_IS', 9050.00, NULL, 'https://vhr.carfax.ca/?id=x28BB2gTHxqrb1DCNc8sqi18PP3mY4dX', '2025-11-29', 'IN_STOCK', NULL, NULL, 0, '2025-11-29 20:17:54', '2025-11-29 20:17:54'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d25 AND vin = '4T1BF1FK1EU819066');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d25, '55SWF4KB8GU125403', 'Mercedes-Benz', 'C-Class', 2016, 'SEDAN', 'TRADE_IN', 'CERTIFIED', 6025.00, 1721.63, NULL, '2026-08-21', 'SOLD', '2026-10-15', 7595.00, 1, '2026-08-21 15:26:06', '2026-10-15 17:19:10'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d25 AND vin = '55SWF4KB8GU125403');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d26, '1HGCY1F35RA801111', 'Honda', 'Accord', 2024, 'SEDAN', 'AUCTION', 'CERTIFIED', 22800.00, 1076.18, 'https://vhr.carfax.ca/?id=11jrUPFZGlphOC6Vl5AG744AeGdigx93', '2025-12-11', 'SOLD', '2026-06-13', 30395.00, 1, '2025-12-11 17:07:03', '2026-06-13 17:57:35'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d26 AND vin = '1HGCY1F35RA801111');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d26, '3GCUDEED3NG505001', 'Chevrolet', 'Silverado 1500', 2022, 'TRUCK', 'TRADE_IN', 'CERTIFIED', 28775.00, 1321.15, NULL, '2026-04-15', 'SOLD', '2026-05-01', 36500.00, 1, '2026-04-15 20:17:00', '2026-05-01 15:29:44'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d26 AND vin = '3GCUDEED3NG505001');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d26, '1N4AL3AP3HN303318', 'Nissan', 'Altima', 2017, 'SEDAN', 'AUCTION', 'CERTIFIED', 6625.00, 1528.47, 'https://vhr.carfax.ca/?id=si0JYRjrotmeVVHBnTIojHe1KXLg90FP', '2026-08-29', 'SOLD', '2026-09-23', 8795.00, 1, '2026-08-29 14:48:46', '2026-09-23 21:46:21'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d26 AND vin = '1N4AL3AP3HN303318');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d26, '5NMP3DGL1SH135858', 'Hyundai', 'Santa Fe', 2025, 'SUV', 'AUCTION', 'AS_IS', 22800.00, NULL, NULL, '2025-12-01', 'IN_STOCK', NULL, NULL, 0, '2025-12-01 17:22:40', '2025-12-01 17:22:40'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d26 AND vin = '5NMP3DGL1SH135858');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d27, 'KM8JBCAE5PU201434', 'Hyundai', 'Tucson', 2023, 'SUV', 'OTHER', 'CERTIFIED', 22050.00, 800.15, 'https://vhr.carfax.ca/?id=9m6X37bStuNdErqK1YbA4gvfNPcVMmoG', '2026-09-17', 'SOLD', '2026-10-07', 30295.00, 1, '2026-09-17 17:33:21', '2026-10-07 19:42:01'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d27 AND vin = 'KM8JBCAE5PU201434');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d27, '3VWSX7BUXSM094978', 'Volkswagen', 'Jetta', 2025, 'SEDAN', 'OTHER', 'AS_IS', 19900.00, 639.62, 'https://vhr.carfax.ca/?id=zDLHvDhZ4jQ19OKChBXrAA2SqZKoVvSV', '2025-11-25', 'IN_STOCK', NULL, NULL, 0, '2025-11-25 16:18:32', '2025-11-25 16:18:32'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d27 AND vin = '3VWSX7BUXSM094978');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d27, 'WVWVA7AU9KW140853', 'Volkswagen', 'Golf', 2019, 'HATCHBACK', 'AUCTION', 'AS_IS', 12775.00, 0.00, 'https://vhr.carfax.ca/?id=b31W14utkurimLrVe3LaCZOdG1eLomKe', '2026-04-30', 'IN_STOCK', NULL, NULL, 0, '2026-04-30 15:32:24', '2026-04-30 15:32:24'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d27 AND vin = 'WVWVA7AU9KW140853');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d27, '4S4BTDEC1N3133460', 'Subaru', 'Outback', 2022, 'SUV', 'AUCTION', 'CERTIFIED', 22925.00, 1226.27, 'https://vhr.carfax.ca/?id=LHEMPIGRKYg7eM9wsKyVaduWkyixmWjh', '2026-06-09', 'IN_STOCK', NULL, NULL, 0, '2026-06-09 13:06:19', '2026-06-09 13:06:19'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d27 AND vin = '4S4BTDEC1N3133460');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d28, 'WVWVA7CD3PW187946', 'Volkswagen', 'Golf', 2023, 'HATCHBACK', 'AUCTION', 'AS_IS', 20350.00, 0.00, 'https://vhr.carfax.ca/?id=bF6nGvIhuPSCLtNERG5oK6E4nKErCsqW', '2026-01-21', 'SOLD', '2026-03-22', 26495.00, 1, '2026-01-21 22:59:23', '2026-03-22 15:21:52'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d28 AND vin = 'WVWVA7CD3PW187946');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d28, '5XYZUDLB6HG416804', 'Hyundai', 'Santa Fe', 2017, 'SUV', 'AUCTION', 'CERTIFIED', 8300.00, 1943.38, NULL, '2026-04-06', 'SOLD', '2026-07-08', 10600.00, 1, '2026-04-06 16:09:05', '2026-07-08 21:51:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d28 AND vin = '5XYZUDLB6HG416804');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d28, '55SWF4KB1JU275196', 'Mercedes-Benz', 'C-Class', 2018, 'SEDAN', 'TRADE_IN', 'CERTIFIED', 18400.00, 2508.59, NULL, '2025-11-21', 'IN_STOCK', NULL, NULL, 0, '2025-11-21 18:59:41', '2025-11-21 18:59:41'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d28 AND vin = '55SWF4KB1JU275196');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d28, 'WMW73DH08N2R13096', 'Mini', 'Cooper', 2022, 'HATCHBACK', 'AUCTION', 'UNFIT', 9875.00, 4225.78, NULL, '2026-04-23', 'IN_STOCK', NULL, NULL, 0, '2026-04-23 14:06:09', '2026-04-23 14:06:09'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d28 AND vin = 'WMW73DH08N2R13096');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d29, 'WA1ABAFY2P2152839', 'Audi', 'Q5', 2023, 'SUV', 'AUCTION', 'CERTIFIED', 22025.00, 2347.03, 'https://vhr.carfax.ca/?id=xb0l1AsbtNkfui7VXQknOkf4ImpUu310', '2025-12-03', 'SOLD', '2026-09-22', 29400.00, 1, '2025-12-03 21:23:52', '2026-09-22 20:13:12'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d29 AND vin = 'WA1ABAFY2P2152839');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d29, 'JM1BPAK76P1618058', 'Mazda', 'Mazda3', 2023, 'HATCHBACK', 'AUCTION', 'CERTIFIED', 16975.00, 1173.78, 'https://vhr.carfax.ca/?id=xMfXBy5tHF7P02qNClMnQrDk6pFdglkF', '2026-10-03', 'SOLD', '2026-10-14', 21695.00, 1, '2026-10-03 20:26:21', '2026-10-14 17:02:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d29 AND vin = 'JM1BPAK76P1618058');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d29, 'JM3KFBDM9N1606647', 'Mazda', 'CX-5', 2022, 'SUV', 'TRADE_IN', 'CERTIFIED', 18825.00, 2392.30, 'https://vhr.carfax.ca/?id=dvXbhAVEeFpDYeo3uSBmPYq3lYHiHcUQ', '2026-08-14', 'IN_STOCK', NULL, NULL, 0, '2026-08-14 21:45:38', '2026-08-14 21:45:38'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d29 AND vin = 'JM3KFBDM9N1606647');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d29, '5NMJBCDE2SH485458', 'Hyundai', 'Tucson', 2025, 'SUV', 'TRADE_IN', 'AS_IS', 20100.00, 0.00, 'https://vhr.carfax.ca/?id=MVUgoxGURmsQMnslIaMdptFDmHV0C2Uq', '2026-05-03', 'IN_STOCK', NULL, NULL, 0, '2026-05-03 19:53:09', '2026-05-03 19:53:09'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d29 AND vin = '5NMJBCDE2SH485458');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d30, '1FA6P8CF9L5166793', 'Ford', 'Mustang', 2020, 'COUPE', 'AUCTION', 'AS_IS', 32700.00, 467.38, NULL, '2026-01-14', 'IN_STOCK', NULL, NULL, 0, '2026-01-14 15:53:02', '2026-01-14 15:53:02'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d30 AND vin = '1FA6P8CF9L5166793');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d30, '2HGFE2F58SH102723', 'Honda', 'Civic', 2025, 'SEDAN', 'TRADE_IN', 'AS_IS', 20375.00, NULL, NULL, '2026-07-23', 'IN_STOCK', NULL, NULL, 0, '2026-07-23 16:57:33', '2026-07-23 16:57:33'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d30 AND vin = '2HGFE2F58SH102723');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d30, '1G1ZD5ST8NF109481', 'Chevrolet', 'Malibu', 2022, 'SEDAN', 'AUCTION', 'CERTIFIED', 13475.00, 2232.47, 'https://vhr.carfax.ca/?id=5TmSAbFgIRJPwnjAPamDkQ37M7Jq1HUx', '2026-01-13', 'IN_STOCK', NULL, NULL, 0, '2026-01-13 20:26:13', '2026-01-13 20:26:13'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d30 AND vin = '1G1ZD5ST8NF109481');
INSERT INTO vehicle (dealer_id, vin, make, model, model_year, body_type, source, condition_code, purchase_cost, repair_cost, carfax_url, added_on, status, sold_on, sold_price, version, created_at, updated_at)
SELECT @d30, 'WDDWH8EB7KF858759', 'Mercedes-Benz', 'C-Class', 2019, 'SEDAN', 'PRIVATE_PURCHASE', 'CERTIFIED', 21300.00, 1223.55, 'https://vhr.carfax.ca/?id=VEaq6DhRVkoNqOKPR6CBLE0lIEDfJb87', '2026-10-03', 'IN_STOCK', NULL, NULL, 0, '2026-10-03 21:05:20', '2026-10-03 21:05:20'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM vehicle WHERE dealer_id = @d30 AND vin = 'WDDWH8EB7KF858759');
