import React from 'react';
import { ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { TouchableScale } from './TouchableScale';

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
type Size = 'small' | 'medium' | 'large';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export const PremiumButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const { theme } = useTheme();
  const typo = (theme as any)?.typography?.button || { size: 16, weight: '700' };

  const getColors = () => {
    const t = theme.colors;
    switch (variant) {
      case 'secondary':
        return { bg: t.surface, border: t.neutral[300], fg: t.text.primary };
      case 'success':
        return { bg: t.success[600], border: t.success[600], fg: t.text.onPrimary };
      case 'warning':
        return { bg: t.warning[600], border: t.warning[600], fg: t.text.onPrimary };
      case 'error':
        return { bg: t.error[600], border: t.error[600], fg: t.text.onPrimary };
      default:
        return { bg: t.primary[600], border: t.primary[600], fg: t.text.onPrimary };
    }
  };

  const getSize = () => {
    const r = theme.radius;
    const s = theme.spacing;
    switch (size) {
      case 'small':
        return { pv: s.xs + 4, ph: s.sm + 4, br: r.sm };
      case 'large':
        return { pv: s.lg, ph: s.xl, br: r.lg };
      default:
        return { pv: s.md, ph: s.lg, br: r.md };
    }
  };

  const { bg, border, fg } = getColors();
  const { pv, ph, br } = getSize();

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: bg,
      borderColor: border,
      paddingVertical: pv,
      paddingHorizontal: ph,
      borderRadius: br,
    },
    disabled ? styles.disabled : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <TouchableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          style={{
            color: fg,
            fontFamily: theme.typography?.bold,
            fontSize: (typo as any).size,
            letterSpacing: 0,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.6,
  },
});


