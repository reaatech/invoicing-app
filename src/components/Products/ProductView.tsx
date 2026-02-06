import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { ArrowLeft, Edit, Eye, Package, Trash2 } from 'lucide-react';
import Breadcrumbs from '../Layout/Breadcrumbs';
import ProductForm from './ProductForm';
import { formatCurrency } from '../../utils/currency';
import { api } from '../../services/api';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { EmptyState } from '../ui/EmptyState';
import { getStatusColor } from '../../utils/invoice-status';

interface ProductRecord {
  id: number;
  name: string;
  description?: string;
  unit_price: number;
  unit_type?: string;
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
}

const ProductView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  const productId = useMemo(() => Number(id), [id]);

  const loadProduct = async () => {
    if (!productId || Number.isNaN(productId)) {
      setProduct(null);
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const productResponse = await api.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (!productResponse.success || !productResponse.data?.length) {
      setProduct(null);
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    const productRecord = productResponse.data[0] as ProductRecord;
    setProduct(productRecord);

    const invoiceResponse = await api.query(
      `SELECT DISTINCT invoices.*
       FROM invoices
       JOIN invoice_line_items ON invoice_line_items.invoice_id = invoices.id
       WHERE invoice_line_items.product_id = ?
       ORDER BY invoices.issue_date DESC`,
      [productId]
    );
    setInvoices((invoiceResponse.success ? (invoiceResponse.data as InvoiceRecord[]) : []) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadProduct();
  }, [productId]);

  const handleCloseForm = () => {
    setShowForm(false);
    void loadProduct();
  };

  const handleDeleteProduct = async () => {
    if (!product) {
      return;
    }
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    const response = await api.query('DELETE FROM products WHERE id = ?', [product.id]);
    if (!response.success) {
      alert('Failed to delete product: ' + (response.error || 'Unknown error'));
      return;
    }
    navigate('/products');
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <TableSkeleton rows={6} />
      </Paper>
    );
  }

  if (!product) {
    return (
      <Paper sx={{ p: 3 }}>
        <EmptyState
          icon={Package}
          title="Product not found"
          description="We couldn't find the product you're looking for."
          actionLabel="Back to Products"
          onAction={() => navigate('/products')}
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
        <Button variant="text" startIcon={<Eye className="h-4 w-4" />} onClick={() => navigate(`/invoices/${params.row.id}`)}>
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
          { label: 'Products', to: '/products' },
          { label: product.name }
        ]}
      />
      <Paper sx={{ p: 3 }}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>{product.name}</Typography>
            <Typography variant="body2" color="text.secondary">{product.description || 'No description'}</Typography>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
            <Button variant="outlined" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/products')}>
              Back
            </Button>
            <Button variant="outlined" startIcon={<Edit className="h-4 w-4" />} onClick={() => setShowForm(true)}>
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDeleteProduct}
            >
              Delete
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Pricing</Typography>
            <Typography variant="body1">{formatCurrency(product.unit_price)} per {product.unit_type || 'unit'}</Typography>
            <Typography variant="body2" color="text.secondary">Created: {product.created_at || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">Updated: {product.updated_at || '—'}</Typography>
          </Paper>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Usage</Typography>
            <Typography variant="body2">Invoices using this product: {invoices.length}</Typography>
          </Paper>
        </Box>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Invoices with this product</Typography>
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
      </Paper>

      {showForm && (
        <ProductForm product={product as any} onClose={handleCloseForm} />
      )}
    </Box>
  );
};

export default ProductView;
