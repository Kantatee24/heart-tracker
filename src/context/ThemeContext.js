import React, { createContext, useState, useContext } from 'react';

const DARK = {
  bg:         '#000000',
  surface:    '#0E0E0E',
  surface2:   '#111111',
  surface3:   '#1A1A1A',
  text:       '#E8E8E8',
  textMuted:  '#666666',
  border:     'rgba(255,45,120,0.3)',
  accent:     '#FF2D78',
  navBg:      '#000000',
  navBorder:  'rgba(255,45,120,0.25)',
  overlay:    'rgba(0,0,0,0.92)',
  inputBg:    '#0E0E0E',
  chipBg:     'rgba(0,0,0,0.9)',
};

const LIGHT = {
  bg:         '#F2F2F7',
  surface:    '#FFFFFF',
  surface2:   '#F8F8F8',
  surface3:   '#EEEEEE',
  text:       '#1C1C1E',
  textMuted:  '#8E8E93',
  border:     'rgba(255,45,120,0.35)',
  accent:     '#FF2D78',
  navBg:      '#FFFFFF',
  navBorder:  'rgba(255,45,120,0.2)',
  overlay:    'rgba(0,0,0,0.6)',
  inputBg:    '#FFFFFF',
  chipBg:     'rgba(255,255,255,0.95)',
};

const ThemeContext = createContext({ isDark: true, toggleTheme: () => {}, colors: DARK });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(v => !v);
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
