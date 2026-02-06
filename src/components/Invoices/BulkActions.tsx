import React, { useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from '@mui/material';
import { safeElectronAPI } from '../../utils/electron-api';
import '../../types';
import { api } from '../../services/api';
import { downloadExportedData } from '../../utils/export';

interface BulkActionsProps {
  selectedInvoices: number[];
  onActionComplete: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ selectedInvoices, onActionComplete }) => {
  const [action, setAction] = useState('');

  const handleBulkAction = async () => {
    if (selectedInvoices.length === 0) {
      alert('No invoices selected for bulk action.');
      return;
    }

    if (!action) {
      alert('Please select a bulk action.');
      return;
    }

    if (action === 'markPaid') {
      const query = `UPDATE invoices SET status = 'Paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id IN (${selectedInvoices.map(() => '?').join(',')})`;
      safeElectronAPI.sendMessage('database-query', query, selectedInvoices);
      safeElectronAPI.onMessage('database-response', (response: unknown) => {
        const typedResponse = response as { success: boolean; error?: string };
        if (typedResponse.success) {
          onActionComplete();
        } else {
          alert('Failed to mark invoices as paid: ' + (typedResponse.error || 'Unknown error'));
        }
      });
    } else if (action === 'cancel') {
      if (!window.confirm(`Are you sure you want to cancel ${selectedInvoices.length} invoice(s)?`)) {
        return;
      }
      const query = `UPDATE invoices SET status = 'Cancelled', updated_at = datetime('now') WHERE id IN (${selectedInvoices.map(() => '?').join(',')}) AND status NOT IN ('Draft', 'Cancelled')`;
      safeElectronAPI.sendMessage('database-query', query, selectedInvoices);
      safeElectronAPI.onMessage('database-response', (response: unknown) => {
        const typedResponse = response as { success: boolean; error?: string };
        if (typedResponse.success) {
          onActionComplete();
        } else {
          alert('Failed to cancel invoices: ' + (typedResponse.error || 'Unknown error'));
        }
      });
    } else if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${selectedInvoices.length} invoice(s)?`)) {
        return;
      }
      const query = `UPDATE invoices SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id IN (${selectedInvoices.map(() => '?').join(',')}) AND status IN ('Draft', 'Cancelled')`;
      safeElectronAPI.sendMessage('database-query', query, selectedInvoices);
      safeElectronAPI.onMessage('database-response', (response: unknown) => {
        const typedResponse = response as { success: boolean; error?: string };
        if (typedResponse.success) {
          onActionComplete();
        } else {
          alert('Failed to delete invoices: ' + (typedResponse.error || 'Unknown error'));
        }
      });
    } else if (action === 'export') {
      const invoicePlaceholders = selectedInvoices.map(() => '?').join(',');
      const invoiceQuery = `SELECT * FROM invoices WHERE id IN (${invoicePlaceholders})`;
      const lineItemQuery = `SELECT * FROM invoice_line_items WHERE invoice_id IN (${invoicePlaceholders})`;
      const customerQuery = `
        SELECT DISTINCT customers.*
        FROM customers
        JOIN invoices ON invoices.customer_id = customers.id
        WHERE invoices.id IN (${invoicePlaceholders})
      `;

      try {
        const invoiceResponse = await api.query(invoiceQuery, selectedInvoices);
        if (!invoiceResponse.success) {
          throw new Error(invoiceResponse.error || 'Failed to export invoices');
        }

        const lineItemResponse = await api.query(lineItemQuery, selectedInvoices);
        if (!lineItemResponse.success) {
          throw new Error(lineItemResponse.error || 'Failed to export line items');
        }

        const customerResponse = await api.query(customerQuery, selectedInvoices);
        if (!customerResponse.success) {
          throw new Error(customerResponse.error || 'Failed to export customers');
        }

        const exportData = {
          version: '1.0',
          exported_at: new Date().toISOString(),
          invoices: invoiceResponse.data || [],
          line_items: lineItemResponse.data || [],
          customers: customerResponse.data || []
        };

        downloadExportedData(JSON.stringify(exportData, null, 2), 'selected-invoices-export.json');
      } catch (error) {
        alert('Failed to export invoices: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={2}>
        <Typography fontWeight={600}>Selected: {selectedInvoices.length}</Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="bulk-action-label">Action</InputLabel>
          <Select
            labelId="bulk-action-label"
            value={action}
            label="Action"
            onChange={(e) => setAction(e.target.value)}
          >
            <MenuItem value="">Select Action</MenuItem>
            <MenuItem value="markPaid">Mark as Paid</MenuItem>
            <MenuItem value="cancel">Cancel Invoices</MenuItem>
            <MenuItem value="delete">Delete (Draft/Cancelled Only)</MenuItem>
            <MenuItem value="export">Export Selected</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleBulkAction}>
          Apply
        </Button>
      </Box>
    </Paper>
  );
};

export default BulkActions;
