import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import InvoiceAttachments from './InvoiceAttachments';
import toast from 'react-hot-toast';
import { Paperclip, Trash2 } from 'lucide-react';
import '../../types';

interface InvoiceFormProps {
  invoice?: { [key: string]: string | number }; // For edit mode, pass existing invoice data
  initialCustomerId?: number | string;
  onClose: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, initialCustomerId, onClose }) => {
  const [formData, setFormData] = useState({
    invoice_number: invoice ? String(invoice.invoice_number) : '',
    customer_id: invoice ? String(invoice.customer_id) : (initialCustomerId ? String(initialCustomerId) : ''),
    issue_date: invoice ? String(invoice.issue_date) : new Date().toISOString().split('T')[0],
    due_date: invoice ? String(invoice.due_date) : '',
    payment_terms: invoice ? String(invoice.payment_terms) : 'Net 30',
    notes: invoice ? String(invoice.notes) : '',
    internal_memo: invoice ? String(invoice.internal_memo) : '',
    status: invoice ? String(invoice.status) : 'Draft'
  });
  const [lineItems, setLineItems] = useState<{ id: number | string; product_id?: string; product_name: string; description: string; unit_price: number; quantity: number; line_total: number }[]>(invoice ? [] : []);
  const [customers, setCustomers] = useState<{ id: number; name: string; email?: string }[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string; description: string; unit_price: number }[]>([]);
  const [subtotal, setSubtotal] = useState<number>(invoice ? Number(invoice.subtotal) : 0);
  const [total, setTotal] = useState<number>(invoice ? Number(invoice.total) : 0);
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const isSelectingFiles = useRef(false);
  const pendingAttachmentsRef = useRef<string[]>([]);

  // Sync ref with state
  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  // Form validation
  const isFormValid = () => {
    return (
      formData.invoice_number.trim() !== '' &&
      formData.customer_id !== '' &&
      formData.issue_date !== '' &&
      formData.due_date !== '' &&
      formData.payment_terms.trim() !== '' &&
      lineItems.length > 0 &&
      lineItems.every(item => item.product_name.trim() !== '' && item.quantity > 0 && item.unit_price >= 0)
    );
  };

  useEffect(() => {
    // Single global handler that won't accumulate
    const globalFileHandler = (response: any) => {
      if (!isSelectingFiles.current) return; // Ignore if not actively selecting
      
      isSelectingFiles.current = false;
      
      if (response.success && !response.canceled && response.filePaths && response.filePaths.length > 0) {
        setPendingAttachments(prev => [...prev, ...response.filePaths]);
        toast.success(`${response.filePaths.length} file(s) selected`);
      }
    };

    window.electronAPI.onMessage('show-open-dialog-response', globalFileHandler);

    return () => {
      window.electronAPI.removeMessage('show-open-dialog-response', globalFileHandler);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const [customerResponse, productResponse] = await Promise.all([
        api.query('SELECT id, name, email FROM customers', []),
        api.query('SELECT id, name, description, unit_price FROM products', [])
      ]);
      if (customerResponse.success) {
        setCustomers((customerResponse.data as { id: number; name: string; email?: string }[]) || []);
      }
      if (productResponse.success) {
        setProducts((productResponse.data as { id: number; name: string; description: string; unit_price: number }[]) || []);
      }

      if (invoice) {
        const lineItemResponse = await api.query(
          'SELECT * FROM invoice_line_items WHERE invoice_id = ?',
          [invoice.id]
        );
        if (lineItemResponse.success) {
          setLineItems((lineItemResponse.data as { id: number; product_id?: string; product_name: string; description: string; unit_price: number; quantity: number; line_total: number }[]) || []);
        }
      } else {
        const invoiceNumberResponse = await api.getNextInvoiceNumber();
        if (invoiceNumberResponse.success && invoiceNumberResponse.invoiceNumber) {
          setFormData(prev => ({ ...prev, invoice_number: invoiceNumberResponse.invoiceNumber ?? '' }));
        }
        const dueDaysResponse = await api.query('SELECT invoice_due_days FROM settings WHERE id = 1', []);
        if (dueDaysResponse.success && dueDaysResponse.data?.length) {
          const dueDays = (dueDaysResponse.data[0] as { invoice_due_days: number }).invoice_due_days || 30;
          const issueDate = new Date(formData.issue_date);
          issueDate.setDate(issueDate.getDate() + dueDays);
          setFormData(prev => ({ ...prev, due_date: issueDate.toISOString().split('T')[0] }));
        }
      }
    };

    if (!invoice && initialCustomerId) {
      setFormData(prev => ({ ...prev, customer_id: String(initialCustomerId) }));
    }
    void loadData();
  }, [formData.issue_date, invoice, initialCustomerId]);

  useEffect(() => {
    if (invoice) {
      return;
    }
    const termsToDays: Record<string, number> = {
      'Net 15': 15,
      'Net 30': 30,
      'Net 60': 60,
      'Due on Receipt': 0
    };
    const dueDays = termsToDays[formData.payment_terms] ?? 30;
    const issueDate = new Date(formData.issue_date);
    issueDate.setDate(issueDate.getDate() + dueDays);
    setFormData(prev => ({ ...prev, due_date: issueDate.toISOString().split('T')[0] }));
  }, [formData.issue_date, formData.payment_terms, invoice]);

  useEffect(() => {
    updateTotals();
  }, [lineItems]);

  const updateTotals = () => {
    const newSubtotal = lineItems.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
    setSubtotal(newSubtotal);
    setTotal(newSubtotal); // Assuming no taxes or discounts for now
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveInvoice = async (): Promise<number | null> => {
    if (!formData.invoice_number || !formData.customer_id) {
      alert('Invoice number and customer are required.');
      return null;
    }
    if (invoice) {
      // Update existing invoice (only if draft)
      if (formData.status === 'Draft') {
        await api.query(
          'UPDATE invoices SET invoice_number = ?, customer_id = ?, issue_date = ?, due_date = ?, status = ?, payment_terms = ?, subtotal = ?, total = ?, notes = ?, internal_memo = ?, updated_at = datetime(\'now\') WHERE id = ?',
          [formData.invoice_number, formData.customer_id, formData.issue_date, formData.due_date, formData.status, formData.payment_terms, subtotal, total, formData.notes, formData.internal_memo, invoice.id]
        );
        // Update line items
        await Promise.all(lineItems.map((item, index) => {
          if (typeof item.id === 'number') {
            return api.query(
              'UPDATE invoice_line_items SET product_id = ?, product_name = ?, description = ?, unit_price = ?, quantity = ?, line_total = ?, sort_order = ? WHERE id = ?',
              [item.product_id || null, item.product_name, item.description, item.unit_price, item.quantity, item.line_total, index, item.id]
            );
          } else {
            return api.query(
              'INSERT INTO invoice_line_items (invoice_id, product_id, product_name, description, unit_price, quantity, line_total, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
              [invoice.id, item.product_id || null, item.product_name, item.description, item.unit_price, item.quantity, item.line_total, index]
            );
          }
        }));
      } else {
        alert('Cannot edit invoice: Only draft invoices can be modified.');
        return null;
      }
    } else {
      // Add new invoice
      const response = await api.query(
        'INSERT INTO invoices (invoice_number, customer_id, issue_date, due_date, status, payment_terms, subtotal, total, notes, internal_memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
        [formData.invoice_number, formData.customer_id, formData.issue_date, formData.due_date, formData.status, formData.payment_terms, subtotal, total, formData.notes, formData.internal_memo]
      );
      const newInvoiceId = response.success && response.data?.[0] && typeof (response.data[0] as { lastInsertRowid?: number }).lastInsertRowid === 'number'
        ? (response.data[0] as { lastInsertRowid: number }).lastInsertRowid
        : null;
      if (newInvoiceId) {
        await Promise.all(lineItems.map((item, index) => api.query(
          'INSERT INTO invoice_line_items (invoice_id, product_id, product_name, description, unit_price, quantity, line_total, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
          [newInvoiceId, item.product_id || null, item.product_name, item.description, item.unit_price, item.quantity, item.line_total, index]
        )));
      }
      return newInvoiceId;
    }
    return invoice && typeof invoice.id === 'number' ? Number(invoice.id) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedId = await saveInvoice();
    if (savedId) {
      await uploadPendingAttachments(savedId, true); // Show toast for Save Draft
      setPendingAttachments([]); // Clear after upload
      onClose();
    }
  };

  const handleSendNow = async () => {
    const savedId = await saveInvoice();
    if (!savedId) {
      return;
    }
    await uploadPendingAttachments(savedId, false);
    setPendingAttachments([]);
    
    const selectedCustomer = customers.find(c => c.id === Number(formData.customer_id));
    if (!selectedCustomer?.email) {
      toast.error('Selected customer does not have an email address.');
      return;
    }
    
    const toastId = toast.loading('Sending invoice...');
    const sendResponse = await api.sendInvoice(savedId, selectedCustomer.email);
    toast.dismiss(toastId);
    
    if (sendResponse.success) {
      toast.success('Invoice sent successfully!');
      setTimeout(() => onClose(), 1000); // Delay close so user sees the message
    } else {
      toast.error('Failed to send invoice: ' + (sendResponse.error || 'Unknown error'));
    }
  };

  const handleSelectAttachments = () => {
    if (isSelectingFiles.current) return;
    isSelectingFiles.current = true;
    
    window.electronAPI.sendMessage('show-open-dialog', {
      title: 'Select files to attach',
      filters: []
    });
  };

  const handleRemoveAttachment = (filePath: string) => {
    setPendingAttachments(prev => prev.filter(p => p !== filePath));
  };

  const uploadPendingAttachments = async (invoiceId: number, showToast = false) => {
    if (pendingAttachments.length === 0) return;

    const count = pendingAttachments.length;
    
    const uploadPromises = pendingAttachments.map(filePath => {
      return new Promise<void>((resolve, reject) => {
        const handleResponse = (response: any) => {
          window.electronAPI.removeMessage('upload-attachment-response', handleResponse);
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        };

        window.electronAPI.onMessage('upload-attachment-response', handleResponse);
        window.electronAPI.sendMessage('upload-attachment', invoiceId, filePath);
      });
    });

    try {
      await Promise.all(uploadPromises);
      if (showToast && count > 0) {
        toast.success(`${count} file(s) attached`);
      }
    } catch (error) {
      toast.error('Failed to attach some files');
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), product_name: '', description: '', unit_price: 0, quantity: 1, line_total: 0 }]);
  };

  const handleRemoveLineItem = (id: number | string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleLineItemChange = (id: number | string, field: string, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'unit_price' || field === 'quantity') {
          const unitPrice = Number(updatedItem.unit_price) || 0;
          const quantity = Number(updatedItem.quantity) || 0;
          updatedItem.unit_price = unitPrice;
          updatedItem.quantity = quantity;
          updatedItem.line_total = unitPrice * quantity;
        }
        if (field === 'product_id' && value) {
          const selectedProduct = products.find(p => p.id === Number(value));
          if (selectedProduct) {
            const unitPrice = Number(selectedProduct.unit_price) || 0;
            updatedItem.product_name = selectedProduct.name;
            updatedItem.description = selectedProduct.description;
            updatedItem.unit_price = unitPrice;
            updatedItem.line_total = unitPrice * (Number(updatedItem.quantity) || 0);
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{invoice ? 'Edit Invoice' : 'Add New Invoice'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} mb={3}>
            <TextField
              label="Invoice Number"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleChange}
              required
              disabled={Boolean(invoice && formData.status !== 'Draft')}
            />
            <TextField
              select
              label="Customer"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              required
              disabled={Boolean(invoice && formData.status !== 'Draft')}
            >
              <MenuItem value="">Select Customer</MenuItem>
              {customers.map(cust => (
                <MenuItem key={cust.id} value={String(cust.id)}>{cust.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="Issue Date"
              name="issue_date"
              value={formData.issue_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
              disabled={Boolean(invoice && formData.status !== 'Draft')}
            />
            <TextField
              type="date"
              label="Due Date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
              disabled={Boolean(invoice && formData.status !== 'Draft')}
            />
            <TextField
              select
              label="Payment Terms"
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              disabled={Boolean(invoice && formData.status !== 'Draft')}
            >
              <MenuItem value="Net 15">Net 15</MenuItem>
              <MenuItem value="Net 30">Net 30</MenuItem>
              <MenuItem value="Net 60">Net 60</MenuItem>
              <MenuItem value="Due on Receipt">Due on Receipt</MenuItem>
            </TextField>
            {invoice && (
              <TextField
                select
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Sent">Sent</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            )}
          </Box>

          <Box mb={3} hidden={invoice && formData.status !== 'Draft'}>
            <Typography variant="h6" fontWeight={600} mb={2} color="text.secondary">
              Line Items
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.length > 0 ? (
                    lineItems.map(item => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box display="flex" flexDirection="column" gap={1}>
                            <TextField
                              select
                              size="small"
                              value={item.product_id || ''}
                              onChange={(e) => handleLineItemChange(item.id, 'product_id', e.target.value)}
                            >
                              <MenuItem value="">Custom Item</MenuItem>
                              {products.map(prod => (
                                <MenuItem key={prod.id} value={String(prod.id)}>{prod.name}</MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              size="small"
                              value={item.product_name}
                              onChange={(e) => handleLineItemChange(item.id, 'product_name', e.target.value)}
                              placeholder="Item Name"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(item.line_total)}</TableCell>
                        <TableCell align="right">
                          <Button 
                            color="error" 
                            size="small" 
                            onClick={() => handleRemoveLineItem(item.id)}
                            sx={{ minWidth: 'auto', p: 0.5 }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                        No line items added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
            <Box mt={2}>
              <Button variant="outlined" onClick={handleAddLineItem}>
                Add Line Item
              </Button>
            </Box>
          </Box>

          <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} mb={2}>
            <TextField
              label="Notes (Visible on Invoice)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              minRows={3}
              disabled={Boolean(invoice && formData.status !== 'Draft')}
            />
            <TextField
              label="Internal Memo (Not Visible on Invoice)"
              name="internal_memo"
              value={formData.internal_memo}
              onChange={handleChange}
              multiline
              minRows={3}
            />
          </Box>

          {invoice ? (
            <Box mb={2}>
              <InvoiceAttachments invoiceId={Number(invoice.id)} readOnly={formData.status !== 'Draft'} />
            </Box>
          ) : (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                <Paperclip className="h-4 w-4 inline mr-1" />
                Attachments
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Paperclip className="h-4 w-4" />}
                onClick={handleSelectAttachments}
                sx={{ mb: 1 }}
              >
                Select Files
              </Button>
              {pendingAttachments.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {pendingAttachments.map((filePath, index) => (
                    <Box
                      key={index}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 0.5, px: 1, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {filePath.split('/').pop() || filePath.split('\\').pop() || filePath}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveAttachment(filePath)}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Box>
                  ))}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {pendingAttachments.length} file(s) will be attached when invoice is saved
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" variant="outlined">Save Draft</Button>
          <Button 
            type="button" 
            onClick={handleSendNow} 
            variant="contained"
            disabled={!isFormValid()}
          >
            Send Now
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default InvoiceForm;
