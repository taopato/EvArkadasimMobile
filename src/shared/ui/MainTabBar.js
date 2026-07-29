import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { shadow } from './shadow';

const META = {
  Home: { label: 'Ana Sayfa', icon: 'home-outline', activeIcon: 'home' },
  TumHarcamalar: { label: 'Giderler', icon: 'wallet-outline', activeIcon: 'wallet' },
  Notlar: { label: 'Notlar', icon: 'document-text-outline', activeIcon: 'document-text' },
  Faturalar: { label: 'Faturalar', icon: 'receipt-outline', activeIcon: 'receipt' },
  Ayarlar: { label: 'Ayarlar', icon: 'settings-outline', activeIcon: 'settings' },
};

// Gerçek, kalıcı bottom-tab bar: React Navigation'ın kendi tab state'ini kullanır,
// bu yüzden sekme değiştirirken bar yeniden mount olmaz / "yenileniyor" hissi vermez.
export default function MainTabBar({ state, navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets.bottom);

  return (
    <View style={styles.wrap}>
      {state.routes.map((route, index) => {
        const meta = META[route.name] || { label: route.name, icon: 'ellipse-outline', activeIcon: 'ellipse' };
        const isActive = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : {}}
            activeOpacity={0.86}
            onPress={onPress}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Ionicons
              name={isActive ? meta.activeIcon : meta.icon}
              size={24}
              color={isActive ? theme.colors.primary[600] : theme.colors.text.secondary}
              style={styles.icon}
            />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (theme, bottomInset) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: 5,
      paddingTop: 7,
      paddingBottom: Math.max(bottomInset, 8),
      borderTopWidth: 1,
      borderTopColor: theme.colors.neutral[200],
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...shadow(2, 'rgba(23,40,57,0.14)'),
    },
    item: {
      flex: 1,
      minWidth: 0,
      height: 55,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 1,
    },
    itemActive: {
      backgroundColor: theme.colors.primary[50],
    },
    icon: {
      marginBottom: 3,
    },
    label: {
      color: theme.colors.text.secondary,
      fontFamily: theme.typography?.semibold,
      fontSize: 10,
      letterSpacing: 0,
    },
    labelActive: {
      color: theme.colors.primary[700],
      fontFamily: theme.typography?.bold,
    },
  });
