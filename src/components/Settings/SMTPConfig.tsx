import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

const SMTPConfig: React.FC = () => {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>SMTP Configuration Note</AlertTitle>
      Configure your SMTP settings to enable email delivery of invoices. Ensure that your credentials are correct and that your SMTP server allows connections from this application.
    </Alert>
  );
};

export default SMTPConfig;
