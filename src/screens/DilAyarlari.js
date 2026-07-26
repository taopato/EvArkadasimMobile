import React, { useEffect, useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useLanguage } from '../context/LanguageContext';
import { PageHeader } from '../shared/ui/roomora/CanonicalUI';

const OPTIONS = [
  { key: 'tr', title: 'Türkçe', subtitle: 'Roomora uygulama dili' },
];

export default function LanguageSettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (language !== 'tr') setLanguage('tr').catch(() => {});
  }, [language, setLanguage]);

  const onSelect = async (key) => {
    if (key === language) return;
    try {
      await setLanguage(key);
      Alert.alert('Başarılı', 'Dil güncellendi.');
    } catch {
      Alert.alert('Hata', 'Dil ayarlanırken bir sorun oluştu.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
      <PageHeader title="Dil Ayarları" onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>Roomora şu anda Türkçe olarak sunulmaktadır.</Text>

      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const active = option.key === language;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.item, active && styles.itemActive]}
              activeOpacity={0.88}
              onPress={() => onSelect(option.key)}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{option.title}</Text>
                <Text style={styles.itemSub}>{option.subtitle}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary[600]} />
              ) : (
                <View style={styles.dot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 24,
      fontWeight: '900',
      marginBottom: 8,
    },
    subtitle: {
      color: theme.colors.text.secondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    list: {
      gap: 12,
    },
    item: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      backgroundColor: theme.colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemActive: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    itemLeft: {
      flex: 1,
      paddingRight: 12,
    },
    itemTitle: {
      color: theme.colors.text.primary,
      fontWeight: '800',
      fontSize: 16,
      marginBottom: 2,
    },
    itemSub: {
      color: theme.colors.text.secondary,
      fontSize: 13,
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.colors.neutral[400],
      backgroundColor: 'transparent',
    },
  });
