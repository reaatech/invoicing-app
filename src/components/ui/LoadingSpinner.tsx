import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 16,
  md: 32,
  lg: 48
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  label = 'Loading...'
}) => {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" role="status" aria-label={label} className={className}>
      <CircularProgress size={sizeMap[size]} />
      <Typography component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(1px, 1px, 1px, 1px)' }}>
        {label}
      </Typography>
    </Box>
  );
};
