import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function DateField({ value, onChange, minimumDate, maximumDate }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.field}>
      <Ionicons name="calendar-outline" size={18} color={theme.colors.text.secondary} style={{ marginRight: 8 }} />
      {React.createElement('input', {
        type: 'date',
        value: value || '',
        min: minimumDate ? toISODate(minimumDate) : undefined,
        max: maximumDate ? toISODate(maximumDate) : undefined,
        onChange: (e) => onChange(e.target.value),
        style: {
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 16,
          fontFamily: 'inherit',
          color: theme.colors.text.primary,
          flex: 1,
          padding: 0,
          width: '100%',
        },
      })}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
  },
});
