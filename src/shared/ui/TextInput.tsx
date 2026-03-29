import React from 'react';
import { TextInput as RNTextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline = false,
  numberOfLines = 1,
  style,
  textStyle,
  disabled = false,
  onFocus,
  onBlur,
}) => {
  const { theme } = useTheme();
  const ph = placeholderTextColor ?? theme.colors.text.disabled;
  return (
    <RNTextInput
      style={[
        styles.input,
        { borderColor: theme.colors.neutral[300], color: theme.colors.text.primary, backgroundColor: theme.colors.background },
        disabled && { opacity: 0.5, backgroundColor: theme.colors.neutral[100] },
        style,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={ph}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      multiline={multiline}
      numberOfLines={numberOfLines}
      editable={!disabled}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
});
