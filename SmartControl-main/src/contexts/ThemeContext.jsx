import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => null,
  toggleTheme: () => null,
  preference: 'system',
  isDark: true,
  isLight: false,
});

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system';
    }
    return 'system';
  });
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = theme;
  }, [preference, theme]);

  useEffect(() => {
    if (preference === 'system') {
      localStorage.removeItem('theme');
      return;
    }
    localStorage.setItem('theme', preference);
  }, [preference]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => setSystemTheme(getSystemTheme());

    handleChange();
    mediaQuery.addEventListener?.('change', handleChange);
    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme: (newTheme) => {
      setPreference(newTheme === 'system' ? 'system' : newTheme === 'light' ? 'light' : 'dark');
    },
    toggleTheme: () => {
      setPreference(theme === 'dark' ? 'light' : 'dark');
    },
    preference,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  }), [preference, theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  }
  return context
}
