import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { PremiumButton } from './Button';
import { shadow } from '../shadow';

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
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[{ padding: 18, paddingTop: insets.top + 12, paddingBottom: 14, backgroundColor: theme.colors.background }, style]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 26, fontWeight: '900', letterSpacing: 0 }}>{title}</Text>
          {!!subtitle && (
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4, fontSize: 15 }}>
              {subtitle}
            </Text>
          )}
        </View>
        {onPrimaryAction ? <PremiumButton title={primaryLabel} size="small" onPress={onPrimaryAction} /> : null}
      </View>
      <View
        style={{
          marginTop: 16,
          borderRadius: 20,
          padding: 18,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.neutral[200],
          ...shadow(2, 'rgba(23,40,57,0.12)'),
        }}
      >
        {!!amount && (
          <View>
            <Text style={{ color: theme.colors.text.primary, opacity: 0.82, fontSize: 15, fontWeight: '700' }}>Toplam</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 34, fontWeight: '900', marginTop: 6, letterSpacing: 0 }}>
              {amount}
            </Text>
          </View>
        )}
        {!!rightHint && (
          <View style={{ marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, backgroundColor: theme.colors.primary[100], paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: theme.colors.primary[700], fontSize: 12, fontWeight: '800' }}>
              {rightHint}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};


