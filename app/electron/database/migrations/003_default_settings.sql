-- Initialize default settings if none exist

INSERT OR IGNORE INTO settings (
  id, 
  company_name, 
  company_address, 
  company_email, 
  company_phone, 
  logo_base64, 
  invoice_due_days, 
  invoice_prefix, 
  smtp_host, 
  smtp_port, 
  smtp_user, 
  smtp_password, 
  smtp_secure, 
  created_at, 
  updated_at
) VALUES (
  1,
  'Your Company Name',
  'Your Company Address',
  'your-email@example.com',
  'Your Phone Number',
  NULL,
  30,
  'Invoice',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  datetime('now'),
  datetime('now')
);
