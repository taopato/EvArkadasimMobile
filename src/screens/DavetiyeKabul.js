import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi, houseApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';
import { getPasswordValidationErrors } from '../shared/validation/authValidation';

const getInviteParams = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { token: '', houseId: 0, email: '' };
  }
  const params = new URLSearchParams(window.location.search || '');
  return {
    token: params.get('token') || '',
    houseId: Number(params.get('houseId')) || 0,
    email: params.get('email') || '',
  };
};

export default function DavetiyeKabul({ navigation, route }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { user, login, logout, setDefaultHouseId } = useAuth();
  const webParams = useMemo(getInviteParams, []);

  const token = route?.params?.token || webParams.token || route?.params?.invitationToken || '';
  const houseId = Number(route?.params?.houseId || route?.params?.invitationHouseId || webParams.houseId || 0);
  const invitedEmail = route?.params?.email || route?.params?.invitationEmail || webParams.email || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const finishJoin = async (joinedHouseId) => {
    const safeHouseId = Number(joinedHouseId || houseId || 0);
    if (safeHouseId) {
      try {
        const houseResponse = await houseApi.getById(safeHouseId);
        await setDefaultHouseId(safeHouseId, houseResponse?.data?.name || houseResponse?.data?.data?.name);
      } catch {
        await setDefaultHouseId(safeHouseId);
      }
    }
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const joinWithCurrentUser = async () => {
    if (!token) {
      Alert.alert('Davet bulunamadı', 'Davet linki geçersiz veya süresi dolmuş olabilir.');
      return;
    }
    setJoining(true);
    try {
      const response = await houseApi.acceptInvitation(token);
      Alert.alert('Başarılı', response?.data?.message || 'Eve katıldınız.');
      await finishJoin(response?.data?.houseId || response?.data?.data?.houseId);
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || error?.message || 'Davet kabul edilemedi.');
    } finally {
      setJoining(false);
    }
  };

  const registerAndJoin = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Eksik bilgi', 'Ad soyad, e-posta ve şifre alanları zorunludur.');
      return;
    }
    const passwordErrors = getPasswordValidationErrors(password);
    if (passwordErrors.length > 0) {
      Alert.alert('Şifre zayıf', passwordErrors[0]);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Şifreler eşleşmiyor', 'İki şifre alanı aynı olmalıdır.');
      return;
    }
    if (!token) {
      Alert.alert('Davet bulunamadı', 'Davet tokeni eksik.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.verifyCodeAndRegister(
        email.trim().toLowerCase(),
        '',
        fullName.trim(),
        password,
        token,
      );
      const data = response?.data || {};
      if (!data.token || !data.user) {
        throw new Error(data?.raw?.message || 'Kayıt tamamlanamadı.');
      }
      await login(data.user, data.token);
      Alert.alert('Başarılı', 'Hesabınız oluşturuldu ve eve katıldınız.');
      await finishJoin(data?.raw?.joinedHouseId || data?.raw?.data?.joinedHouseId);
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || error?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const activeUserMismatch =
    !!user?.email &&
    !!invitedEmail &&
    String(user.email).trim().toLowerCase() !== String(invitedEmail).trim().toLowerCase();

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Davet Kabul Et</Text>
          <View style={styles.avatar}>
            <Ionicons name="home" size={20} color={theme.colors.primary[900]} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Roomora</Text>
          <Text style={styles.title}>Bu eve davet edildiniz</Text>
          <Text style={styles.subtitle}>
            Daveti mevcut hesabınızla kabul edebilir veya yeni hesap oluşturup eve katılabilirsiniz.
          </Text>
          {!!invitedEmail && <Text style={styles.inviteEmail}>{invitedEmail}</Text>}
        </View>

        {!token && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Davet linki geçersiz</Text>
            <Text style={styles.helpText}>Link eksik, hatalı ya da süresi dolmuş olabilir.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.primaryText}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!token && !!user && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mevcut hesap</Text>
            <Text style={styles.helpText}>{user.email || 'Oturum açık'} hesabı ile devam ediyorsunuz.</Text>
            {activeUserMismatch ? (
              <>
                <Text style={styles.warning}>
                  Bu davet {invitedEmail} adresine gönderildi. Katılmak için bu adresle giriş yapın.
                </Text>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={async () => {
                    await logout();
                    navigation.navigate('Login', {
                      invitationToken: token,
                      invitationHouseId: houseId,
                      invitationEmail: invitedEmail,
                    });
                  }}
                >
                  <Text style={styles.outlineText}>Hesabı değiştir</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={joinWithCurrentUser} disabled={joining}>
                {joining ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>Eve katıl</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!token && !user && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Zaten hesabınız var mı?</Text>
              <Text style={styles.helpText}>Giriş yaptıktan sonra davet otomatik olarak hesabınızla eşleşir.</Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() =>
                  navigation.navigate('Login', {
                    invitationToken: token,
                    invitationHouseId: houseId,
                    invitationEmail: invitedEmail,
                  })
                }
              >
                <Text style={styles.outlineText}>Hesabımla giriş yap</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Yeni hesap oluştur</Text>
              <TextInput
                style={styles.input}
                placeholder="Ad soyad"
                placeholderTextColor={theme.colors.text.disabled}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, invitedEmail && styles.lockedInput]}
                placeholder="E-posta"
                placeholderTextColor={theme.colors.text.disabled}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!invitedEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={theme.colors.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Şifre tekrar"
                placeholderTextColor={theme.colors.text.disabled}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
              <TouchableOpacity style={styles.primaryButton} onPress={registerAndJoin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryText}>Hesap oluştur ve katıl</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 24,
      paddingTop: insets.top + 14,
      paddingBottom: 36,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      paddingTop: 12,
    },
    iconButton: {
      alignItems: 'center',
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    iconText: {
      color: theme.colors.text.primary,
      fontSize: 42,
      lineHeight: 42,
    },
    topTitle: {
      color: theme.colors.text.primary,
      fontSize: 22,
      fontWeight: '900',
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary[100],
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    avatarText: {
      color: theme.colors.primary[900],
      fontSize: 12,
      fontWeight: '900',
    },
    heroCard: {
      backgroundColor: theme.colors.primary[900],
      borderRadius: 28,
      marginBottom: 18,
      padding: 24,
      ...shadow(4, 'rgba(23,40,57,0.24)'),
    },
    eyebrow: {
      color: theme.colors.primary[200],
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 10,
    },
    title: {
      color: '#ffffff',
      fontSize: 30,
      fontWeight: '900',
      lineHeight: 36,
      marginBottom: 10,
    },
    subtitle: {
      color: theme.colors.primary[100],
      fontSize: 15,
      lineHeight: 22,
    },
    inviteEmail: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 999,
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
      marginTop: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.neutral[200],
      borderRadius: 24,
      borderWidth: 1,
      marginBottom: 16,
      padding: 20,
      ...shadow(3, 'rgba(23,40,57,0.12)'),
    },
    sectionTitle: {
      color: theme.colors.text.primary,
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 8,
    },
    helpText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 16,
    },
    warning: {
      color: theme.colors.warning[700],
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 21,
      marginBottom: 14,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.neutral[300],
      borderRadius: 16,
      borderWidth: 1,
      color: theme.colors.text.primary,
      fontSize: 16,
      marginBottom: 12,
      minHeight: 54,
      paddingHorizontal: 16,
    },
    lockedInput: {
      backgroundColor: theme.colors.neutral[100],
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary[900],
      borderRadius: 18,
      justifyContent: 'center',
      minHeight: 54,
      paddingHorizontal: 18,
    },
    primaryText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
    },
    outlineButton: {
      alignItems: 'center',
      borderColor: theme.colors.primary[900],
      borderRadius: 18,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 54,
      paddingHorizontal: 18,
    },
    outlineText: {
      color: theme.colors.primary[900],
      fontSize: 16,
      fontWeight: '900',
    },
  });
