-- Create company table
CREATE TABLE company (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    company_name VARCHAR(255) NOT NULL,
    year_established INT,
    company_phone VARCHAR(20),
    company_mobile VARCHAR(20),
    company_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    delete_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    company_logo OID,
    company_image OID,
    rating DOUBLE PRECISION,
    review_count INT,
    description TEXT,
    specialties TEXT[],
    hours VARCHAR(255),
    website VARCHAR(255),
    email VARCHAR(255)
);

-- Create users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    user_phone VARCHAR(20),
    user_mobile VARCHAR(20),
    delete_flag BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN NOT NULL,
    company_id BIGINT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES company(id),
    created_at TIMESTAMP NOT NULL
);

-- Create password_history table
CREATE TABLE password_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    change_date TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    created_at TIMESTAMP NOT NULL
);

-- Create sellers table
CREATE TABLE sellers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(20),
    photo OID,
    aadhar_card OID,
    pan_card OID,
    address_proof OID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    company_id BIGINT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Create buyers table (create before cars to avoid circular reference)
CREATE TABLE buyers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    car_id BIGINT,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    sale_price DOUBLE PRECISION,
    sale_date DATE,
    notes TEXT,
    address TEXT,
    photo OID,
    aadhar_card OID,
    pan_card OID,
    address_proof OID,
    sold_by_user_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    company_id BIGINT NOT NULL,
    FOREIGN KEY (sold_by_user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Create cars table
CREATE TABLE cars (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    make VARCHAR(100),
    model VARCHAR(100),
    year INT,
    vin VARCHAR(50),
    engine_number VARCHAR(50),
    chassis_number VARCHAR(50),
    price DOUBLE PRECISION,
    mileage DOUBLE PRECISION,
    purchase_price DOUBLE PRECISION,
    purchase_date DATE,
    car_maintain_amount DOUBLE PRECISION,
    car_maintain_details TEXT,
    fuel_type VARCHAR(50),
    transmission VARCHAR(50),
    condition VARCHAR(50),
    color VARCHAR(50),
    status VARCHAR(50),
    odometer_reading INT,
    number_of_owners INT,
    image OID,
    rc_document OID,
    insurance_document OID,
    puc_document OID,
    seller_id BIGINT NOT NULL,
    buyer_id BIGINT,
    sold_by_user_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    company_id BIGINT NOT NULL,
    FOREIGN KEY (seller_id) REFERENCES sellers(id),
    FOREIGN KEY (buyer_id) REFERENCES buyers(id),
    FOREIGN KEY (sold_by_user_id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Create bookings table
CREATE TABLE bookings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    car_id BIGINT NOT NULL,
    buyer_name VARCHAR(255),
    buyer_phone VARCHAR(20),
    buyer_email VARCHAR(255),
    advance_amount DOUBLE PRECISION,
    total_amount DOUBLE PRECISION,
    booking_date DATE,
    payment_completion_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    company_id BIGINT NOT NULL,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Create customer_inquiries table
CREATE TABLE customer_inquiries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    car_id BIGINT,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    customer_required_car VARCHAR(255),
    fuel_type VARCHAR(50),
    budget BIGINT,
    inquiry_date DATE,
    message TEXT,
    inquiry_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    company_id BIGINT NOT NULL,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Create api_logs table
CREATE TABLE api_logs (
    id BIGSERIAL PRIMARY KEY,
    method_name VARCHAR(255),
    uri TEXT,
    http_method VARCHAR(10),
    status INTEGER,
    username VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time BIGINT,
    client_ip VARCHAR(50),
    company_id BIGINT,
    FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create email_verification_tokens table
CREATE TABLE email_verification_tokens (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add buyer <-> car relation FK (circular reference handled at end)
ALTER TABLE buyers
ADD CONSTRAINT fk_buyer_car FOREIGN KEY (car_id) REFERENCES cars(id);

CREATE TABLE car_images (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    car_id BIGINT NOT NULL,
    image1 OID,
    image2 OID,
    image3 OID,
    image4 OID,
    image5 OID,
    image6 OID,
    image7 OID,
    image8 OID,
    image9 OID,
    image10 OID,
    image11 OID,
    image12 OID,
    image13 OID,
    image14 OID,
    image15 OID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_car_images_car_id ON car_images(car_id);

CREATE TABLE car_specifications (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    car_id BIGINT NOT NULL UNIQUE,

    -- Mechanical & Performance
    engine_capacity INT,
    drivetrain VARCHAR(50),
    suspension_type VARCHAR(50),

    -- Fuel & Efficiency
    fuel_tank_capacity DOUBLE PRECISION,
    city_mileage DOUBLE PRECISION,
    highway_mileage DOUBLE PRECISION,

    -- Dimensions
    length DOUBLE PRECISION,
    width DOUBLE PRECISION,
    height DOUBLE PRECISION,
    ground_clearance DOUBLE PRECISION,
    wheelbase DOUBLE PRECISION,
    boot_space DOUBLE PRECISION,

    -- Tires & Brakes
    front_brake_type VARCHAR(50),
    rear_brake_type VARCHAR(50),
    tire_type VARCHAR(50),
    wheel_size VARCHAR(50),

    -- Comfort & Interior
    air_conditioning BOOLEAN,
    air_conditioning_type VARCHAR(50),
    power_steering BOOLEAN,
    power_windows_type VARCHAR(50),
    cruise_control BOOLEAN,
    central_locking BOOLEAN,
    infotainment_system BOOLEAN,
    navigation_system BOOLEAN,
    sunroof BOOLEAN,

    -- Safety
    airbags INT,
    abs BOOLEAN,
    ebd BOOLEAN,
    traction_control BOOLEAN,
    rear_camera BOOLEAN,
    parking_sensors BOOLEAN,

    -- Additional
    am_fm_radio BOOLEAN,
    aux_compatibility BOOLEAN,
    usb_compatibility BOOLEAN,
    bluetooth BOOLEAN,
    anti_theft_device BOOLEAN,
    adjustable_external_mirror VARCHAR(50),
    adjustable_steering BOOLEAN,
    battery_condition VARCHAR(50),
    insurance_type VARCHAR(50),
    lock_system VARCHAR(100),
    make_year VARCHAR(50),
    registration_place VARCHAR(50),
    exchange_available BOOLEAN,
    finance_available BOOLEAN,
    service_history_available BOOLEAN,
    tyre_condition VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);