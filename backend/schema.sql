-- PostgreSQL schema for CattleSense starter app.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'farmer',
    farm_name VARCHAR(150),
    province VARCHAR(100),
    district VARCHAR(100),
    ds_division VARCHAR(100),
    gn_division VARCHAR(100),
    farm_address TEXT,
    cattle_count INTEGER,
    farming_experience VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS cows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    breed VARCHAR(120) NOT NULL,
    age INTEGER NOT NULL,
    lactation_count INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS milk_yield (
    id SERIAL PRIMARY KEY,
    cow_id INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    milk_quantity NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cows_user_id ON cows(user_id);
CREATE INDEX IF NOT EXISTS idx_milk_yield_cow_id ON milk_yield(cow_id);
