import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { safeElectronAPI } from '../../utils/electron-api';
import '../../types';

const SettingsForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [invoiceDueDays, setInvoiceDueDays] = useState(30);
  const [invoicePrefix, setInvoicePrefix] = useState('Invoice');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);

  useEffect(() => {
    const fetchSettings = () => {
      setIsLoading(true);
      safeElectronAPI.sendMessage('database-query', 'SELECT * FROM settings WHERE id=1', []);
      const handleResponse = (response: any) => {
        setIsLoading(false);
        if (response.success && response.data.length > 0) {
          const settings = response.data[0];
          setCompanyName(settings.company_name || '');
          setCompanyAddress(settings.company_address || '');
          setCompanyEmail(settings.company_email || '');
          setCompanyPhone(settings.company_phone || '');
          setLogoBase64(settings.logo_base64 || '');
          setInvoiceDueDays(settings.invoice_due_days || 30);
          setInvoicePrefix(settings.invoice_prefix || 'INV');
          setSmtpHost(settings.smtp_host || '');
          setSmtpPort(settings.smtp_port || 587);
          setSmtpUser(settings.smtp_user || '');
          setSmtpPassword(settings.smtp_password || '');
          setSmtpSecure(settings.smtp_secure === 1);
          return;
        }
        if (response.success) {
          setCompanyName('');
          setCompanyAddress('');
          setCompanyEmail('');
          setCompanyPhone('');
          setLogoBase64('');
          setInvoiceDueDays(30);
          setInvoicePrefix('INV');
          setSmtpHost('');
          setSmtpPort(587);
          setSmtpUser('');
          setSmtpPassword('');
          setSmtpSecure(false);
          return;
        }
        if (response?.error?.includes('no such table: settings')) {
          setCompanyName('');
          setCompanyAddress('');
          setCompanyEmail('');
          setCompanyPhone('');
          setLogoBase64('');
          setInvoiceDueDays(30);
          setInvoicePrefix('INV');
          setSmtpHost('');
          setSmtpPort(587);
          setSmtpUser('');
          setSmtpPassword('');
          setSmtpSecure(false);
          return;
        }
        toast.error('Failed to load settings');
      };
      safeElectronAPI.onMessage('database-response', handleResponse);
      return () => {
        safeElectronAPI.removeMessage('database-response', handleResponse);
      };
    };
    const cleanup = fetchSettings();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, value, type } = target;
    const checked = type === 'checkbox' ? (target as HTMLInputElement).checked : false;
    setIsDirty(true);
    if (type === 'checkbox') {
      if (name === 'smtpSecure') setSmtpSecure(checked);
    } else {
      if (name === 'companyName') setCompanyName(value);
      if (name === 'companyAddress') setCompanyAddress(value);
      if (name === 'companyEmail') setCompanyEmail(value);
      if (name === 'companyPhone') setCompanyPhone(value);
      if (name === 'logoBase64') setLogoBase64(value);
      if (name === 'invoiceDueDays') setInvoiceDueDays(Number(value));
      if (name === 'invoicePrefix') setInvoicePrefix(value);
      if (name === 'smtpHost') setSmtpHost(value);
      if (name === 'smtpPort') setSmtpPort(Number(value));
      if (name === 'smtpUser') setSmtpUser(value);
      if (name === 'smtpPassword') setSmtpPassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      toast.error('Please enter a valid company email address');
      return;
    }
    
    if (invoiceDueDays < 1) {
      toast.error('Invoice due days must be at least 1');
      return;
    }
    
    if (smtpPort < 1 || smtpPort > 65535) {
      toast.error('SMTP port must be between 1 and 65535');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const settings = {
        company_name: companyName,
        company_address: companyAddress,
        company_email: companyEmail,
        company_phone: companyPhone,
        logo_base64: logoBase64,
        invoice_due_days: invoiceDueDays,
        invoice_prefix: invoicePrefix,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        smtp_secure: smtpSecure ? 1 : 0
      };
      
      safeElectronAPI.sendMessage('settings-save', settings);
      safeElectronAPI.onMessage('settings-response', (response: any) => {
        setIsSaving(false);
        if (response.success) {
          toast.success('Settings saved successfully');
          setIsDirty(false);
        } else {
          toast.error('Failed to save settings: ' + (response.error || 'Unknown error'));
        }
      });
    } catch (error) {
      setIsSaving(false);
      toast.error('An error occurred while saving settings');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo file size must be less than 2MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
        setIsDirty(true);
        toast.success('Logo uploaded successfully');
      };
      reader.onerror = () => {
        toast.error('Failed to read logo file');
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="center" py={6} gap={2}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Loading settings...</Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>Settings</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" fontWeight={600} mb={2} color="text.secondary">
          Company Information
        </Typography>
        <Box display="grid" gap={2} mb={2} gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }}>
          <Box>
            <TextField label="Company Name" name="companyName" value={companyName} onChange={handleChange} fullWidth />
          </Box>
          <Box>
            <TextField label="Email" name="companyEmail" value={companyEmail} onChange={handleChange} type="email" fullWidth />
          </Box>
          <Box>
            <TextField label="Phone" name="companyPhone" value={companyPhone} onChange={handleChange} type="tel" fullWidth />
          </Box>
          <Box gridColumn={{ md: '1 / -1' }}>
            <TextField label="Address" name="companyAddress" value={companyAddress} onChange={handleChange} multiline minRows={3} fullWidth />
          </Box>
          <Box gridColumn={{ md: '1 / -1' }}>
            <TextField
              label="Company Logo"
              name="logo_upload"
              type="file"
              onChange={handleLogoUpload}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ accept: 'image/*' }}
            />
            {logoBase64 && (
              <Box mt={2}>
                <Box component="img" src={logoBase64} alt="Logo Preview" sx={{ height: 80, width: 'auto' }} />
              </Box>
            )}
          </Box>
        </Box>

        <Typography variant="h6" fontWeight={600} mb={2} color="text.secondary">
          Invoice Settings
        </Typography>
        <Box display="grid" gap={2} mb={2} gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }}>
          <Box>
            <TextField label="Invoice Prefix" name="invoicePrefix" value={invoicePrefix} onChange={handleChange} fullWidth />
          </Box>
          <Box>
            <TextField label="Default Due Days" name="invoiceDueDays" value={invoiceDueDays} onChange={handleChange} type="number" fullWidth />
          </Box>
        </Box>

        <Typography variant="h6" fontWeight={600} mb={2} color="text.secondary">
          SMTP Configuration
        </Typography>
        <Box display="grid" gap={2} mb={2} gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }}>
          <Box>
            <TextField label="SMTP Host" name="smtpHost" value={smtpHost} onChange={handleChange} fullWidth />
          </Box>
          <Box>
            <TextField label="SMTP Port" name="smtpPort" value={smtpPort} onChange={handleChange} type="number" fullWidth />
          </Box>
          <Box>
            <TextField label="SMTP User" name="smtpUser" value={smtpUser} onChange={handleChange} fullWidth />
          </Box>
          <Box>
            <TextField label="SMTP Password" name="smtpPassword" value={smtpPassword} onChange={handleChange} type="password" fullWidth />
          </Box>
          <Box gridColumn={{ md: '1 / -1' }}>
            <FormControlLabel
              control={<Switch checked={smtpSecure} onChange={handleChange} name="smtpSecure" />}
              label="Use Secure Connection (TLS/SSL)"
            />
          </Box>
        </Box>

        <Box mt={3} display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
          {isDirty && (
            <Typography variant="body2" color="text.secondary">Unsaved changes</Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : <Save className="h-4 w-4" />}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default SettingsForm;
