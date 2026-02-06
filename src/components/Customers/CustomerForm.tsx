import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';
import { api } from '../../services/api';
import '../../types';

interface CustomerFormProps {
  customer?: any; // For edit mode, pass existing customer data
  onClose: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDialogClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDirty]);
  
  const [formData, setFormData] = useState({
    name: customer ? customer.name : '',
    email: customer ? customer.email : '',
    billing_address: customer ? customer.billing_address : '',
    phone: customer ? customer.phone : '',
    notes: customer ? customer.notes : ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      formData.name.trim() !== '' &&
      formData.email.trim() !== '' &&
      emailRegex.test(formData.email) &&
      formData.phone.trim() !== '' &&
      formData.billing_address.trim() !== ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.query(
        customer
          ? 'UPDATE customers SET name = ?, email = ?, billing_address = ?, phone = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
          : 'INSERT INTO customers (name, email, billing_address, phone, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
        customer
          ? [formData.name, formData.email, formData.billing_address, formData.phone, formData.notes, customer.id]
          : [formData.name, formData.email, formData.billing_address, formData.phone, formData.notes]
      );
      setIsSubmitting(false);
      if (response.success) {
        toast.success(customer ? 'Customer updated successfully' : 'Customer added successfully');
        setIsDirty(false);
        onClose();
      } else {
        toast.error('Failed to save customer: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setIsSubmitting(false);
      toast.error('An error occurred while saving');
    }
  };

  const handleDialogClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open onClose={handleDialogClose} fullWidth maxWidth="sm">
      <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Customer Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              required
              fullWidth
            />
            <TextField
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              type="tel"
              fullWidth
            />
            <TextField
              label="Billing Address"
              name="billing_address"
              value={formData.billing_address}
              onChange={handleChange}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDialogClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !isFormValid()} startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}>
            {isSubmitting ? 'Saving...' : (customer ? 'Update' : 'Add') + ' Customer'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CustomerForm;
