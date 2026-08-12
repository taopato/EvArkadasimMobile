import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export default function MoneyInput({
  label = 'TUTAR',
  value,
  onChangeText,
  placeholder = '0,00',
  autoFocus = false,
  inputAccessoryViewID,
  testID,
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, focused && styles.rowFocused]}>
        <Text style={styles.currency}>₺</Text>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.disabled}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={autoFocus}
          inputAccessoryViewID={inputAccessoryViewID}
          maxLength={14}
          selectTextOnFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label.toLocaleLowerCase('tr-TR')}
        />
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 8,
  },
  label: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    paddingBottom: 6,
    minWidth: 160,
  },
  rowFocused: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary[500],
  },
  currency: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.medium,
    fontSize: 20,
    marginRight: 4,
    marginBottom: 6,
  },
  input: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 40,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.extrabold,
    fontSize: 44,
    lineHeight: 52,
    textAlign: 'left',
    paddingVertical: 0,
  },
});
