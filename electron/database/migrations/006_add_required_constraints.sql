-- Add NOT NULL constraints to required fields in customers and products tables

-- For customers: phone and billing_address should be required
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new customers table with constraints
CREATE TABLE customers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  billing_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

-- Copy data from old table
INSERT INTO customers_new SELECT * FROM customers;

-- Drop old table
DROP TABLE customers;

-- Rename new table
ALTER TABLE customers_new RENAME TO customers;

-- For products: description should be required
CREATE TABLE products_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_price REAL NOT NULL,
  unit_type TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME
);

-- Copy data from old table
INSERT INTO products_new SELECT * FROM products;

-- Drop old table
DROP TABLE products;

-- Rename new table
ALTER TABLE products_new RENAME TO products;
