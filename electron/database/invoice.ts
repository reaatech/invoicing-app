import db from './db.js';

export function updateOverdueInvoices() {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    UPDATE invoices 
    SET status = 'Overdue' 
    WHERE status = 'Overdue' 
    AND due_date < ?
  `).run(today);
}
