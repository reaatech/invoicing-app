import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Box, Button, Typography } from '@mui/material';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={6}
      px={4}
      textAlign="center"
      className={className}
    >
      <Box
        borderRadius="50%"
        bgcolor="action.hover"
        p={3}
        mb={2}
      >
        <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      </Box>
      <Typography variant="h6" fontWeight={600} mb={1}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" mb={3} maxWidth={480}>
          {description}
        </Typography>
      )}
      {action || (actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      ))}
    </Box>
  );
};
