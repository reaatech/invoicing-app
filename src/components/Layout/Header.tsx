import React from 'react';
import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import ThemeSwitcher from './ThemeSwitcher';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, onToggleDarkMode }) => {
  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight={600}>Invoicing App</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <ThemeSwitcher darkMode={darkMode} onToggle={onToggleDarkMode} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
