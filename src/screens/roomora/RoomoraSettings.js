import React, { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { resolveMediaUrl } from '../../shared/config/env';
import { Avatar, PageHeader } from '../../shared/ui/roomora/CanonicalUI';
import { shadow } from '../../shared/ui/shadow';

const sections = [
  {
    title: 'Hesap',
    rows: [
      { icon: 'person-outline', label: 'Profil Düzenle', route: 'ProfilDuzenle' },
      { icon: 'home-outline', label: 'Ev Yönetimi', route: 'GrupListesi' },
      { icon: 'card-outline', label: 'IBAN Bilgileri', route: 'IbanBilgileri' },
    ],
  },
  {
    title: 'Tercihler',
    rows: [
      { icon: 'notifications-outline', label: 'Bildirim Ayarları', route: 'NotificationSettings' },
      { icon: 'moon-outline', label: 'Tema Ayarları', route: 'ThemeSettingsScreen' },
      { icon: 'language-outline', label: 'Dil Ayarları', route: 'LanguageSettings' },
    ],
  },
  {
    title: 'Güvenlik ve Destek',
    rows: [
      { icon: 'shield-checkmark-outline', label: 'Güvenlik', route: 'SecuritySettings' },
      { icon: 'lock-closed-outline', label: 'Gizlilik Politikası', route: 'LegalDocument', params: { type: 'privacy' } },
      { icon: 'document-text-outline', label: 'Kullanım Koşulları', route: 'LegalDocument', params: { type: 'terms' } },
      { icon: 'information-circle-outline', label: 'Hakkında', route: 'About' },
    ],
  },
];

export default function RoomoraSettings({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const version = Constants?.expoConfig?.version || '1.0.0';

  const confirmLogout = () => Alert.alert(
    'Çıkış yapılsın mı?',
    'Roomora hesabından çıkış yapacaksın.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
    ]
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Ayarlar" subtitle="Hesabını ve tercihlerini yönet" />

        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('ProfilDuzenle')}
          activeOpacity={0.86}
        >
          <Avatar
            name={user?.fullName}
            uri={resolveMediaUrl(user?.profileImageUrl)}
            size={56}
          />
          <View style={styles.profileBody}>
            <Text style={styles.profileName}>{user?.fullName || 'Kullanıcı'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'Profil bilgileri'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[400]} />
        </TouchableOpacity>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.group}>
              {section.rows.map((row, index) => (
                <TouchableOpacity
                  key={row.label}
                  style={[styles.row, index < section.rows.length - 1 && styles.rowBorder]}
                  onPress={() => navigation.navigate(row.route, row.params)}
                  activeOpacity={0.82}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={row.icon} size={20} color={theme.colors.primary[700]} />
                  </View>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Ionicons name="chevron-forward" size={19} color={theme.colors.neutral[400]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logout} onPress={confirmLogout} activeOpacity={0.84}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.error[700]} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Roomora v{version}</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 32 },
  profileCard: {
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 14,
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  profileBody: { flex: 1 },
  profileName: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 17,
  },
  profileEmail: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  section: { marginTop: 22 },
  sectionTitle: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.bold,
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.semibold,
    fontSize: 15,
  },
  logout: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[100],
    backgroundColor: theme.colors.error[50],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  logoutText: {
    color: theme.colors.error[700],
    fontFamily: theme.typography.bold,
    fontSize: 15,
  },
  version: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    marginTop: 14,
  },
});
