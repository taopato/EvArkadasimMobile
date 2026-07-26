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
    padding: 18,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.typography?.extrabold,
    fontSize: theme.typography?.title?.size ?? 24,
    color: theme.colors.text.primary,
    letterSpacing: 0,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: theme.typography?.regular,
    fontSize: theme.typography?.subtitle?.size ?? 14,
    color: theme.colors.text.secondary,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: theme.spacing?.lg ?? 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.neutral?.[200],
  },

  // Inputs
  inputContainer: {
    marginBottom: theme.spacing?.md ?? 14,
  },
  label: {
    fontFamily: theme.typography?.semibold,
    fontSize: theme.typography?.label?.size ?? 12,
    fontWeight: theme.typography?.label?.weight ?? '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing?.xs ?? 6,
  },

  // Buttons (menu style)
  menuButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonContent: {
    padding: theme.spacing?.md ?? 14,
    borderRadius: 8,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral?.[200],
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontFamily: theme.typography?.bold,
    fontSize: theme.typography?.body?.size ?? 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  listItemSubtitle: {
    fontFamily: theme.typography?.regular,
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
