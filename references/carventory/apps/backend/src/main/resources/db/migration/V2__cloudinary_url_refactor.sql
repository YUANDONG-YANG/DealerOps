-- Migration: Refactor image/document columns to store Cloudinary URLs as TEXT/VARCHAR

-- Buyer table
ALTER TABLE buyers
    DROP COLUMN IF EXISTS photo,
    DROP COLUMN IF EXISTS aadhar_card,
    DROP COLUMN IF EXISTS pan_card,
    DROP COLUMN IF EXISTS address_proof,
    ADD COLUMN photo_url TEXT,
    ADD COLUMN aadhar_card_url TEXT,
    ADD COLUMN pan_card_url TEXT,
    ADD COLUMN address_proof_url TEXT;

-- Car table
ALTER TABLE cars
    DROP COLUMN IF EXISTS image,
    DROP COLUMN IF EXISTS rc_document,
    DROP COLUMN IF EXISTS insurance_document,
    DROP COLUMN IF EXISTS puc_document,
    ADD COLUMN image_url TEXT,
    ADD COLUMN rc_document_url TEXT,
    ADD COLUMN insurance_document_url TEXT,
    ADD COLUMN puc_document_url TEXT;

-- CarImage table
ALTER TABLE car_images
    DROP COLUMN IF EXISTS image1,
    DROP COLUMN IF EXISTS image2,
    DROP COLUMN IF EXISTS image3,
    DROP COLUMN IF EXISTS image4,
    DROP COLUMN IF EXISTS image5,
    DROP COLUMN IF EXISTS image6,
    DROP COLUMN IF EXISTS image7,
    DROP COLUMN IF EXISTS image8,
    DROP COLUMN IF EXISTS image9,
    DROP COLUMN IF EXISTS image10,
    DROP COLUMN IF EXISTS image11,
    DROP COLUMN IF EXISTS image12,
    DROP COLUMN IF EXISTS image13,
    DROP COLUMN IF EXISTS image14,
    DROP COLUMN IF EXISTS image15,
    ADD COLUMN image1_url TEXT,
    ADD COLUMN image2_url TEXT,
    ADD COLUMN image3_url TEXT,
    ADD COLUMN image4_url TEXT,
    ADD COLUMN image5_url TEXT,
    ADD COLUMN image6_url TEXT,
    ADD COLUMN image7_url TEXT,
    ADD COLUMN image8_url TEXT,
    ADD COLUMN image9_url TEXT,
    ADD COLUMN image10_url TEXT,
    ADD COLUMN image11_url TEXT,
    ADD COLUMN image12_url TEXT,
    ADD COLUMN image13_url TEXT,
    ADD COLUMN image14_url TEXT,
    ADD COLUMN image15_url TEXT;

-- Seller table
ALTER TABLE sellers
    DROP COLUMN IF EXISTS photo,
    DROP COLUMN IF EXISTS aadhar_card,
    DROP COLUMN IF EXISTS pan_card,
    DROP COLUMN IF EXISTS address_proof,
    ADD COLUMN photo_url TEXT,
    ADD COLUMN aadhar_card_url TEXT,
    ADD COLUMN pan_card_url TEXT,
    ADD COLUMN address_proof_url TEXT;

-- Company table
ALTER TABLE company
    DROP COLUMN IF EXISTS company_logo,
    DROP COLUMN IF EXISTS company_image,
    ADD COLUMN company_logo_url TEXT,
    ADD COLUMN company_image_url TEXT;