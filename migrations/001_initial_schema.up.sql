-- Create capitals table
CREATE TABLE IF NOT EXISTS capitals (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(20, 8) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'dca',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    asset VARCHAR(10) NOT NULL,
    type VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    total_usdt DECIMAL(20, 8) NOT NULL,
    is_custom_price BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create holdings table
CREATE TABLE IF NOT EXISTS holdings (
    asset VARCHAR(10) PRIMARY KEY,
    amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    average_price DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_cost DECIMAL(20, 8) NOT NULL DEFAULT 0
);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize USDT holding
INSERT INTO holdings (asset, amount, average_price, total_cost)
VALUES ('USDT', 0, 1, 0)
ON CONFLICT (asset) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_capitals_created_at ON capitals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_asset ON orders(asset);

