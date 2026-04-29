import React from 'react';
interface ThemeSwitcherProps {
    darkMode: boolean;
    onToggle: () => void;
}
declare const ThemeSwitcher: React.FC<ThemeSwitcherProps>;
export default ThemeSwitcher;
