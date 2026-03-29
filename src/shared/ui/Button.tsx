import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] };
      case 'secondary':
        return { backgroundColor: 'transparent', borderColor: theme.colors.neutral[300] };
      case 'success':
        return { backgroundColor: theme.colors.success[600], borderColor: theme.colors.success[600] };
      case 'warning':
        return { backgroundColor: theme.colors.warning[600], borderColor: theme.colors.warning[600] };
      case 'error':
        return { backgroundColor: theme.colors.error[600], borderColor: theme.colors.error[600] };
      default:
        return { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 };
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.text.disabled;
    if (variant === 'secondary') return theme.colors.text.primary;
    return theme.colors.text.onPrimary;
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={getTextColor()} 
          size={getTextSize() === 18 ? 'large' : 'small'} 
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: getTextSize(),
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
