import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { migrate } from './database/migrate.js';
import db from './database/db.js';
import { updateOverdueInvoices as updateInvoices } from './database/invoice.js';
import { showBackupReminder } from './database/backup.js';
import { fileURLToPath } from 'url';
import path from 'path';
import puppeteer from 'puppeteer';
import mustache from 'mustache'; 
import fs from 'fs';
import { registerInvoiceSend } from './email-sender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Electron app...');
registerInvoiceSend();

// Update overdue invoices and check backup reminder on app startup
function updateOverdueInvoices() {
  try {
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE invoices 
      SET status = 'Overdue' 
      WHERE status = 'Sent' 
      AND due_date < ?
    `).run(today);
  } catch (error) {
    console.error('Error updating overdue invoices:', error);
  }
}

// IPC listeners
ipcMain.on('database-query', (event, query, params, requestId) => {
  try {
    const stmt = db.prepare(query);
    if (stmt.reader) {
      const results = params ? stmt.all(...params) : stmt.all();
      event.sender.send('database-response', { success: true, data: results, requestId });
    } else {
      const result = params ? stmt.run(...params) : stmt.run();
      event.sender.send('database-response', { success: true, data: [{
        lastInsertRowid: Number(result.lastInsertRowid),
        changes: result.changes
      }], requestId });
    }
  } catch (error: unknown) {
    event.sender.send('database-response', { success: false, error: String(error), requestId });
  }
});

ipcMain.on('show-save-dialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog({
      title: options?.title || 'Save file',
      defaultPath: options?.defaultPath,
      filters: options?.filters || []
    });
    event.sender.send('show-save-dialog-response', {
      success: true,
      canceled: result.canceled,
      filePath: result.filePath || null
    });
  } catch (error: unknown) {
    event.sender.send('show-save-dialog-response', { success: false, error: String(error) });
  }
});

ipcMain.on('settings-save', (event, settings) => {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings 
      (id, company_name, company_address, company_email, company_phone, logo_base64, 
       invoice_due_days, invoice_prefix, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, 
       created_at, updated_at)
      VALUES 
      (1, @company_name, @company_address, @company_email, @company_phone, @logo_base64, 
       @invoice_due_days, @invoice_prefix, @smtp_host, @smtp_port, @smtp_user, @smtp_password, @smtp_secure, 
       COALESCE((SELECT created_at FROM settings WHERE id=1), datetime('now')), datetime('now'))
    `);
    stmt.run(settings);
    event.sender.send('settings-response', { success: true });
  } catch (error: unknown) {
    event.sender.send('settings-response', { success: false, error: String(error) });
  }
});

ipcMain.on('generate-pdf', async (event, invoiceData, outputPath) => {
  try {
    console.log('[PDF Generate] Start', { outputPath });
    
    // Fetch company settings
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings) {
      throw new Error('Company settings not found');
    }
    
    // Format data to match email template structure
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };

    const formattedData = {
      company: {
        name: settings.company_name,
        address: settings.company_address,
        email: settings.company_email,
        phone: settings.company_phone,
        logo: settings.logo_base64
      },
      customer: {
        name: invoiceData.customer.name,
        email: invoiceData.customer.email,
        billing_address: invoiceData.customer.billing_address
      },
      invoice: {
        number: invoiceData.invoice.invoice_number,
        issue_date: invoiceData.invoice.issue_date,
        due_date: invoiceData.invoice.due_date,
        payment_terms: invoiceData.invoice.payment_terms,
        notes: invoiceData.invoice.notes
      },
      line_items: invoiceData.line_items.map((item: any) => ({
        ...item,
        unit_price_formatted: formatCurrency(item.unit_price),
        line_total_formatted: formatCurrency(item.line_total)
      })),
      subtotal: invoiceData.subtotal,
      total: invoiceData.total,
      subtotal_formatted: formatCurrency(invoiceData.subtotal),
      total_formatted: formatCurrency(invoiceData.total)
    };
    
    const templatePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'templates/invoice.mustache')
      : path.join(__dirname, '../../src/templates/invoice.mustache');
    console.log('[PDF Generate] Template path', { templatePath });
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = mustache.render(template, formattedData);
    console.log('[PDF Generate] Rendered HTML', { htmlLength: html.length });
    console.log('[PDF Generate] Launching puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    console.log('[PDF Generate] Generating PDF to', outputPath);
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
    await browser.close();
    console.log('[PDF Generate] PDF created successfully');
    event.sender.send('pdf-response', { success: true, path: outputPath });
  } catch (error: unknown) {
    console.error('[PDF Generate] Error', error);
    event.sender.send('pdf-response', { success: false, error: String(error) });
  }
});

// Get next invoice number
ipcMain.on('get-next-invoice-number', (event) => {
  try {
    const lastInvoice = db.prepare(
      'SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1'
    ).get() as { invoice_number: string } | undefined;
    
    let nextNumber: string;
    if (!lastInvoice) {
      nextNumber = '1001'; // Starting number
    } else {
      const lastNumber = parseInt(lastInvoice.invoice_number);
      nextNumber = (lastNumber + 1).toString();
    }
    
    event.sender.send('invoice-number-response', { success: true, invoiceNumber: nextNumber });
  } catch (error: unknown) {
    event.sender.send('invoice-number-response', { success: false, error: String(error) });
  }
});

// File attachment handlers
ipcMain.on('show-open-dialog', async (event, options) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      title: options?.title || 'Select files',
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters || []
    });
    event.sender.send('show-open-dialog-response', {
      success: true,
      canceled: result.canceled,
      filePaths: result.filePaths || []
    });
  } catch (error: unknown) {
    console.error('[Main] Dialog error:', error);
    event.sender.send('show-open-dialog-response', { success: false, error: String(error) });
  }
});

ipcMain.on('upload-attachment', async (event, invoiceId, filePath) => {
  try {
    const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    const originalFilename = path.basename(filePath);
    const fileExt = path.extname(originalFilename);
    const timestamp = Date.now();
    const filename = `${invoiceId}_${timestamp}${fileExt}`;
    const destPath = path.join(attachmentsDir, filename);

    fs.copyFileSync(filePath, destPath);
    const stats = fs.statSync(destPath);

    const result = db.prepare(`
      INSERT INTO invoice_attachments (invoice_id, filename, original_filename, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoiceId, filename, originalFilename, destPath, stats.size, null);

    event.sender.send('upload-attachment-response', {
      success: true,
      attachment: {
        id: Number(result.lastInsertRowid),
        invoice_id: invoiceId,
        filename,
        original_filename: originalFilename,
        file_path: destPath,
        file_size: stats.size
      }
    });
  } catch (error: unknown) {
    event.sender.send('upload-attachment-response', { success: false, error: String(error) });
  }
});

ipcMain.on('delete-attachment', (event, attachmentId) => {
  try {
    const attachment = db.prepare('SELECT * FROM invoice_attachments WHERE id = ?').get(attachmentId) as any;
    if (attachment && fs.existsSync(attachment.file_path)) {
      fs.unlinkSync(attachment.file_path);
    }
    db.prepare('DELETE FROM invoice_attachments WHERE id = ?').run(attachmentId);
    event.sender.send('delete-attachment-response', { success: true });
  } catch (error: unknown) {
    event.sender.send('delete-attachment-response', { success: false, error: String(error) });
  }
});

// Export data
ipcMain.on('export-data', (event) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const customers = db.prepare('SELECT * FROM customers').all();
    const products = db.prepare('SELECT * FROM products').all();
    const invoices = db.prepare('SELECT * FROM invoices').all();
    const lineItems = db.prepare('SELECT * FROM invoice_line_items').all();
    const emailLogs = db.prepare('SELECT * FROM email_logs').all();

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      settings,
      customers,
      products,
      invoices,
      line_items: lineItems,
      email_logs: emailLogs
    };

    event.sender.send('export-response', { success: true, data: JSON.stringify(exportData, null, 2) });
  } catch (error: unknown) {
    event.sender.send('export-response', { success: false, error: String(error) });
  }
});

// Import data
ipcMain.on('import-data', (event, jsonData) => {
  try {
    const data = JSON.parse(jsonData);
    if (data.version !== '1.0') {
      throw new Error('Unsupported data version');
    }

    // Validate data structure before starting transaction
    const requiredFields = {
      settings: ['company_name', 'company_address', 'company_email'],
      customers: ['name', 'email', 'billing_address'],
      products: ['name', 'unit_price', 'unit_type'],
      invoices: ['invoice_number', 'customer_id', 'issue_date', 'due_date', 'status'],
      line_items: ['invoice_id', 'product_name', 'unit_price', 'quantity', 'line_total'],
      email_logs: ['invoice_id', 'recipient_email', 'sent_at', 'status']
    };

    for (const [key, fields] of Object.entries(requiredFields)) {
      if (data[key] && Array.isArray(data[key])) {
        data[key].forEach((item: any, index: number) => {
          fields.forEach(field => {
            if (!(field in item)) {
              throw new Error(`Missing required field ${field} in ${key} at index ${index}`);
            }
          });
        });
      }
    }

    db.transaction(() => {
      if (data.settings && data.settings.length > 0) {
        const settings = data.settings[0];
        db.prepare(`
          INSERT OR REPLACE INTO settings 
          (id, company_name, company_address, company_email, company_phone, logo_base64, 
           invoice_due_days, invoice_prefix, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, 
           created_at, updated_at)
          VALUES 
          (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
           COALESCE((SELECT created_at FROM settings WHERE id=1), datetime('now')), datetime('now'))
        `).run(
          settings.company_name, settings.company_address, settings.company_email, 
          settings.company_phone, settings.logo_base64, settings.invoice_due_days, 
          settings.invoice_prefix, settings.smtp_host, settings.smtp_port, 
          settings.smtp_user, settings.smtp_password, settings.smtp_secure
        );
      }

      if (data.customers) {
        const insertCustomer = db.prepare(`
          INSERT INTO customers (name, email, billing_address, phone, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        data.customers.forEach((customer: any) => {
          insertCustomer.run(customer.name, customer.email, customer.billing_address, customer.phone, customer.notes);
        });
      }

      if (data.products) {
        const insertProduct = db.prepare(`
          INSERT INTO products (name, description, unit_price, unit_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        data.products.forEach((product: any) => {
          insertProduct.run(product.name, product.description, product.unit_price, product.unit_type);
        });
      }

      if (data.invoices) {
        const insertInvoice = db.prepare(`
          INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, payment_terms, subtotal, total, notes, internal_memo, sent_at, paid_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        data.invoices.forEach((invoice: any) => {
          insertInvoice.run(
            invoice.invoice_number, invoice.customer_id, invoice.issue_date, invoice.due_date, 
            invoice.status, invoice.payment_terms, invoice.subtotal, invoice.total, 
            invoice.notes, invoice.internal_memo, invoice.sent_at, invoice.paid_at
          );
        });
      }

      if (data.line_items) {
        const insertLineItem = db.prepare(`
          INSERT INTO invoice_line_items (invoice_id, product_id, product_name, description, unit_price, quantity, line_total, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        data.line_items.forEach((item: any) => {
          insertLineItem.run(
            item.invoice_id, item.product_id, item.product_name, item.description, 
            item.unit_price, item.quantity, item.line_total, item.sort_order
          );
        });
      }

      if (data.email_logs) {
        const insertEmailLog = db.prepare(`
          INSERT INTO email_logs (invoice_id, recipient_email, sent_at, status, error_message)
          VALUES (?, ?, ?, ?, ?)
        `);
        data.email_logs.forEach((log: any) => {
          insertEmailLog.run(log.invoice_id, log.recipient_email, log.sent_at, log.status, log.error_message);
        });
      }
    })();

    event.sender.send('import-response', { success: true });
  } catch (error: unknown) {
    event.sender.send('import-response', { success: false, error: String(error) });
  }
});

function createWindow () {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (app.isPackaged) {
    const possiblePaths = [
      path.join(__dirname, '../app/index.html'),
      path.join(__dirname, '../../app/index.html'),
      path.join(__dirname, '../../../dist/electron/app/index.html'),
      path.join(__dirname, '../../dist/electron/app/index.html')
    ];
    let fileLoaded = false;
    for (const filePath of possiblePaths) {
      console.log('Trying to load:', filePath);
      try {
        if (fs.existsSync(filePath)) {
          win.loadFile(filePath);
          console.log('Loaded file:', filePath);
          fileLoaded = true;
          break;
        }
      } catch (error) {
        console.error('Error checking path:', filePath, error);
      }
    }
    if (!fileLoaded) {
      console.error('Could not find index.html in any expected location');
      win.loadURL('data:text/html;charset=utf-8,<h1>Error: Could not find application files.</h1>');
    }
  } else {
    console.log('Loading development URL: http://localhost:5175');
    win.loadURL('http://localhost:5175').then(() => {
      console.log('Successfully loaded development URL');
      win.webContents.openDevTools();
    }).catch(err => {
      console.error('Failed to load development URL:', err);
      win.loadURL('data:text/html;charset=utf-8,<h1>Error: Could not connect to development server. Please ensure it is running on localhost:5175.</h1>');
    });
  }
}

app.on('ready', async () => {
  console.log('App is ready, running migrations...');
  await migrate();
  updateInvoices();
  showBackupReminder();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
