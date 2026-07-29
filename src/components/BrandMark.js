import React from 'react';
import { Image, Text, View } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';

const MARK = require('../assets/mark-navy.png');
const MARK_WHITE = require('../assets/mark-white.png');
const ICON = require('../assets/adaptive-icon.png');

export default function BrandMark({
  size = 28,
  variant = 'icon',
  label,
  subtle = false,
  tone = 'auto',
  style,
}) {
  const { theme } = useTheme();
  const isLogo = variant === 'logo' || variant === 'mark';
  const useWhiteMark = isLogo && (tone === 'light' || (tone === 'auto' && theme.mode !== 'light'));
  const tint = subtle ? theme.colors.text.secondary : theme.colors.text.primary;

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={isLogo ? (useWhiteMark ? MARK_WHITE : MARK) : ICON}
        resizeMode="contain"
        style={{
          width: size,
          height: size,
        }}
      />
      {label ? (
        <Text
          style={{
            color: tint,
            fontSize: 12,
            fontWeight: '700',
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
