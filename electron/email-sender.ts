import { app, ipcMain } from 'electron';
import nodemailer from 'nodemailer';
import db from './database/db.js';
import fs from 'fs';
import path from 'path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import mustache from 'mustache';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPuppeteerLaunchOptions = () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
  if (!executablePath) {
    throw new Error('Puppeteer executable not found. Set PUPPETEER_EXECUTABLE_PATH.');
  }
  return {
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  return result as T;
};

let invoiceSendRegistered = false;

export const registerInvoiceSend = () => {
  if (invoiceSendRegistered) {
    return;
  }
  invoiceSendRegistered = true;
  console.info('[Invoice Send] Registering IPC handler');
  ipcMain.on('invoice-send', async (event, invoiceId, recipientEmail) => {
  let responded = false;
  const reply = (payload: { success: boolean; error?: string }) => {
    if (responded) {
      return;
    }
    responded = true;
    event.sender.send('invoice-response', payload);
  };
  const timeoutId = setTimeout(() => {
    console.error('[Invoice Send] Timeout waiting for invoice send to complete');
    reply({ success: false, error: 'Invoice send timed out. Please try again.' });
  }, 60000);
  try {
    console.info('[Invoice Send] Handler invoked');
    console.info('[Invoice Send] Start', { invoiceId, recipientEmail });
    console.info('[Invoice Send] Fetching SMTP settings');
    // Fetch SMTP settings
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings || !settings.smtp_host) {
      console.error('[Invoice Send] Missing SMTP settings');
      reply({ success: false, error: 'SMTP settings not configured.' });
      return;
    }
    console.info('[Invoice Send] SMTP settings loaded', {
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure === 1,
      user: settings.smtp_user
    });

    console.info('[Invoice Send] Fetching invoice data');
    // Fetch invoice data
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      console.error('[Invoice Send] Invoice not found', { invoiceId });
      reply({ success: false, error: 'Invoice not found.' });
      return;
    }

    console.info('[Invoice Send] Fetching customer data');
    // Fetch customer data
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
    if (!customer) {
      console.error('[Invoice Send] Customer not found', { customerId: invoice.customer_id });
      reply({ success: false, error: 'Customer not found.' });
      return;
    }

    console.info('[Invoice Send] Fetching invoice line items');
    // Fetch line items
    const lineItems = db.prepare('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order').all(invoiceId);

    console.info('[Invoice Send] Fetching invoice attachments');
    // Fetch attachments
    const attachments = db.prepare('SELECT * FROM invoice_attachments WHERE invoice_id = ?').all(invoiceId) as Array<{
      id: number;
      filename: string;
      original_filename: string;
      file_path: string;
      file_size: number;
    }>;

    // Prepare data for PDF and email
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };

    const invoiceData = {
      company: {
        name: settings.company_name,
        address: settings.company_address,
        email: settings.company_email,
        phone: settings.company_phone,
        logo: settings.logo_base64
      },
      customer: {
        name: customer.name,
        email: customer.email,
        billing_address: customer.billing_address
      },
      invoice: {
        number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        payment_terms: invoice.payment_terms,
        notes: invoice.notes
      },
      line_items: lineItems.map((item: any) => ({
        ...item,
        unit_price_formatted: formatCurrency(item.unit_price),
        line_total_formatted: formatCurrency(item.line_total)
      })),
      subtotal: invoice.subtotal,
      total: invoice.total,
      subtotal_formatted: formatCurrency(invoice.subtotal),
      total_formatted: formatCurrency(invoice.total)
    };

    // Generate PDF
    const invoicesDir = path.join(app.getPath('userData'), 'invoices');
    const outputPath = path.join(invoicesDir, `${settings.invoice_prefix}-Invoice-${invoice.invoice_number}.pdf`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const templatePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'templates/invoice.mustache')
      : path.join(__dirname, '../../src/templates/invoice.mustache');
    console.info('[Invoice Send] Template path', { templatePath });
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = mustache.render(template, invoiceData);
    console.info('[Invoice Send] Rendered invoice template', { htmlLength: html.length });

    console.info('[Invoice Send] Launching puppeteer');
    let browser: Browser | null = null;
    try {
      browser = await withTimeout(puppeteer.launch(getPuppeteerLaunchOptions()), 15000, 'Puppeteer launch');
      const page = await withTimeout<Page>(browser.newPage(), 8000, 'Puppeteer new page');
      await withTimeout(page.setContent(html, { waitUntil: 'networkidle0' }), 10000, 'Puppeteer render');
      await withTimeout(page.pdf({ path: outputPath, format: 'A4', printBackground: true }), 10000, 'PDF generation');
      console.info('[Invoice Send] PDF generated', { outputPath });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    // Send email with retry mechanism
    let retries = 3;
    let lastError: Error | null = null;
    while (retries > 0) {
      try {
        console.info('[Invoice Send] Attempting email send', { attemptsRemaining: retries });
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: settings.smtp_port,
          secure: settings.smtp_secure === 1,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
          auth: {
            user: settings.smtp_user,
            pass: settings.smtp_password
          }
        });

        console.info('[Invoice Send] Verifying SMTP connection');
        await transporter.verify();
        console.info('[Invoice Send] SMTP verified');

        const mailOptions = {
          from: {
            name: settings.company_name,
            address: settings.company_email
          },
          replyTo: settings.company_email,
          to: recipientEmail,
          bcc: settings.company_email,
          subject: `Invoice #${invoice.invoice_number} from ${settings.company_name}`,
          text: `Dear ${customer.name},

Please find attached Invoice #${invoice.invoice_number} due on ${invoice.due_date}. The total amount due is $${invoice.total.toFixed(2)}.

Thank you for your business.

Best regards,
${settings.company_name}`,
          attachments: [
            {
              filename: `${settings.invoice_prefix}-Invoice-${invoice.invoice_number}.pdf`,
              path: outputPath
            },
            ...attachments.map(att => ({
              filename: att.original_filename,
              path: att.file_path
            }))
          ]
        };

        const startTime = Date.now();
        await transporter.sendMail(mailOptions);
        console.info('[Invoice Send] Email send completed', { durationMs: Date.now() - startTime });
        console.info('[Invoice Send] Email sent');
        // Log email sent
        db.prepare('INSERT INTO email_logs (invoice_id, recipient_email, sent_at, status, error_message) VALUES (?, ?, datetime(\'now\'), \'success\', NULL)').run(invoiceId, recipientEmail);
        // Update invoice status to Sent
        db.prepare('UPDATE invoices SET status = \'Sent\', sent_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').run(invoiceId);
        reply({ success: true });
        return; // Success, exit retry loop
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries--;
        console.error('[Invoice Send] Send attempt failed', { error: lastError.message, retries });
        if (retries === 0) {
          const errorMessage = lastError ? lastError.message : String(error);
          db.prepare('INSERT INTO email_logs (invoice_id, recipient_email, sent_at, status, error_message) VALUES (?, ?, datetime(\'now\'), \'failed\', ?)').run(invoiceId, recipientEmail, errorMessage);
          reply({ success: false, error: errorMessage });
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Invoice Send] Fatal error', { error: errorMessage });
    db.prepare('INSERT INTO email_logs (invoice_id, recipient_email, sent_at, status, error_message) VALUES (?, ?, datetime(\'now\'), \'failed\', ?)').run(invoiceId, recipientEmail, errorMessage);
    reply({ success: false, error: errorMessage });
  } finally {
    clearTimeout(timeoutId);
  }
  });
};
