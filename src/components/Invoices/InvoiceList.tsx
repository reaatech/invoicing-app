import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, FileText, Search, MoreVertical, Send, Eye, XCircle } from 'lucide-react';
import { Box, Button, Chip, IconButton, InputAdornment, Menu, MenuItem, Paper, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridPaginationModel, GridRowSelectionModel } from '@mui/x-data-grid';
import InvoiceForm from '../Invoices/InvoiceForm'; 
import BulkActions from './BulkActions';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { api } from '../../services/api';
import { isElectronAvailable } from '../../utils/electron-api';
import '../../types';
import { getStatusColor, canEditInvoice, canDeleteInvoice } from '../../utils/invoice-status';

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<{ [key: string]: string | number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<{ [key: string]: string | number } | null>(null);
  const [customers, setCustomers] = useState<{ id: number; name: string; email?: string }[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuInvoiceId, setMenuInvoiceId] = useState<number | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [initialCustomerId, setInitialCustomerId] = useState<number | undefined>(undefined);
  const sendToastIdRef = useRef<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    loadInvoices();
    loadCustomers();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const customerId = params.get('customerId');
    if (customerId) {
      setInitialCustomerId(Number(customerId));
      setEditingInvoice(null);
      setShowForm(true);
    }
  }, [location.search]);

  const loadInvoices = async () => {
    const response = await api.query('SELECT * FROM invoices WHERE deleted_at IS NULL', []);
    if (response.success) {
      setInvoices((response.data as any[]) || []);
    }
    setIsLoading(false);
  };

  const loadCustomers = async () => {
    const response = await api.query('SELECT id, name, email FROM customers', []);
    if (response.success) {
      setCustomers((response.data as { id: number; name: string; email?: string }[]) || []);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleAddInvoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = String(invoice.invoice_number).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || String(invoice.status) === statusFilter;
    const issueDate = String(invoice.issue_date || '');
    const matchesDateRange =
      (!dateRange.startDate || issueDate >= dateRange.startDate) &&
      (!dateRange.endDate || issueDate <= dateRange.endDate);
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const handleDelete = async (invoiceId: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }
    const response = await api.query(
      'UPDATE invoices SET deleted_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
      [invoiceId]
    );
    if (!response.success) {
      alert('Failed to delete invoice: ' + (response.error || 'Unknown error'));
      return;
    }
    loadInvoices();
  };

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleViewInvoice = (invoiceId: number) => {
    window.location.hash = `#/invoices/${invoiceId}`;
  };

  const handleViewCustomer = (customerId: number | string) => {
    window.location.hash = `#/customers/${Number(customerId)}`;
  };

  const handleEditInvoice = (invoice: { [key: string]: string | number }) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    if (location.search) {
      navigate('/invoices');
    }
    loadInvoices();
  };

  const getCustomerName = (customerId: number | string): string => {
    const customer = customers.find(c => c.id === Number(customerId));
    return customer ? customer.name : String(customerId);
  };

  const getCustomerEmail = (customerId: number | string): string | null => {
    const customer = customers.find(c => c.id === Number(customerId));
    return customer?.email || null;
  };

  const handleSendInvoice = async (invoiceId: number, customerId: number | string) => {
    if (!isElectronAvailable()) {
      toast.error('Invoice sending is only available in the desktop app.');
      return;
    }
    const email = getCustomerEmail(customerId);
    if (!email) {
      alert('Selected customer does not have an email address.');
      return;
    }
    console.info('[Invoices] Sending invoice', { invoiceId, email });
    setSendingInvoiceId(invoiceId);
    sendToastIdRef.current = toast.loading('Sending invoice…');
    try {
      const sendResponse = await api.sendInvoice(invoiceId, email);
      if (sendResponse.success) {
        toast.success('Invoice sent successfully', { id: sendToastIdRef.current ?? undefined });
        loadInvoices();
      } else {
        toast.error(`Failed to send invoice: ${sendResponse.error || 'Please check SMTP settings and try again.'}`, {
          id: sendToastIdRef.current ?? undefined
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'Unknown error');
      toast.error(`Failed to send invoice: ${message}`, { id: sendToastIdRef.current ?? undefined });
    } finally {
      sendToastIdRef.current = null;
      setSendingInvoiceId(null);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, invoiceId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuInvoiceId(invoiceId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuInvoiceId(null);
  };

  const handleSelectionChange = (selection: GridRowSelectionModel) => {
    const nextSelection = Array.isArray(selection)
      ? selection
      : Array.from(selection?.ids ?? []);
    setSelectedInvoices(nextSelection.map(id => Number(id)));
  };

  const handleActionComplete = () => {
    setSelectedInvoices([]);
    loadInvoices();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>Invoices</Typography>
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} mb={3}>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <TextField
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="h-4 w-4" />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Sent">Sent</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            type="date"
            size="small"
            label="Start Date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="End Date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={() => setDateRange({ startDate: '', endDate: '' })}>
            Clear
          </Button>
        </Box>
        <Button variant="contained" startIcon={<Plus className="h-4 w-4" />} onClick={handleAddInvoice}>
          Add Invoice
        </Button>
      </Box>
      {selectedInvoices.length > 0 && (
        <BulkActions selectedInvoices={selectedInvoices} onActionComplete={handleActionComplete} />
      )}
      <Box sx={{ overflow: 'hidden', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <Box sx={{ width: '100%' }}>
            <DataGrid
              rows={filteredInvoices.map(invoice => ({
                id: Number(invoice.id),
                invoiceNumber: String(invoice.invoice_number),
                customer: getCustomerName(invoice.customer_id),
                issueDate: String(invoice.issue_date),
                dueDate: String(invoice.due_date),
                total: Number(invoice.total),
                status: String(invoice.status),
                customerId: invoice.customer_id
              }))}
              columns={([
                {
                  field: 'invoiceNumber',
                  headerName: 'Invoice #',
                  flex: 1,
                  minWidth: 130
                  ,
                  renderCell: (params) => (
                    <Button variant="text" onClick={() => handleViewInvoice(Number(params.row.id))}>
                      {params.value}
                    </Button>
                  )
                },
                {
                  field: 'customer',
                  headerName: 'Customer',
                  flex: 1.4,
                  minWidth: 180,
                  renderCell: (params) => (
                    <Button variant="text" onClick={() => handleViewCustomer(params.row.customerId)}>
                      {params.value}
                    </Button>
                  )
                },
                {
                  field: 'issueDate',
                  headerName: 'Issue Date',
                  flex: 1,
                  minWidth: 140
                },
                {
                  field: 'dueDate',
                  headerName: 'Due Date',
                  flex: 1,
                  minWidth: 140
                },
                {
                  field: 'total',
                  headerName: 'Total',
                  flex: 0.9,
                  minWidth: 120,
                  renderCell: (params) => formatCurrency(params.row.total)
                },
                {
                  field: 'status',
                  headerName: 'Status',
                  flex: 1,
                  minWidth: 120,
                  renderCell: (params) => (
                    <Chip
                      label={String(params.value)}
                      size="small"
                      className={`text-white ${getStatusColor(String(params.value))}`}
                    />
                  )
                },
                {
                  field: 'actions',
                  headerName: 'Actions',
                  sortable: false,
                  filterable: false,
                  width: 90,
                  renderCell: (params) => (
                    <IconButton
                      size="small"
                      onClick={(event) => handleMenuOpen(event, Number(params.row.id))}
                      disabled={sendingInvoiceId === Number(params.row.id)}
                      aria-label="Invoice actions"
                      color="default"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </IconButton>
                  )
                }
              ] as GridColDef[])}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={handleSelectionChange}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
            />
          </Box>
        )}
      </Box>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (menuInvoiceId) {
              handleViewInvoice(menuInvoiceId);
            }
            handleMenuClose();
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </MenuItem>
        <MenuItem
          onClick={() => {
            const invoice = invoices.find(item => Number(item.id) === Number(menuInvoiceId));
            if (invoice) {
              handleEditInvoice(invoice);
            }
            handleMenuClose();
          }}
          disabled={!canEditInvoice(String(invoices.find(item => Number(item.id) === Number(menuInvoiceId))?.status))}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </MenuItem>
        {String(invoices.find(item => Number(item.id) === Number(menuInvoiceId))?.status) === 'Draft' && (
          <MenuItem
            onClick={() => {
              const invoice = invoices.find(item => Number(item.id) === Number(menuInvoiceId));
              if (invoice) {
                handleSendInvoice(Number(invoice.id), invoice.customer_id);
              }
              handleMenuClose();
            }}
            disabled={sendingInvoiceId === Number(menuInvoiceId)}
          >
            <Send className="h-4 w-4 mr-2" />
            {sendingInvoiceId === Number(menuInvoiceId) ? 'Sending...' : 'Send'}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const invoice = invoices.find(item => Number(item.id) === Number(menuInvoiceId));
            if (invoice && window.confirm('Are you sure you want to cancel this invoice?')) {
              api.query('UPDATE invoices SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', ['Cancelled', invoice.id])
                .then(() => loadInvoices());
            }
            handleMenuClose();
          }}
          disabled={['Cancelled', 'Draft'].includes(String(invoices.find(item => Number(item.id) === Number(menuInvoiceId))?.status))}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Invoice
        </MenuItem>
        <MenuItem
          onClick={() => {
            const invoice = invoices.find(item => Number(item.id) === Number(menuInvoiceId));
            if (invoice) {
              handleDelete(Number(invoice.id));
            }
            handleMenuClose();
          }}
          disabled={!canDeleteInvoice(String(invoices.find(item => Number(item.id) === Number(menuInvoiceId))?.status))}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </MenuItem>
      </Menu>
      {filteredInvoices.length === 0 && (
        (searchTerm || statusFilter !== 'all' || dateRange.startDate || dateRange.endDate) ? (
          <EmptyState
            icon={Search}
            title="No invoices found"
            description="Try adjusting your search or filters to find what you're looking for"
            actionLabel="Clear filters"
            onAction={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateRange({ startDate: '', endDate: '' });
            }}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Get started by creating your first invoice"
            actionLabel="Create Invoice"
            onAction={handleAddInvoice}
          />
        )
      )}
      {showForm && (
        <InvoiceForm
          invoice={editingInvoice || undefined}
          initialCustomerId={initialCustomerId}
          onClose={handleCloseForm}
        />
      )}
    </Paper>
  );
};

export default InvoiceList;
