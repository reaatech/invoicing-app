import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { ArrowLeft, Mail, Plus, Trash2, UserCog, Users } from 'lucide-react';
import Breadcrumbs from '../Layout/Breadcrumbs';
import CustomerForm from './CustomerForm';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { EmptyState } from '../ui/EmptyState';
import { calculateCustomerAnalytics } from '../../utils/analytics';
import { downloadExportedData } from '../../utils/export';
import { getStatusColor } from '../../utils/invoice-status';

interface CustomerRecord {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface InvoiceRecord {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  paid_at?: string | null;
}

const CustomerView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  const customerId = useMemo(() => Number(id), [id]);
  const analytics = useMemo(() => calculateCustomerAnalytics(invoices), [invoices]);

  const loadCustomer = async () => {
    if (!customerId || Number.isNaN(customerId)) {
      setCustomer(null);
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const customerResponse = await api.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customerResponse.success || !customerResponse.data?.length) {
      setCustomer(null);
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    const customerRecord = customerResponse.data[0] as CustomerRecord;
    setCustomer(customerRecord);
    const invoiceResponse = await api.query(
      'SELECT * FROM invoices WHERE customer_id = ? ORDER BY issue_date DESC',
      [customerId]
    );
    setInvoices((invoiceResponse.success ? (invoiceResponse.data as InvoiceRecord[]) : []) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadCustomer();
  }, [customerId]);

  const handleCloseForm = () => {
    setShowForm(false);
    void loadCustomer();
  };

  const handleDeleteCustomer = async () => {
    if (!customer) {
      return;
    }
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }
    const response = await api.query('DELETE FROM customers WHERE id = ?', [customer.id]);
    if (!response.success) {
      alert('Failed to delete customer: ' + (response.error || 'Unknown error'));
      return;
    }
    navigate('/customers');
  };

  const handleExportCustomer = () => {
    if (!customer) {
      return;
    }
    const exportData = {
      customer,
      invoices
    };
    downloadExportedData(JSON.stringify(exportData, null, 2), `customer-${customer.id}-export.json`);
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <TableSkeleton rows={6} />
      </Paper>
    );
  }

  if (!customer) {
    return (
      <Paper sx={{ p: 3 }}>
        <EmptyState
          icon={Users}
          title="Customer not found"
          description="We couldn't find the customer you're looking for."
          actionLabel="Back to Customers"
          onAction={() => navigate('/customers')}
        />
      </Paper>
    );
  }

  const invoiceColumns: GridColDef[] = [
    {
      field: 'invoice_number',
      headerName: 'Invoice #',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Button variant="text" onClick={() => navigate(`/invoices/${params.row.id}`)}>
          {params.value}
        </Button>
      )
    },
    { field: 'issue_date', headerName: 'Issue Date', flex: 1, minWidth: 140 },
    { field: 'due_date', headerName: 'Due Date', flex: 1, minWidth: 140 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Chip label={params.value} className={`text-white ${getStatusColor(params.value)}`} size="small" />
      )
    },
    {
      field: 'total',
      headerName: 'Total',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => formatCurrency(params.row.total)
    }
  ];

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Customers', to: '/customers' },
          { label: customer.name }
        ]}
      />
      <Paper sx={{ p: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>{customer.name}</Typography>
            <Typography variant="body2" color="text.secondary">{customer.email || 'No email'}</Typography>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
            <Button variant="outlined" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/customers')}>
              Back
            </Button>
            <Button variant="outlined" startIcon={<UserCog className="h-4 w-4" />} onClick={() => setShowForm(true)}>
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate(`/invoices?customerId=${customer.id}`)}
            >
              New Invoice
            </Button>
            <Button variant="outlined" onClick={handleExportCustomer}>Export</Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDeleteCustomer}
            >
              Delete
            </Button>
            {customer.email && (
              <Button
                variant="outlined"
                startIcon={<Mail className="h-4 w-4" />}
                onClick={() => window.open(`mailto:${customer.email}`)}
              >
                Email
              </Button>
            )}
          </Box>
        </Box>

        <Tabs value={tabIndex} onChange={(_, value) => setTabIndex(value)}>
          <Tab label="Overview" />
          <Tab label="Invoices" />
          <Tab label="Analytics" />
        </Tabs>

        <Divider sx={{ my: 2 }} />

        {tabIndex === 0 && (
          <Box display="flex" flexDirection="column" gap={3}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Customer Info</Typography>
                <Typography variant="body2">Phone: {customer.phone || '—'}</Typography>
                <Typography variant="body2">Billing Address: {customer.billing_address || '—'}</Typography>
                <Typography variant="body2">Notes: {customer.notes || '—'}</Typography>
                <Typography variant="body2">Created: {customer.created_at || '—'}</Typography>
                <Typography variant="body2">Updated: {customer.updated_at || '—'}</Typography>
              </Paper>
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Quick Stats</Typography>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', md: '1fr 1fr' }} gap={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Invoices</Typography>
                    <Typography variant="h6" fontWeight={700}>{analytics.totalInvoices}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Revenue</Typography>
                    <Typography variant="h6" fontWeight={700}>{formatCurrency(analytics.totalRevenue)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Outstanding</Typography>
                    <Typography variant="h6" fontWeight={700}>{formatCurrency(analytics.outstandingAmount)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Avg Invoice</Typography>
                    <Typography variant="h6" fontWeight={700}>{formatCurrency(analytics.averageInvoiceAmount)}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {tabIndex === 1 && (
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Invoices</Typography>
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              {Object.entries(analytics.statusCounts).map(([status, count]) => (
                <Chip key={status} label={`${status}: ${count}`} />
              ))}
            </Box>
            <Box sx={{ height: 420 }}>
              <DataGrid
                rows={invoices}
                columns={invoiceColumns}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
              />
            </Box>
          </Paper>
        )}

        {tabIndex === 2 && (
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>Average Days to Pay</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.averageDaysToPay.toFixed(1)} days</Typography>
            </Paper>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>On-time Payment Rate</Typography>
              <Typography variant="h5" fontWeight={700}>{analytics.onTimePaymentRate.toFixed(0)}%</Typography>
            </Paper>
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>Paid vs Outstanding</Typography>
              <Typography variant="body2">Paid: {formatCurrency(analytics.totalRevenue)}</Typography>
              <Typography variant="body2">Outstanding: {formatCurrency(analytics.outstandingAmount)}</Typography>
            </Paper>
          </Box>
        )}
      </Paper>

      {showForm && (
        <CustomerForm customer={customer as any} onClose={handleCloseForm} />
      )}
    </Box>
  );
};

export default CustomerView;
