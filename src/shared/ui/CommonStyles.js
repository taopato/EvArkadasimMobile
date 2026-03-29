// src/shared/ui/CommonStyles.js
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export const makeColorThemes = (theme) => ({
  primary:   { background: theme.colors.primary?.[500], foreground: theme.colors.text?.onPrimary },
  success:   { background: theme.colors.success?.[600], foreground: theme.colors.text?.onPrimary },
  warning:   { background: theme.colors.warning?.[600], foreground: theme.colors.text?.onPrimary },
  neutral:   { background: theme.colors.neutral?.[200], foreground: theme.colors.text.primary },
  error:     { background: theme.colors.error?.[600],   foreground: theme.colors.text?.onPrimary },
  info:      { background: theme.colors.info?.[600],    foreground: theme.colors.text?.onPrimary },
});

export const makeCommonStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: (theme.typography?.title?.size ?? 20) + 2,
    fontWeight: theme.typography?.title?.weight ?? '800',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: theme.typography?.subtitle?.size ?? 14,
    color: theme.colors.text.secondary,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius?.lg ?? 16,
    padding: theme.spacing?.lg ?? 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Inputs
  inputContainer: {
    marginBottom: theme.spacing?.md ?? 14,
  },
  label: {
    fontSize: theme.typography?.label?.size ?? 12,
    fontWeight: theme.typography?.label?.weight ?? '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing?.xs ?? 6,
  },

  // Buttons (menu style)
  menuButton: {
    borderRadius: theme.radius?.lg ?? 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonContent: {
    padding: theme.spacing?.md ?? 14,
    borderRadius: theme.radius?.lg ?? 12,
    alignItems: 'flex-start',
  },
  buttonIcon: {
    fontSize: 20,
    marginBottom: 6,
    color: theme.colors.text?.onPrimary,
  },
  buttonText: {
    fontSize: theme.typography?.button?.size ?? 16,
    fontWeight: theme.typography?.button?.weight ?? '700',
    color: theme.colors.text?.onPrimary,
  },
  buttonSubtext: {
    fontSize: theme.typography?.subtitle?.size ?? 12,
    marginTop: 2,
    color: theme.colors.text?.onPrimary,
    opacity: 0.9,
  },

  // Lists
  listContainer: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral?.[200],
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: theme.typography?.body?.size ?? 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  listItemSubtitle: {
    fontSize: theme.typography?.subtitle?.size ?? 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: theme.typography?.body?.size ?? 14,
    color: theme.colors.text.secondary,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.text.secondary,
  },
});

// Yardımcı kanca: ekranlarda kolay kullanım
export const useCommonStyles = () => {
  const { theme } = useTheme();
  return makeCommonStyles(theme);
};
