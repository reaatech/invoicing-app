import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Package, Search, MoreVertical, Eye } from 'lucide-react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import ProductForm from './ProductForm';
import { EmptyState } from '../ui/EmptyState';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import type { DbRow } from '../../types';
import '../../types';

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<DbRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbRow | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuProductId, setMenuProductId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.query('SELECT * FROM products', []);
      if (response.success) {
        setProducts((response.data as DbRow[]) || []);
      }
    } catch (error) {
      console.error('[Products] Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleAddProduct();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const normalizedSearch = searchTerm.toLowerCase();
  const filteredProducts = products.filter(
    (product) =>
      String(product.name ?? '')
        .toLowerCase()
        .includes(normalizedSearch) ||
      String(product.description ?? '')
        .toLowerCase()
        .includes(normalizedSearch),
  );

  const handleDelete = async (id: number) => {
    const lineItemCheck = await api.query(
      'SELECT COUNT(*) as count FROM invoice_line_items WHERE product_id = ?',
      [id],
    );
    const lineItemCount =
      lineItemCheck.success && lineItemCheck.data?.length
        ? ((lineItemCheck.data[0] as DbRow).count as number)
        : 0;
    if (lineItemCount > 0) {
      alert(
        `Cannot delete this product: it is used in ${lineItemCount} invoice line item(s). Remove or update those line items first.`,
      );
      return;
    }
    if (window.confirm('Are you sure you want to delete this product?')) {
      const response = await api.query('DELETE FROM products WHERE id = ?', [id]);
      if (response.success) {
        setProducts(products.filter((p) => p.id !== id));
      }
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: DbRow) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleViewProduct = (productId: number) => {
    navigate(`/products/${productId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, productId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuProductId(productId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuProductId(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    loadProducts();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 3,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <TextField
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ maxWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="h-4 w-4" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<Plus className="h-4 w-4" />}
          onClick={handleAddProduct}
        >
          Add Product
        </Button>
      </Box>
      <Box sx={{ overflow: 'hidden', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : filteredProducts.length > 0 ? (
          <Box sx={{ width: '100%' }}>
            <DataGrid
              rows={filteredProducts.map((product) => ({
                id: Number(product.id),
                name: String(product.name),
                description: String(product.description || '-'),
                unitPrice: Number(product.unit_price ?? 0),
                unitType: String(product.unit_type || ''),
              }))}
              columns={
                [
                  {
                    field: 'name',
                    headerName: 'Name',
                    flex: 1.2,
                    minWidth: 160,
                    renderCell: (params) => (
                      <Button
                        variant="text"
                        onClick={() => handleViewProduct(Number(params.row.id))}
                      >
                        {params.value}
                      </Button>
                    ),
                  },
                  { field: 'description', headerName: 'Description', flex: 1.8, minWidth: 220 },
                  {
                    field: 'unitPrice',
                    headerName: 'Unit Price',
                    flex: 1,
                    minWidth: 140,
                    renderCell: (params) => formatCurrency(params.row.unitPrice),
                  },
                  { field: 'unitType', headerName: 'Unit Type', flex: 0.8, minWidth: 120 },
                  {
                    field: 'actions',
                    headerName: 'Actions',
                    sortable: false,
                    filterable: false,
                    width: 120,
                    renderCell: (params) => (
                      <IconButton
                        size="small"
                        onClick={(event) => handleMenuOpen(event, Number(params.row.id))}
                        aria-label="Product actions"
                        color="default"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </IconButton>
                    ),
                  },
                ] as GridColDef[]
              }
              disableRowSelectionOnClick
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 },
                },
              }}
            />
          </Box>
        ) : null}
      </Box>
      {filteredProducts.length === 0 &&
        !isLoading &&
        (searchTerm ? (
          <EmptyState
            icon={Search}
            title="No products found"
            description="Try adjusting your search to find what you're looking for"
            actionLabel="Clear search"
            onAction={() => setSearchTerm('')}
          />
        ) : (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Create products to add to your invoices and streamline billing"
            actionLabel="Add Product"
            onAction={handleAddProduct}
          />
        ))}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (menuProductId) {
              handleViewProduct(menuProductId);
            }
            handleMenuClose();
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </MenuItem>
        <MenuItem
          onClick={() => {
            const product = products.find((item) => Number(item.id) === Number(menuProductId));
            if (product) {
              handleEditProduct(product);
            }
            handleMenuClose();
          }}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuProductId) {
              handleDelete(menuProductId);
            }
            handleMenuClose();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </MenuItem>
      </Menu>
      {showForm && <ProductForm product={editingProduct || undefined} onClose={handleCloseForm} />}
    </Paper>
  );
};

export default ProductList;
