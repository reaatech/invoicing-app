import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Search, Eye, MoreVertical } from 'lucide-react';
import { Box, Button, IconButton, InputAdornment, Menu, MenuItem, Paper, TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import CustomerForm from './CustomerForm';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { api } from '../../services/api';
import '../../types';

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<{ [key: string]: string | number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{ [key: string]: string | number } | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCustomerId, setMenuCustomerId] = useState<number | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    const response = await api.query('SELECT * FROM customers', []);
    setIsLoading(false);
    if (response.success) {
      setCustomers((response.data as { [key: string]: string | number }[]) || []);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleAddCustomer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const filteredCustomers = customers.filter(customer => {
    return String(customer.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
           String(customer.email).toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      api.query('DELETE FROM customers WHERE id = ?', [id]).then(response => {
        if (response.success) {
          setCustomers(customers.filter(c => c.id !== id));
        } else {
          alert('Cannot delete customer: ' + (response.error || 'Unknown error'));
        }
      });
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: { [key: string]: string | number }) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleViewCustomer = (customerId: number) => {
    window.location.hash = `#/customers/${customerId}`;
  };

  const handleCloseForm = () => {
    setShowForm(false);
    loadCustomers();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, customerId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuCustomerId(customerId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuCustomerId(null);
  };

  const handleMenuAction = (action: 'view' | 'edit' | 'delete') => {
    if (menuCustomerId === null) return;
    
    switch (action) {
      case 'view':
        handleViewCustomer(menuCustomerId);
        break;
      case 'edit':
        const customer = customers.find(c => c.id === menuCustomerId);
        if (customer) handleEditCustomer(customer);
        break;
      case 'delete':
        handleDelete(menuCustomerId);
        break;
    }
    handleMenuClose();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} mb={3} flexDirection={{ xs: 'column', md: 'row' }}>
        <TextField
          placeholder="Search customers..."
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
          sx={{ maxWidth: 360 }}
        />
        <Button variant="contained" startIcon={<Plus className="h-4 w-4" />} onClick={handleAddCustomer}>
          Add Customer
        </Button>
      </Box>
      <Box sx={{ overflow: 'hidden', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <Box sx={{ width: '100%' }}>
            <DataGrid
              rows={filteredCustomers.map(customer => ({
                id: Number(customer.id),
                name: String(customer.name),
                email: String(customer.email),
                phone: String(customer.phone || 'N/A'),
                billingAddress: String(customer.billing_address || '')
              }))}
              columns={([
                {
                  field: 'name',
                  headerName: 'Name',
                  flex: 1.2,
                  minWidth: 160,
                  renderCell: (params) => (
                    <Button variant="text" onClick={() => handleViewCustomer(Number(params.row.id))}>
                      {params.value}
                    </Button>
                  )
                },
                { field: 'email', headerName: 'Email', flex: 1.4, minWidth: 200 },
                { field: 'phone', headerName: 'Phone', flex: 1, minWidth: 140 },
                { field: 'billingAddress', headerName: 'Billing Address', flex: 1.8, minWidth: 220 },
                {
                  field: 'actions',
                  headerName: 'Actions',
                  sortable: false,
                  filterable: false,
                  width: 80,
                  renderCell: (params) => (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, Number(params.row.id))}
                      aria-label="Customer actions"
                      color="default"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </IconButton>
                  )
                }
              ] as GridColDef[])}
              disableRowSelectionOnClick
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 }
                }
              }}
            />
          </Box>
        )}
      </Box>
      {filteredCustomers.length === 0 && (
        searchTerm ? (
          <EmptyState
            icon={Search}
            title="No customers found"
            description="Try adjusting your search to find what you're looking for"
            actionLabel="Clear search"
            onAction={() => setSearchTerm('')}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Get started by adding your first customer to begin invoicing"
            actionLabel="Add Customer"
            onAction={handleAddCustomer}
          />
        )
      )}
      {showForm && <CustomerForm customer={editingCustomer || undefined} onClose={handleCloseForm} />}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('view')}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default CustomerList;
