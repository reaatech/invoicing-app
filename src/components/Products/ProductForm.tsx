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
  MenuItem,
  TextField
} from '@mui/material';
import { api } from '../../services/api';
import '../../types';

interface ProductFormProps {
  product?: any; // For edit mode, pass existing product data
  onClose: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose }) => {
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
    name: product ? product.name : '',
    description: product ? product.description : '',
    unit_price: product ? product.unit_price : 0,
    unit_type: product ? product.unit_type : 'item'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.description.trim() !== '' &&
      Number(formData.unit_price) > 0 &&
      formData.unit_type.trim() !== ''
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.unit_price <= 0) {
      toast.error('Name and a valid unit price (greater than 0) are required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.query(
        product
          ? 'UPDATE products SET name = ?, description = ?, unit_price = ?, unit_type = ?, updated_at = datetime(\'now\') WHERE id = ?'
          : 'INSERT INTO products (name, description, unit_price, unit_type, created_at, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
        product
          ? [formData.name, formData.description, formData.unit_price, formData.unit_type, product.id]
          : [formData.name, formData.description, formData.unit_price, formData.unit_type]
      );
      setIsSubmitting(false);
      if (response.success) {
        toast.success(product ? 'Product updated successfully' : 'Product added successfully');
        setIsDirty(false);
        onClose();
      } else {
        toast.error('Failed to save product: ' + (response.error || 'Unknown error'));
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
      <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Product Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              minRows={3}
              fullWidth
            />
            <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }}>
              <TextField
                label="Unit Price"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                type="number"
                inputProps={{ step: '0.01', min: 0 }}
                required
                fullWidth
              />
              <TextField
                label="Unit Type"
                name="unit_type"
                value={formData.unit_type}
                onChange={handleChange}
                select
                fullWidth
              >
                <MenuItem value="item">Item</MenuItem>
                <MenuItem value="hour">Hour</MenuItem>
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="service">Service</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDialogClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !isFormValid()} startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}>
            {isSubmitting ? 'Saving...' : (product ? 'Update' : 'Add') + ' Product'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ProductForm;
