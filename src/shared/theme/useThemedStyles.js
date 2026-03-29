import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';

// Dinamik stil üretimi: tema değiştiğinde yeniden hesaplanır
export const useThemedStyles = (factory) => {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
};

export default useThemedStyles;


