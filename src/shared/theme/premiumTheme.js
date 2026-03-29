import { theme as baseTheme } from './theme';

// Premium görünüm için daha yumuşak radius, daha geniş spacing ve tipografi token'ları
export const premiumTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    background: '#ffffff',
    surface: '#f9fafb',
    primary: {
      ...baseTheme.colors.primary,
      500: '#2563eb',
      600: '#1d4ed8',
      700: '#1e40af',
    },
    neutral: {
      ...baseTheme.colors.neutral,
      100: '#f5f7fb',
      200: '#e6e9f2',
      300: '#d6dae3',
    },
  },
  radius: {
    ...baseTheme.radius,
    sm: 10,
    md: 14,
    lg: 18,
  },
  spacing: {
    ...baseTheme.spacing,
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
  typography: {
    fontFamily: 'System',
    title: { size: 20, weight: '700', lineHeight: 26, letterSpacing: 0.2 },
    subtitle: { size: 14, weight: '500', lineHeight: 20, letterSpacing: 0.2 },
    body: { size: 16, weight: '400', lineHeight: 22, letterSpacing: 0.1 },
    label: { size: 12, weight: '600', lineHeight: 16, letterSpacing: 0.3 },
    button: { size: 16, weight: '700', lineHeight: 20, letterSpacing: 0.4 },
  },
};


