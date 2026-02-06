import React from 'react';
import { Box, Skeleton as MuiSkeleton } from '@mui/material';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} display="flex" gap={2} alignItems="center">
          <MuiSkeleton variant="rounded" width={48} height={48} />
          <Box flex={1} display="flex" flexDirection="column" gap={1}>
            <MuiSkeleton variant="text" width="70%" />
            <MuiSkeleton variant="text" width="45%" />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <Box p={3} bgcolor="background.paper" borderRadius={2} boxShadow={1}>
      <MuiSkeleton variant="text" width="30%" sx={{ mb: 2 }} />
      <MuiSkeleton variant="text" width="100%" />
      <MuiSkeleton variant="text" width="80%" />
      <MuiSkeleton variant="text" width="60%" />
    </Box>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <Box p={2} bgcolor="background.paper" borderRadius={2} boxShadow={1}>
      <MuiSkeleton variant="text" width="60%" sx={{ mb: 1 }} />
      <MuiSkeleton variant="text" width="40%" />
    </Box>
  );
};
