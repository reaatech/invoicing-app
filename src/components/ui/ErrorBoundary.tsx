import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          bgcolor="background.default"
          color="text.primary"
          p={4}
          textAlign="center"
        >
          <AlertCircle style={{ width: 64, height: 64, color: '#ef4444', marginBottom: 16 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={1} maxWidth={480}>
            The application encountered an unexpected error. You can try dismissing this or reloading the app.
          </Typography>
          {this.state.error && (
            <Typography
              variant="body2"
              color="error"
              mb={3}
              maxWidth={600}
              sx={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.8 }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box display="flex" gap={2}>
            <Button variant="outlined" onClick={this.handleDismiss}>
              Dismiss
            </Button>
            <Button variant="contained" onClick={this.handleReload}>
              Reload App
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
