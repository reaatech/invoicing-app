import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { ArrowLeft, CheckCircle, Copy, Download, Edit, FileText, Mail, Trash2, XCircle } from 'lucide-react';
import InvoiceForm from './InvoiceForm';
import InvoiceAttachments from './InvoiceAttachments';
import Breadcrumbs from '../Layout/Breadcrumbs';
import { api } from '../../services/api';
import { showSaveDialog } from '../../utils/electron-api';
import toast from 'react-hot-toast';
import { isElectronAvailable } from '../../utils/electron-api';
import { formatCurrency } from '../../utils/currency';
import { getStatusColor, canEditInvoice, canDeleteInvoice } from '../../utils/invoice-status';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { EmptyState } from '../ui/EmptyState';

interface InvoiceRecord {
  id: number;
  invoice_number: string;
  customer_id: number;
  issue_date: string;
  due_date: string;
  status: string;
  payment_terms?: string;
  subtotal: number;
  total: number;
  notes?: string;
  internal_memo?: string;
  sent_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface CustomerRecord {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  billing_address?: string;
}

interface LineItemRecord {
  id: number;
  product_name: string;
  description?: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface EmailLogRecord {
  id: number;
  recipient_email: string;
  sent_at: string;
  status: string;
  error_message?: string | null;
}

const InvoiceView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [lineItems, setLineItems] = useState<LineItemRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const invoiceId = useMemo(() => Number(id), [id]);

  const loadInvoice = async () => {
    if (!invoiceId || Number.isNaN(invoiceId)) {
      setInvoice(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const invoiceResponse = await api.query('SELECT * FROM invoices WHERE id = ? AND deleted_at IS NULL', [invoiceId]);
    if (!invoiceResponse.success || !invoiceResponse.data?.length) {
      setInvoice(null);
      setCustomer(null);
      setLineItems([]);
      setEmailLogs([]);
      setIsLoading(false);
      return;
    }

    const invoiceRecord = invoiceResponse.data[0] as InvoiceRecord;
    setInvoice(invoiceRecord);

    const [customerResponse, lineItemResponse, emailLogResponse] = await Promise.all([
      api.query('SELECT * FROM customers WHERE id = ?', [invoiceRecord.customer_id]),
      api.query('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order', [invoiceId]),
      api.query('SELECT * FROM email_logs WHERE invoice_id = ? ORDER BY sent_at DESC', [invoiceId])
    ]);

    setCustomer((customerResponse.success && customerResponse.data?.length
      ? (customerResponse.data[0] as CustomerRecord)
      : null));
    setLineItems((lineItemResponse.success ? (lineItemResponse.data as LineItemRecord[]) : []) || []);
    setEmailLogs((emailLogResponse.success ? (emailLogResponse.data as EmailLogRecord[]) : []) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadInvoice();
  }, [invoiceId]);

  const handleCloseForm = () => {
    setShowForm(false);
    void loadInvoice();
  };

  const handleSendInvoice = async () => {
    if (!isElectronAvailable()) {
      toast.error('Invoice sending is only available in the desktop app.');
      return;
    }
    if (!invoice || !customer?.email) {
      alert('Customer email is required to send an invoice.');
      return;
    }
    const toastId = toast.loading('Sending invoice…');
    setIsSending(true);
    try {
      const response = await api.sendInvoice(invoice.id, customer.email);
      if (response.success) {
        toast.success('Invoice sent successfully', { id: toastId });
        void loadInvoice();
      } else {
        toast.error(`Failed to send invoice: ${response.error || 'Please check SMTP settings and try again.'}`, { id: toastId });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'Unknown error');
      toast.error(`Failed to send invoice: ${message}`, { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice || !customer) {
      return;
    }
    const fileName = `invoice-${invoice.invoice_number}.pdf`;
    const saveResponse = await showSaveDialog({
      title: 'Save Invoice PDF',
      defaultPath: fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (!saveResponse.success) {
      alert('Unable to open save dialog: ' + (saveResponse.error || 'Unknown error'));
      return;
    }
    if (saveResponse.canceled || !saveResponse.filePath) {
      return;
    }
    const pdfPayload = {
      invoice,
      customer,
      line_items: lineItems,
      subtotal: invoice.subtotal,
      total: invoice.total
    };
    const response = await api.generatePDF(pdfPayload, saveResponse.filePath);
    if (!response.success) {
      alert('Failed to generate PDF: ' + (response.error || 'Unknown error'));
    }
  };

  const handleStatusUpdate = async (status: string, timestampField?: string) => {
    if (!invoice) {
      return;
    }
    const updates = [status];
    let query = 'UPDATE invoices SET status = ?, updated_at = datetime(\'now\')';
    if (timestampField) {
      query += `, ${timestampField} = datetime('now')`;
    }
    query += ' WHERE id = ?';
    const response = await api.query(query, [...updates, invoice.id]);
    if (!response.success) {
      alert('Failed to update invoice: ' + (response.error || 'Unknown error'));
    }
    void loadInvoice();
  };

  const handleDuplicate = async () => {
    if (!invoice) {
      return;
    }
    const response = await api.query(
      'INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, payment_terms, subtotal, total, notes, internal_memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
      [`${invoice.invoice_number}-copy`, invoice.customer_id, invoice.issue_date, invoice.due_date, 'Draft', invoice.payment_terms, invoice.subtotal, invoice.total, invoice.notes, invoice.internal_memo]
    );
    const newInvoiceId = response.success && response.data?.[0] && typeof (response.data[0] as { lastInsertRowid?: number }).lastInsertRowid === 'number'
      ? (response.data[0] as { lastInsertRowid: number }).lastInsertRowid
      : null;
    if (!newInvoiceId) {
      alert('Failed to duplicate invoice.');
      return;
    }
    await Promise.all(lineItems.map((item, index) => api.query(
      'INSERT INTO invoice_line_items (invoice_id, product_name, description, unit_price, quantity, line_total, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [newInvoiceId, item.product_name, item.description || '', item.unit_price, item.quantity, item.line_total, index]
    )));
    navigate(`/invoices/${newInvoiceId}`);
  };

  const handleCancelInvoice = async () => {
    if (!invoice) {
      return;
    }
    if (!window.confirm('Are you sure you want to cancel this invoice? This will mark it as Cancelled.')) {
      return;
    }
    const response = await api.query(
      'UPDATE invoices SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      ['Cancelled', invoice.id]
    );
    if (!response.success) {
      toast.error('Failed to cancel invoice: ' + (response.error || 'Unknown error'));
      return;
    }
    toast.success('Invoice cancelled successfully');
    loadInvoice();
  };

  const handleDelete = async () => {
    if (!invoice) {
      return;
    }
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }
    const response = await api.query(
      'UPDATE invoices SET deleted_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
      [invoice.id]
    );
    if (!response.success) {
      toast.error('Failed to delete invoice: ' + (response.error || 'Unknown error'));
      return;
    }
    toast.success('Invoice deleted successfully');
    navigate('/invoices');
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <TableSkeleton rows={6} />
      </Paper>
    );
  }

  if (!invoice) {
    return (
      <Paper sx={{ p: 3 }}>
        <EmptyState
          icon={FileText}
          title="Invoice not found"
          description="We couldn't find the invoice you're looking for."
          actionLabel="Back to Invoices"
          onAction={() => navigate('/invoices')}
        />
      </Paper>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Invoices', to: '/invoices' },
          { label: `Invoice ${invoice.invoice_number}` }
        ]}
      />
      <Paper sx={{ p: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} mb={1}>
              Invoice {invoice.invoice_number}
            </Typography>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Chip label={invoice.status} className={`text-white ${getStatusColor(invoice.status)}`} size="small" />
              <Typography variant="body2" color="text.secondary">Issued: {invoice.issue_date}</Typography>
              <Typography variant="body2" color="text.secondary">Due: {invoice.due_date}</Typography>
            </Box>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
            <Button variant="outlined" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/invoices')}>
              Back
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit className="h-4 w-4" />}
              onClick={() => setShowForm(true)}
              disabled={!canEditInvoice(invoice.status)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<Mail className="h-4 w-4" />}
              onClick={handleSendInvoice}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : (invoice.status === 'Draft' ? 'Send' : 'Resend')}
            </Button>
            <Button variant="outlined" startIcon={<Download className="h-4 w-4" />} onClick={handleDownloadPdf}>
              Download PDF
            </Button>
            <Button variant="outlined" color="success" startIcon={<CheckCircle className="h-4 w-4" />} onClick={() => handleStatusUpdate('Paid', 'paid_at')}>
              Mark Paid
            </Button>
            <Button 
              variant="outlined" 
              color="warning" 
              startIcon={<XCircle className="h-4 w-4" />} 
              onClick={handleCancelInvoice}
              disabled={invoice.status === 'Cancelled' || invoice.status === 'Draft'}
            >
              Cancel Invoice
            </Button>
            <Button variant="outlined" startIcon={<Copy className="h-4 w-4" />} onClick={handleDuplicate}>
              Duplicate
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDelete}
              disabled={!canDeleteInvoice(invoice.status)}
            >
              Delete
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1.1fr 1fr' }} gap={3} mb={3}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Customer</Typography>
            <Typography variant="h6" fontWeight={600}>{customer?.name || 'Unknown Customer'}</Typography>
            <Typography variant="body2" color="text.secondary">{customer?.email || 'No email'}</Typography>
            <Typography variant="body2" color="text.secondary">{customer?.phone || 'No phone'}</Typography>
            <Typography variant="body2" color="text.secondary">{customer?.billing_address || 'No billing address'}</Typography>
            {customer && (
              <Button
                variant="text"
                onClick={() => navigate(`/customers/${customer.id}`)}
                sx={{ mt: 1, px: 0 }}
              >
                View Customer
              </Button>
            )}
          </Paper>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Totals</Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography variant="body1">Subtotal: {formatCurrency(invoice.subtotal)}</Typography>
              <Typography variant="body1" fontWeight={600}>Total: {formatCurrency(invoice.total)}</Typography>
              <Typography variant="body2" color="text.secondary">Payment terms: {invoice.payment_terms || '—'}</Typography>
            </Box>
          </Paper>
        </Box>

        <Paper sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Line Items</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.description || '-'}</TableCell>
                  <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Notes</Typography>
            <Typography variant="body2" color="text.secondary">{invoice.notes || '—'}</Typography>
          </Paper>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Internal Memo</Typography>
            <Typography variant="body2" color="text.secondary">{invoice.internal_memo || '—'}</Typography>
          </Paper>
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Email History</Typography>
            {emailLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No emails sent yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Sent At</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell>{log.sent_at}</TableCell>
                      <TableCell>{log.status}</TableCell>
                      <TableCell>{log.error_message || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <InvoiceAttachments invoiceId={invoiceId} readOnly={!canEditInvoice(invoice.status)} />
        </Box>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>Audit Trail</Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={1.5}>
            <Typography variant="body2">Created: {invoice.created_at || '—'}</Typography>
            <Typography variant="body2">Updated: {invoice.updated_at || '—'}</Typography>
            <Typography variant="body2">Sent: {invoice.sent_at || '—'}</Typography>
            <Typography variant="body2">Paid: {invoice.paid_at || '—'}</Typography>
          </Box>
        </Paper>
      </Paper>
      {showForm && (
        <InvoiceForm invoice={invoice as unknown as { [key: string]: string | number }} onClose={handleCloseForm} />
      )}
    </Box>
  );
};

export default InvoiceView;
