import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import '../../types';
import { api } from '../../services/api';
import { downloadExportedData } from '../../utils/export';
import type { DbRow } from '../../types';

interface BulkActionsProps {
  selectedInvoices: number[];
  onActionComplete: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedInvoices, onActionComplete }) => {
  const [action, setAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('No invoices selected for bulk action.');
      return;
    }

    if (!action) {
      toast.error('Please select a bulk action.');
      return;
    }

    setIsProcessing(true);

    try {
      const placeholders = selectedInvoices.map(() => '?').join(',');

      if (action === 'markPaid') {
        const query = `UPDATE invoices SET status = 'Paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id IN (${placeholders}) AND status IN ('Sent', 'Overdue')`;
        const response = await api.query(query, selectedInvoices);
        if (!response.success) {
          throw new Error(response.error || 'Failed to mark invoices as paid');
        }
        const changed = ((response.data?.[0] as DbRow)?.changes as number) ?? 0;
        const skipped = selectedInvoices.length - changed;
        if (skipped > 0) {
          toast.success(
            `${changed} invoice(s) marked as paid (${skipped} skipped — only Sent/Overdue can be marked paid)`,
          );
        } else {
          toast.success(`${changed} invoice(s) marked as paid`);
        }
        onActionComplete();
      } else if (action === 'cancel') {
        if (
          !window.confirm(`Are you sure you want to cancel ${selectedInvoices.length} invoice(s)?`)
        ) {
          setIsProcessing(false);
          return;
        }
        const query = `UPDATE invoices SET status = 'Cancelled', updated_at = datetime('now') WHERE id IN (${placeholders}) AND status NOT IN ('Draft', 'Cancelled')`;
        const response = await api.query(query, selectedInvoices);
        if (!response.success) {
          throw new Error(response.error || 'Failed to cancel invoices');
        }
        toast.success(`Invoice(s) cancelled`);
        onActionComplete();
      } else if (action === 'delete') {
        if (
          !window.confirm(`Are you sure you want to delete ${selectedInvoices.length} invoice(s)?`)
        ) {
          setIsProcessing(false);
          return;
        }
        const query = `UPDATE invoices SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id IN (${placeholders}) AND status IN ('Draft', 'Cancelled')`;
        const response = await api.query(query, selectedInvoices);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete invoices');
        }
        toast.success(`Invoice(s) deleted`);
        onActionComplete();
      } else if (action === 'export') {
        const invoiceQuery = `SELECT * FROM invoices WHERE id IN (${placeholders})`;
        const lineItemQuery = `SELECT * FROM invoice_line_items WHERE invoice_id IN (${placeholders})`;
        const customerQuery = `
          SELECT DISTINCT customers.*
          FROM customers
          JOIN invoices ON invoices.customer_id = customers.id
          WHERE invoices.id IN (${placeholders})
        `;

        const [invoiceResponse, lineItemResponse, customerResponse] = await Promise.all([
          api.query(invoiceQuery, selectedInvoices),
          api.query(lineItemQuery, selectedInvoices),
          api.query(customerQuery, selectedInvoices),
        ]);

        if (!invoiceResponse.success) {
          throw new Error(invoiceResponse.error || 'Failed to export invoices');
        }
        if (!lineItemResponse.success) {
          throw new Error(lineItemResponse.error || 'Failed to export line items');
        }
        if (!customerResponse.success) {
          throw new Error(customerResponse.error || 'Failed to export customers');
        }

        const exportData = {
          version: '1.0',
          exported_at: new Date().toISOString(),
          invoices: invoiceResponse.data || [],
          line_items: lineItemResponse.data || [],
          customers: customerResponse.data || [],
        };

        downloadExportedData(JSON.stringify(exportData, null, 2), 'selected-invoices-export.json');
        toast.success('Export complete');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={2}
      >
        <Typography fontWeight={600}>Selected: {selectedInvoices.length}</Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="bulk-action-label">Action</InputLabel>
          <Select
            labelId="bulk-action-label"
            value={action}
            label="Action"
            onChange={(e) => setAction(e.target.value)}
          >
            <MenuItem value="markPaid">Mark as Paid</MenuItem>
            <MenuItem value="cancel">Cancel Invoices</MenuItem>
            <MenuItem value="delete">Delete (Draft/Cancelled Only)</MenuItem>
            <MenuItem value="export">Export Selected</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleBulkAction} disabled={isProcessing || !action}>
          {isProcessing ? 'Processing...' : 'Apply'}
        </Button>
      </Box>
    </Paper>
  );
};

export default BulkActions;
