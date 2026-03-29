import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as defaultTheme, darkTheme, amoledTheme } from './theme';

const ThemeContext = createContext({ theme: defaultTheme, themeKey: 'light', setThemeKey: () => {} });

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState('light');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('app_theme');
      if (saved) setThemeKey(saved);
    })();
  }, []);

  useEffect(() => { AsyncStorage.setItem('app_theme', themeKey).catch(() => {}); }, [themeKey]);

  const themeObj = useMemo(() => {
    if (themeKey === 'dark') return darkTheme;
    if (themeKey === 'amoled') return amoledTheme;
    return defaultTheme;
  }, [themeKey]);

  const ctx = useMemo(() => ({ theme: themeObj, themeKey, setThemeKey }), [themeObj, themeKey]);

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);


