import React from 'react';
import { TextInput as RNTextInput, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
};

export const PremiumTextInput: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  style,
  disabled,
}) => {
  const { theme } = useTheme();
  const r = theme.radius;
  const s = theme.spacing;
  const ph = theme.colors.text.disabled;
  const typo = (theme as any)?.typography?.body || { size: 16 };
  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={ph}
      secureTextEntry={secureTextEntry}
      editable={!disabled}
      style={[
        styles.input,
        {
          borderColor: theme.colors.neutral[300],
          backgroundColor: theme.colors.surface,
          color: theme.colors.text.primary,
          borderRadius: r.sm,
          paddingHorizontal: s.lg,
          paddingVertical: s.md,
          fontSize: (typo as any).size,
        },
        disabled && { opacity: 0.6, backgroundColor: theme.colors.neutral[100] },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    minHeight: 54,
  },
});


