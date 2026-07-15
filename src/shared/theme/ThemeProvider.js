import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as defaultTheme, amoledTheme } from './theme';
import { PALETTES, DEFAULT_PALETTE_KEY } from './palettes';

const ThemeContext = createContext({
  theme: defaultTheme,
  themeKey: 'light',
  setThemeKey: () => {},
  paletteKey: DEFAULT_PALETTE_KEY,
  setPaletteKey: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState('light');
  const [paletteKey, setPaletteKey] = useState(DEFAULT_PALETTE_KEY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('app_theme');
      const savedPalette = await AsyncStorage.getItem('app_palette');
      if (saved === 'dark') setThemeKey('amoled');
      else if (saved) setThemeKey(saved);
      if (savedPalette) setPaletteKey(savedPalette);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem('app_theme', themeKey).catch(() => {});
  }, [hydrated, themeKey]);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem('app_palette', paletteKey).catch(() => {});
  }, [hydrated, paletteKey]);

  const themeObj = useMemo(() => {
    const base = themeKey === 'amoled' ? amoledTheme : defaultTheme;
    const palette = PALETTES.find((p) => p.key === paletteKey)
      || PALETTES.find((p) => p.key === DEFAULT_PALETTE_KEY)
      || PALETTES[0];
    const variant = themeKey === 'amoled' ? palette.dark : palette.light;
    if (!variant) return base;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: variant.background,
        surface: variant.surface,
        neutral: variant.neutral,
        primary: variant.primary,
        info: variant.info,
      },
    };
  }, [themeKey, paletteKey]);

  const ctx = useMemo(
    () => ({ theme: themeObj, themeKey, setThemeKey, paletteKey, setPaletteKey }),
    [themeObj, themeKey, paletteKey]
  );

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);


