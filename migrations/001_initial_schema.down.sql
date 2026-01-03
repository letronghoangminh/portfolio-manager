-- Drop indexes
DROP INDEX IF EXISTS idx_orders_asset;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_capitals_created_at;

-- Drop tables
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS capitals;

