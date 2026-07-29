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
          <Text style={{ color: theme.colors.text.primary, fontFamily: theme.typography?.extrabold, fontSize: 24, letterSpacing: 0 }}>{title}</Text>
          {!!subtitle && (
            <Text style={{ color: theme.colors.text.secondary, fontFamily: theme.typography?.regular, marginTop: 4, fontSize: 14, letterSpacing: 0 }}>
              {subtitle}
            </Text>
          )}
        </View>
        {onPrimaryAction ? <PremiumButton title={primaryLabel} size="small" onPress={onPrimaryAction} /> : null}
      </View>
      <View
        style={{
          marginTop: 16,
          borderRadius: theme.radius.sm,
          padding: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.neutral[200],
          ...shadow(2, 'rgba(23,40,57,0.12)'),
        }}
      >
        {!!amount && (
          <View>
            <Text style={{ color: theme.colors.text.primary, opacity: 0.82, fontFamily: theme.typography?.semibold, fontSize: 14 }}>Toplam</Text>
            <Text style={{ color: theme.colors.text.primary, fontFamily: theme.typography?.extrabold, fontSize: 32, marginTop: 6, letterSpacing: 0 }}>
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
