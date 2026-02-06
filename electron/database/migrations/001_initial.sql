CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  logo_base64 TEXT,
  invoice_due_days INTEGER DEFAULT 30,
  invoice_prefix TEXT DEFAULT 'Invoice',
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_secure BOOLEAN,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  billing_address TEXT,
  phone TEXT,
  notes TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  unit_price REAL NOT NULL,
  unit_type TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL,
  payment_terms TEXT,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  notes TEXT,
  internal_memo TEXT,
  sent_at DATETIME,
  paid_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE invoice_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  description TEXT,
  unit_price REAL NOT NULL,
  quantity REAL NOT NULL,
  line_total REAL NOT NULL,
  sort_order INTEGER,
  created_at DATETIME,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at DATETIME NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME
);

INSERT INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
