import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../../context/AuthContext';
import { shadow } from './shadow';

const items = [
  { key: 'home', label: 'Ana Sayfa', icon: 'home-outline', activeIcon: 'home', screen: 'Home' },
  { key: 'expenses', label: 'Giderler', icon: 'wallet-outline', activeIcon: 'wallet', screen: 'TumHarcamalar' },
  { key: 'bills', label: 'Faturalar', icon: 'receipt-outline', activeIcon: 'receipt', screen: 'Faturalar' },
  { key: 'payments', label: 'Ödemeler', icon: 'card-outline', activeIcon: 'card', screen: 'Odemeler' },
  { key: 'settings', label: 'Ayarlar', icon: 'settings-outline', activeIcon: 'settings', screen: 'Ayarlar' },
];

export default function PremiumBottomNav({ navigation, active = 'settings' }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(theme);

  const goTo = (screen) => {
    if (!navigation?.navigate) return;
    const houseId = user?.defaultHouseId ? Number(user.defaultHouseId) : undefined;
    const houseName = user?.defaultHouseName;
    if (screen === 'TumHarcamalar' || screen === 'Faturalar' || screen === 'Odemeler') {
      navigation.navigate(screen, { houseId, houseName });
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.86}
            onPress={() => goTo(item.screen)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Ionicons
              name={isActive ? item.activeIcon : item.icon}
              size={24}
              color={isActive ? theme.colors.success[700] : theme.colors.text.primary}
              style={styles.icon}
            />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    wrap: {
      minHeight: 76,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 10,
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
      height: 54,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 2,
    },
    itemActive: {
      backgroundColor: theme.colors.success[100],
    },
    icon: {
      marginBottom: 3,
    },
    label: {
      color: theme.colors.text.primary,
      fontSize: 10,
      fontWeight: '700',
    },
    labelActive: {
      color: theme.colors.success[700],
      fontWeight: '900',
    },
  });
