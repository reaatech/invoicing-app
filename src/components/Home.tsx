import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { getStatusCssColor } from '../utils/invoice-status';
import type { DbRow } from '../types';
import '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    outstandingInvoices: 0,
    outstandingAmount: 0,
  });
  const [revenueHistory, setRevenueHistory] = useState<DbRow[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<DbRow[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<DbRow[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<DbRow[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  const loadStats = async () => {
    try {
      let query = `
        SELECT 
          COUNT(*) as totalInvoices,
          SUM(total) as totalRevenue,
          COUNT(CASE WHEN status IN ('Sent', 'Overdue') THEN 1 END) as outstandingInvoices,
          SUM(CASE WHEN status IN ('Sent', 'Overdue') THEN total ELSE 0 END) as outstandingAmount
        FROM invoices
        WHERE deleted_at IS NULL AND status != 'Cancelled'
      `;
      let params: string[] = [];
      if (dateRange.startDate && dateRange.endDate) {
        query += ` AND issue_date >= ? AND issue_date <= ?`;
        params = [dateRange.startDate, dateRange.endDate];
      }
      const response = await api.query(query, params);
      if (response.success && response.data && response.data.length > 0) {
        const data = response.data[0] as Record<string, number>;
        setStats({
          totalInvoices: data.totalInvoices || 0,
          totalRevenue: data.totalRevenue || 0,
          outstandingInvoices: data.outstandingInvoices || 0,
          outstandingAmount: data.outstandingAmount || 0,
        });
      }
    } catch (error) {
      console.error('[Home] Failed to load stats:', error);
    }
  };

  const loadRevenueHistory = async () => {
    try {
      let query = `
        SELECT 
          strftime('%Y-%m', issue_date) as month,
          SUM(total) as revenue,
          COUNT(*) as count
        FROM invoices
        WHERE deleted_at IS NULL
          AND status != 'Cancelled'
      `;
      let params: string[] = [];
      if (dateRange.startDate && dateRange.endDate) {
        query += ` AND issue_date >= ? AND issue_date <= ?`;
        params = [dateRange.startDate, dateRange.endDate];
      } else {
        query += ` AND issue_date >= date('now', '-6 months')`;
      }
      query += `
        GROUP BY strftime('%Y-%m', issue_date)
        ORDER BY month
      `;
      const response = await api.query(query, params);
      if (response.success && response.data) {
        setRevenueHistory(
          response.data.map((d: unknown) => {
            const item = d as Record<string, unknown>;
            return {
              month: item.month,
              revenue: (item.revenue as number) || 0,
              count: (item.count as number) || 0,
            };
          }),
        );
      }
    } catch (error) {
      console.error('[Home] Failed to load revenue history:', error);
    }
  };

  const loadStatusBreakdown = async () => {
    try {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(total) as total
        FROM invoices
        WHERE deleted_at IS NULL AND status != 'Cancelled'
      `;
      let params: string[] = [];
      if (dateRange.startDate && dateRange.endDate) {
        query += ` AND issue_date >= ? AND issue_date <= ?`;
        params = [dateRange.startDate, dateRange.endDate];
      }
      query += ` GROUP BY status`;
      const response = await api.query(query, params);
      if (response.success && response.data) {
        setStatusBreakdown(response.data as DbRow[]);
      }
    } catch (error) {
      console.error('[Home] Failed to load status breakdown:', error);
    }
  };

  const loadRecentInvoices = async () => {
    try {
      let query = `
        SELECT 
          i.id,
          i.invoice_number,
          i.issue_date,
          i.total,
          i.status,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.deleted_at IS NULL AND i.status != 'Cancelled'
      `;
      let params: string[] = [];
      if (dateRange.startDate && dateRange.endDate) {
        query += ` AND i.issue_date >= ? AND i.issue_date <= ?`;
        params = [dateRange.startDate, dateRange.endDate];
      }
      query += `
        ORDER BY i.created_at DESC
        LIMIT 5
      `;
      const response = await api.query(query, params);
      if (response.success && response.data) {
        setRecentInvoices(response.data as DbRow[]);
      }
    } catch (error) {
      console.error('[Home] Failed to load recent invoices:', error);
    }
  };

  const loadMonthlyComparison = async () => {
    try {
      let query = `
        SELECT 
          strftime('%Y-%m', issue_date) as month,
          SUM(CASE WHEN status = 'Paid' THEN total ELSE 0 END) as paid,
          SUM(CASE WHEN status IN ('Sent', 'Overdue') THEN total ELSE 0 END) as outstanding
        FROM invoices
        WHERE deleted_at IS NULL
          AND status != 'Cancelled'
      `;
      let params: string[] = [];
      if (dateRange.startDate && dateRange.endDate) {
        query += ` AND issue_date >= ? AND issue_date <= ?`;
        params = [dateRange.startDate, dateRange.endDate];
      } else {
        query += ` AND issue_date >= date('now', '-6 months')`;
      }
      query += `
        GROUP BY strftime('%Y-%m', issue_date)
        ORDER BY month
      `;
      const response = await api.query(query, params);
      if (response.success && response.data) {
        setMonthlyComparison(response.data as DbRow[]);
      }
    } catch (error) {
      console.error('[Home] Failed to load monthly comparison:', error);
    }
  };

  useEffect(() => {
    void loadStats();
    void loadRevenueHistory();
    void loadStatusBreakdown();
    void loadRecentInvoices();
    void loadMonthlyComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Dashboard
      </Typography>
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button variant="contained" onClick={() => navigate('/invoices')}>
            Create New Invoice
          </Button>
          <Button variant="contained" color="success" onClick={() => navigate('/customers')}>
            Add Customer
          </Button>
          <Button variant="contained" color="warning" onClick={() => navigate('/products')}>
            Add Product
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Filter by Date Range
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateRangeChange}
              label="Start Date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateRangeChange}
              label="End Date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button variant="outlined" onClick={clearDateFilter}>
              Clear
            </Button>
          </Box>
        </Box>
      </Paper>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2.5, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="primary">
            Total Invoices
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats.totalInvoices}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2.5, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="success.main">
            Total Revenue
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {formatCurrency(stats.totalRevenue)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2.5, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="warning.main">
            Outstanding Invoices
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats.outstandingInvoices}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2.5, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="error.main">
            Outstanding Amount
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {formatCurrency(stats.outstandingAmount)}
          </Typography>
        </Paper>
      </Box>
      <Box
        sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mb: 3 }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Revenue Trend (Last 6 Months)
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: unknown) => formatCurrency(Number(value ?? 0))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Invoice Status Breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="status"
                label
              >
                {statusBreakdown.map((entry: DbRow, index: number) => (
                  <Cell key={`cell-${index}`} fill={getStatusCssColor(entry.status as string)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Paid vs Outstanding (Monthly)
        </Typography>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: unknown) => formatCurrency(Number(value ?? 0))} />
            <Legend />
            <Bar dataKey="paid" fill="#16a34a" name="Paid" />
            <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Recent Invoices
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id as number}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <TableCell>{invoice.invoice_number as string}</TableCell>
                  <TableCell>{invoice.customer_name as string}</TableCell>
                  <TableCell>{invoice.issue_date as string}</TableCell>
                  <TableCell>{formatCurrency(invoice.total as number)}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status as string}
                      size="small"
                      sx={{
                        bgcolor: getStatusCssColor(invoice.status as string),
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow key="empty-state">
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No recent invoices
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default Home;
