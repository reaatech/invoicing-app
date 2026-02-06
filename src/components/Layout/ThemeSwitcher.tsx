import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Sun, Moon } from 'lucide-react';

interface ThemeSwitcherProps {
  darkMode: boolean;
  onToggle: () => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ darkMode, onToggle }) => {

  return (
    <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={onToggle}
        color="inherit"
        aria-label="Toggle dark mode"
        size="small"
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeSwitcher;
