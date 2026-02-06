import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Users, Package, Settings } from 'lucide-react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';

const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { to: '/invoices', label: 'Invoices', icon: <FileText className="h-5 w-5" /> },
    { to: '/customers', label: 'Customers', icon: <Users className="h-5 w-5" /> },
    { to: '/products', label: 'Products', icon: <Package className="h-5 w-5" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box'
        }
      }}
    >
      <List sx={{ px: 1.5, py: 1 }}>
        {navItems.map((item) => (
          <ListItem
            key={item.to}
            disablePadding
            sx={{ mb: 0.5 }}
          >
            <NavLink
              to={item.to}
              style={{ textDecoration: 'none', width: '100%' }}
            >
              {({ isActive }) => (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  px={2}
                  py={1}
                  borderRadius={1.5}
                  bgcolor={isActive ? 'primary.main' : 'transparent'}
                  color={isActive ? 'primary.contrastText' : 'text.primary'}
                  sx={{
                    transition: 'all 150ms ease',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </Box>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
