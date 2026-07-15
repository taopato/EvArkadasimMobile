import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { shadow } from './shadow';

export default function PrimaryActionCard({
  icon = 'add',
  title,
  subtitle,
  onPress,
  style,
  accessibilityLabel,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container, style]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={theme.colors.text.onPrimary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.text.onPrimary} />
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    minHeight: 72,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.primary[600],
    ...shadow(2, 'rgba(23,40,57,0.18)'),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  copy: { flex: 1 },
  title: {
    color: theme.colors.text.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.text.onPrimary,
    opacity: 0.9,
    fontSize: 12,
    lineHeight: 17,
  },
});
