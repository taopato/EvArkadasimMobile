import React from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { BASE_URL, GOOGLE_CLIENT_IDS, resolveMediaUrl } from '../shared/config/env';
import { shadow } from '../shared/ui/shadow';

const Row = ({ icon, title, desc, onPress, danger, styles, theme }) => (
  <TouchableOpacity
    activeOpacity={0.88}
    onPress={onPress}
    style={[styles.row, danger && styles.rowDanger]}
  >
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <Ionicons name={icon} size={20} color={danger ? theme.colors.error[700] : theme.colors.primary[600]} />
    </View>
    <View style={styles.rowBody}>
      <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
      {!!desc && <Text style={styles.rowDesc}>{desc}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={danger ? theme.colors.error[500] : theme.colors.neutral[400]} />
  </TouchableOpacity>
);

const isGoogleReadyForPlatform = () => {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS === 'ios') return Boolean(GOOGLE_CLIENT_IDS.ios || (isExpoGo && GOOGLE_CLIENT_IDS.expo));
  if (Platform.OS === 'android') return Boolean(GOOGLE_CLIENT_IDS.android || (isExpoGo && GOOGLE_CLIENT_IDS.expo));
  if (Platform.OS === 'web') return Boolean(GOOGLE_CLIENT_IDS.web);
  return Boolean(GOOGLE_CLIENT_IDS.web || GOOGLE_CLIENT_IDS.expo);
};

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);
  const appVersion = Constants?.expoConfig?.version || '1.0.0';
  const googleReady = isGoogleReadyForPlatform();

  const name = user?.fullName || user?.name || 'Kullanıcı';
  const houseName = user?.defaultHouseName || (user?.defaultHouseId ? `Ev #${user.defaultHouseId}` : 'Ev seçilmedi');
  const profileImage = resolveMediaUrl(user?.profileImageUrl);

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Hata', 'Çıkış yapılamadı');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{String(name).trim().charAt(0).toUpperCase() || 'K'}</Text>
            )}
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.house}>{houseName}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.editButton}
            onPress={() => navigation.navigate('ProfilDuzenle')}
          >
            <Text style={styles.editButtonText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Row
            icon="person-outline"
            title="Profil Bilgileri"
            desc={user?.email || 'Ad soyad ve iletişim bilgileri'}
            onPress={() => navigation.navigate('ProfilDuzenle')}
            styles={styles}
            theme={theme}
          />
          <Row
            icon="home-outline"
            title="Aktif Ev"
            desc={houseName}
            onPress={() => navigation.navigate('GrupListesi')}
            styles={styles}
            theme={theme}
          />
          <Row
            icon="color-palette-outline"
            title="Tema"
            desc="Açık veya gece görünümünü seç"
            onPress={() => navigation.navigate('ThemeSettingsScreen')}
            styles={styles}
            theme={theme}
          />
          <Row
            icon="language-outline"
            title="Dil Seçimi"
            desc="Türkçe / English"
            onPress={() => navigation.navigate('DilAyarlari')}
            styles={styles}
            theme={theme}
          />
          <Row
            icon="logo-google"
            title="Google Giriş"
            desc={googleReady ? 'Kurulum hazır' : 'Bu cihazda henüz yapılandırılmadı'}
            onPress={() =>
              Alert.alert(
                'Google ile Giriş',
                googleReady
                  ? 'Google ile giriş bu cihazda kullanılabilir. Giriş ekranından deneyebilirsiniz.'
                  : 'Google ile giriş için native istemci kimliği henüz tanımlanmamış. Bu ekranda bir ayar yok; e-posta ve şifre ile giriş yapmaya devam edebilirsiniz.'
              )
            }
            styles={styles}
            theme={theme}
          />
          <Row
            icon="shield-checkmark-outline"
            title="Gizlilik Politikası"
            desc="Verilerinin nasıl işlendiğini ve seçeneklerini gör"
            onPress={async () => {
              try {
                await Linking.openURL(`${BASE_URL}/privacy.html`);
              } catch {
                Alert.alert('Bağlantı açılamadı', 'Gizlilik politikası şu anda görüntülenemiyor.');
              }
            }}
            styles={styles}
            theme={theme}
          />
        </View>

        <View style={styles.section}>
          <Row
            icon="trash-outline"
            title="Hesabımı Sil"
            desc="Hesabını ve kişisel verilerini kalıcı olarak sil"
            onPress={() => navigation.navigate('HesabiSil')}
            danger
            styles={styles}
            theme={theme}
          />
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Uygulama</Text>
            <Text style={styles.metaValue}>v{appVersion}</Text>
          </View>
          {__DEV__ && (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>API (dev)</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{BASE_URL}</Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.88} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.text.onPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

    </View>
  );
}

const makeStyles = (theme, insets) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: insets.top + 16,
      paddingBottom: 32,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary[100],
      borderWidth: 1,
      borderColor: theme.colors.primary[200],
      marginRight: 14,
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: {
      color: theme.colors.primary[900],
      fontSize: 22,
      fontWeight: '900',
    },
    identity: {
      flex: 1,
    },
    name: {
      color: theme.colors.text.primary,
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 0,
    },
    house: {
      color: theme.colors.text.primary,
      opacity: 0.82,
      fontSize: 16,
      marginTop: 3,
    },
    editButton: {
      backgroundColor: theme.colors.primary[900],
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 12,
      ...shadow(1, 'rgba(23,40,57,0.18)'),
    },
    editButtonText: {
      color: theme.colors.text.onPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    section: {
      gap: 12,
      marginBottom: 22,
    },
    row: {
      minHeight: 68,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      ...shadow(1, 'rgba(23,40,57,0.10)'),
    },
    rowDanger: {
      borderColor: theme.colors.error[100],
      backgroundColor: theme.colors.error[50],
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.neutral[100],
      marginRight: 16,
    },
    rowIconDanger: {
      backgroundColor: theme.colors.error[100],
    },
    rowIconText: {
      color: theme.colors.primary[600],
      fontSize: 21,
      fontWeight: '800',
    },
    rowIconTextDanger: {
      color: theme.colors.error[700],
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    rowTitleDanger: {
      color: theme.colors.error[700],
    },
    rowDesc: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      marginTop: 4,
    },
    chevron: {
      color: theme.colors.neutral[500],
      fontSize: 28,
      lineHeight: 28,
      fontWeight: '300',
    },
    chevronDanger: {
      color: theme.colors.error[500],
    },
    metaCard: {
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      padding: 16,
      marginBottom: 22,
      ...shadow(1, 'rgba(23,40,57,0.08)'),
    },
    metaItem: {
      gap: 5,
    },
    metaDivider: {
      height: 1,
      backgroundColor: theme.colors.neutral[200],
      marginVertical: 14,
    },
    metaLabel: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    metaValue: {
      color: theme.colors.text.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    logoutButton: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      backgroundColor: theme.colors.error[500],
      ...shadow(2, 'rgba(217,108,95,0.22)'),
    },
    logoutIcon: {
      color: theme.colors.text.onPrimary,
      fontSize: 22,
      marginRight: 8,
      fontWeight: '800',
    },
    logoutText: {
      color: theme.colors.text.onPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
  });
