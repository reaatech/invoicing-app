import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        if (item.to && !isLast) {
          return (
            <Link
              key={`${item.label}-${index}`}
              component={RouterLink}
              to={item.to}
              color="inherit"
              underline="hover"
            >
              {item.label}
            </Link>
          );
        }
        return (
          <Typography key={`${item.label}-${index}`} color="text.primary" fontWeight={600}>
            {item.label}
          </Typography>
        );
      })}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs;
