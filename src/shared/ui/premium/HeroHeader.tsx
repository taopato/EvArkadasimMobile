import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { PremiumButton } from './Button';

type Props = {
  title: string;
  subtitle?: string;
  amount?: string;
  rightHint?: string;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  style?: ViewStyle;
};

export const HeroHeader: React.FC<Props> = ({
  title,
  subtitle,
  amount,
  rightHint,
  onPrimaryAction,
  primaryLabel = '+ Ekle',
  style,
}) => {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={[theme.colors.primary?.[700], theme.colors.primary?.[500]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ padding: 16, paddingTop: 18, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }, style]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.text.onPrimary, fontSize: 18, fontWeight: '800' }}>{title}</Text>
        {onPrimaryAction ? <PremiumButton title={primaryLabel} size="small" onPress={onPrimaryAction} /> : null}
      </View>
      {!!subtitle && (
        <Text style={{ color: theme.colors.text.onPrimary, opacity: 0.9, marginTop: 6 }}>
          {subtitle}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, alignItems: 'flex-end' }}>
        {!!amount && (
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text.onPrimary, opacity: 0.85, fontSize: 12 }}>Toplam</Text>
            <Text style={{ color: theme.colors.text.onPrimary, fontSize: 28, fontWeight: '900' }}>
              {amount}
            </Text>
          </View>
        )}
        {!!rightHint && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.colors.text.onPrimary, opacity: 0.85, fontSize: 12 }}>
              {rightHint}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
};


