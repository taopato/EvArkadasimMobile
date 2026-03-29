import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { shadow } from './shadow';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'small' | 'medium' | 'large';
  elevation?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'medium',
  elevation = 'small',
}) => {
  const { theme } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'small':
        return 12;
      case 'large':
        return 24;
      default:
        return 16;
    }
  };

  const getElevation = () => {
    switch (elevation) {
      case 'none':
        return Platform.OS === 'web' ? shadow(0) : shadow(0);
      case 'medium':
        return shadow(2);
      case 'large':
        return shadow(3);
      default:
        return shadow(1);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          padding: getPadding(),
          ...getElevation(),
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.neutral[200],
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
    borderRadius: 12,
    borderWidth: 1,
  },
});
