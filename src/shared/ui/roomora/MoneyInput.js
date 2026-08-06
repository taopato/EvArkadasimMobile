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
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
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
    minHeight: 94,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 10,
  },
  containerFocused: {
    borderColor: theme.colors.primary[500],
    borderWidth: 2,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 9,
  },
  label: {
    color: theme.colors.primary[700],
    fontFamily: theme.typography.bold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary[100],
  },
  currency: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 25,
    marginRight: 7,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.extrabold,
    fontSize: 32,
    paddingVertical: 3,
  },
});
