import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { shadow } from '../shadow';

type Padding = 'small' | 'medium' | 'large';
type Elevation = 'none' | 'small' | 'medium' | 'large';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: Padding;
  elevation?: Elevation;
};

export const PremiumCard: React.FC<CardProps> = ({
  children,
  style,
  padding = 'medium',
  elevation = 'medium',
}) => {
  const { theme } = useTheme();
  const s = theme.spacing;
  const r = theme.radius;

  const pad =
    padding === 'small' ? s.sm : padding === 'large' ? s.lg : s.md;

  const elev =
    elevation === 'none'
      ? shadow(0)
      : elevation === 'large'
      ? shadow(3)
      : elevation === 'medium'
      ? shadow(2)
      : shadow(1);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.neutral[200],
          padding: pad,
          borderRadius: r.lg,
          ...elev,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});


