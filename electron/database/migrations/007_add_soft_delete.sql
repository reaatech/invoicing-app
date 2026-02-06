-- Add soft delete support to invoices table

ALTER TABLE invoices ADD COLUMN deleted_at DATETIME;

-- Create index for better query performance when filtering out deleted invoices
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);
