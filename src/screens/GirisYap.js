import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { authApi, houseApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { TextInput as ThemedTextInput } from '../shared/ui/TextInput';
import { Button as ThemedButton } from '../shared/ui/Button';
import { GOOGLE_CLIENT_IDS } from '../shared/config/env';
import { isValidEmail, normalizeEmail } from '../shared/validation/authValidation';
import { shadow } from '../shared/ui/shadow';

WebBrowser.maybeCompleteAuthSession();

const getGooglePlatformReady = () => {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS === 'ios') return Boolean(GOOGLE_CLIENT_IDS.ios || (isExpoGo && GOOGLE_CLIENT_IDS.expo));
  if (Platform.OS === 'android') return Boolean(GOOGLE_CLIENT_IDS.android || (isExpoGo && GOOGLE_CLIENT_IDS.expo));
  if (Platform.OS === 'web') return Boolean(GOOGLE_CLIENT_IDS.web);
  return Boolean(GOOGLE_CLIENT_IDS.web || GOOGLE_CLIENT_IDS.expo);
};

const GoogleLoginButton = ({ onSuccess, theme, styles }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const isExpoGo = Constants?.appOwnership === 'expo';
  const platformReady = getGooglePlatformReady();

  const projectNameForProxy = Constants?.expoConfig?.owner && Constants?.expoConfig?.slug
    ? `@${Constants.expoConfig.owner}/${Constants.expoConfig.slug}`
    : undefined;

  const googleRedirectUri = useMemo(() => {
    if (isExpoGo) {
      try {
        return AuthSession.getRedirectUrl();
      } catch {
        if (projectNameForProxy) {
          return `https://auth.expo.io/${projectNameForProxy}`;
        }
      }
    }

    return AuthSession.makeRedirectUri({
      scheme: 'roomora',
      path: 'oauthredirect',
    });
  }, [isExpoGo, projectNameForProxy]);

  if (!platformReady) return null;

  return (
    <GoogleLoginButtonReady
      onSuccess={onSuccess}
      theme={theme}
      styles={styles}
      googleRedirectUri={googleRedirectUri}
      googleLoading={googleLoading}
      setGoogleLoading={setGoogleLoading}
    />
  );
};

const GoogleLoginButtonReady = ({
  onSuccess,
  theme,
  styles,
  googleRedirectUri,
  googleLoading,
  setGoogleLoading,
}) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.web || GOOGLE_CLIENT_IDS.expo || undefined,
    expoClientId: GOOGLE_CLIENT_IDS.expo || undefined,
    webClientId: GOOGLE_CLIENT_IDS.web || undefined,
    androidClientId: GOOGLE_CLIENT_IDS.android || GOOGLE_CLIENT_IDS.expo || undefined,
    iosClientId: GOOGLE_CLIENT_IDS.ios || GOOGLE_CLIENT_IDS.expo || undefined,
    redirectUri: googleRedirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await promptAsync();
    } catch (error) {
      Alert.alert('Google girişi başarısız', error?.message || 'İşlem başlatılamadı.');
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const runGoogleLogin = async () => {
      if (response?.type !== 'success') {
        if (response?.type && response.type !== 'dismiss') {
          setGoogleLoading(false);
        }
        return;
      }

      const idToken = response?.params?.id_token || response?.authentication?.idToken;
      if (!idToken) {
        setGoogleLoading(false);
        Alert.alert('Google girişi başarısız', 'Google kimlik belirteci alınamadı.');
        return;
      }

      try {
        await onSuccess(idToken);
      } finally {
        setGoogleLoading(false);
      }
    };

    runGoogleLogin();
  }, [response, onSuccess, setGoogleLoading]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.googleButton,
          {
            borderColor: theme.colors.neutral[200],
            backgroundColor: theme.colors.background,
          },
        ]}
        onPress={handleGoogleLogin}
        disabled={!request || googleLoading}
        activeOpacity={0.85}
      >
        <Text style={[styles.googleIcon, { color: theme.colors.primary[600] }]}>G</Text>
        <Text style={[styles.googleText, { color: theme.colors.text.primary }]}>
          {googleLoading ? 'Google ile bağlanılıyor...' : 'Google ile giriş yap'}
        </Text>
      </TouchableOpacity>

    </>
  );
};

const AppleSignInButton = ({ onSuccess }) => {
  const [available, setAvailable] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={{ height: 48, marginTop: 12 }}
      onPress={async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          const fullName = credential.fullName
            ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
            : undefined;
          await onSuccess(credential.identityToken, fullName);
        } catch (error) {
          if (error?.code === 'ERR_REQUEST_CANCELED') return;
          Alert.alert('Apple girişi başarısız', error?.message || 'İşlem tamamlanamadı.');
        }
      }}
    />
  );
};

const GirisYap = ({ navigation, route }) => {
  const { login, setDefaultHouseId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const CommonStyles = useCommonStyles();
  const invitationToken = route?.params?.invitationToken || '';
  const invitationHouseId = Number(route?.params?.invitationHouseId || 0);
  const invitationEmail = route?.params?.invitationEmail || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const finalizeInvitationIfNeeded = async () => {
    if (!invitationToken) return;

    const inviteResponse = await houseApi.acceptInvitation(invitationToken);
    const joinedHouseId = Number(
      inviteResponse?.data?.houseId ||
        inviteResponse?.data?.data?.houseId ||
        invitationHouseId ||
        0
    );

    if (joinedHouseId) {
      try {
        const houseResponse = await houseApi.getById(joinedHouseId);
        await setDefaultHouseId(joinedHouseId, houseResponse?.data?.name || houseResponse?.data?.data?.name);
      } catch {
        await setDefaultHouseId(joinedHouseId);
      }
    }
  };

  const ensureDefaultHouse = async (userId) => {
    if (!userId) return;
    try {
      const response = await houseApi.getUserHouses(userId);
      const raw = response?.data?.data ?? response?.data ?? [];
      const houses = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const firstHouse = houses[0];
      const houseId = firstHouse?.id ?? firstHouse?.Id;
      const houseName = firstHouse?.name ?? firstHouse?.Name;
      if (houseId) {
        await setDefaultHouseId(houseId, houseName);
      }
    } catch (error) {
      console.error('Varsayilan ev secilemedi:', error?.response?.data || error?.message || error);
    }
  };

  const handleLogin = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Hata', 'Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({
        email: normalizedEmail,
        password,
      });
      const raw = response?.data || {};
      const data = raw?.data ?? raw ?? {};

      const getDeep = (obj, predicate) => {
        const stack = [obj];
        while (stack.length) {
          const current = stack.pop();
          if (!current || typeof current !== 'object') continue;
          if (predicate(current)) return current;
          for (const key of Object.keys(current)) {
            const value = current[key];
            if (value && typeof value === 'object') stack.push(value);
          }
        }
        return null;
      };

      const findValueByKeyList = (obj, keys) => {
        const lowered = keys.map((key) => key.toLowerCase());
        const node = getDeep(obj, (candidate) =>
          Object.keys(candidate).some((key) => lowered.includes(key.toLowerCase()))
        );

        if (!node) return undefined;
        for (const key of Object.keys(node)) {
          if (lowered.includes(key.toLowerCase())) return node[key];
        }
        return undefined;
      };

      const token = findValueByKeyList(data, ['token', 'accessToken', 'jwt', 'jwtToken']);
      let user = findValueByKeyList(data, ['user', 'userDto', 'account', 'profile', 'userInfo']);

      if (!user) {
        const userId = findValueByKeyList(data, ['userId', 'id']);
        const fullName = findValueByKeyList(data, ['fullName', 'name']);
        const emailFromApi = findValueByKeyList(data, ['email', 'mail']);
        if (userId || fullName || emailFromApi) {
          user = {
            id: userId ?? 0,
            fullName: fullName ?? normalizedEmail,
            email: emailFromApi ?? normalizedEmail,
          };
        }
      }

      if (token && user) {
        await login(user, token);
        await finalizeInvitationIfNeeded();
        await ensureDefaultHouse(Number(user?.id ?? user?.userId ?? 0));
        return;
      }

      Alert.alert('Giriş başarısız', raw?.message || 'Lütfen bilgilerinizi kontrol edin.');
    } catch (error) {
      const status = error?.response?.status;
      const raw =
        error?.response?.data?.message || error?.response?.data || error?.message || '';
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const lower = text.toLowerCase();

      let message = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      if (status === 401 && (lower.includes('kayitli bir kullanici bulunamadi') || lower.includes('uye olun'))) {
        message = 'Bu e-posta ile kayıtlı bir hesap bulunamadı. Lütfen önce üye olun.';
      } else if (status === 401 && (lower.includes('sifreniz yanlis') || lower.includes('wrong password'))) {
        message = 'Şifreniz yanlış. Lütfen tekrar deneyin.';
      } else if (status === 401) {
        message = 'E-posta veya şifre hatalı.';
      } else if (text) {
        message = text;
      }

      Alert.alert('Giriş başarısız', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken) => {
    try {
      const apiResponse = await authApi.googleLogin(idToken);
      const payload = apiResponse?.data || {};
      const token = payload?.token;
      const user = payload?.user;

      if (!token || !user) {
        throw new Error('Google giriş yanıtı eksik.');
      }

      await login(user, token);
      await finalizeInvitationIfNeeded();
      await ensureDefaultHouse(Number(user?.id ?? user?.userId ?? 0));
    } catch (error) {
      Alert.alert(
        'Google girişi başarısız',
        error?.response?.data?.message || error?.message || 'Sunucuya giriş yapılamadı.'
      );
    }
  };

  const handleAppleSuccess = async (identityToken, fullName) => {
    try {
      const apiResponse = await authApi.appleLogin(identityToken, fullName);
      const payload = apiResponse?.data || {};
      const token = payload?.token;
      const user = payload?.user;

      if (!token || !user) {
        throw new Error('Apple giriş yanıtı eksik.');
      }

      await login(user, token);
      await finalizeInvitationIfNeeded();
      await ensureDefaultHouse(Number(user?.id ?? user?.userId ?? 0));
    } catch (error) {
      Alert.alert(
        'Apple girişi başarısız',
        error?.response?.data?.message || error?.message || 'Sunucuya giriş yapılamadı.'
      );
    }
  };

  return (
    <View style={[CommonStyles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        <View
          style={[
            CommonStyles.content,
            styles.content,
            { backgroundColor: theme.colors.background, paddingTop: insets.top + 12 },
          ]}
        >
          <View style={styles.hero}>
            <View style={[styles.logoTile, shadow(3, 'rgba(23,40,57,0.28)')]}>
              <Image source={require('../assets/mark-navy.png')} style={{ width: 192, height: 192 }} resizeMode="contain" />
            </View>
            <Text style={[styles.heading, { color: theme.colors.text.primary }]}>
              Roomora
            </Text>
            <Text style={[styles.subheading, { color: theme.colors.text.secondary }]}>
              Harcamaları paylaş, borçları gör, ödemeleri tek yerden yönet.
            </Text>
            {!!invitationEmail && (
              <Text style={[styles.inviteNote, { color: theme.colors.success[700], backgroundColor: theme.colors.success[50] }]}>
                Davet: {invitationEmail}
              </Text>
            )}
          </View>

          <View
            style={[
              CommonStyles.card,
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.neutral[200],
              },
            ]}
          >
            <ThemedTextInput
              style={{ marginBottom: 12 }}
              placeholder="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <ThemedTextInput
              style={{ marginBottom: 12 }}
              placeholder="Şifre"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <ThemedButton title="Giriş Yap" onPress={handleLogin} loading={loading} />

            <GoogleLoginButton onSuccess={handleGoogleSuccess} theme={theme} styles={styles} />
            <AppleSignInButton onSuccess={handleAppleSuccess} />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
              <Text style={[styles.link, { color: theme.colors.text.secondary }]}>
                Şifremi unuttum
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SignupScreen')}>
              <Text style={[styles.link, { color: theme.colors.primary[600] }]}>
                Hesabın yok mu? Kayıt ol
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    justifyContent: 'center',
    paddingVertical: 18,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoTile: {
    width: 192,
    height: 192,
    borderRadius: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  inviteNote: {
    borderRadius: 999,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 22,
  },
  googleButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  helper: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  link: {
    marginTop: 14,
    textAlign: 'center',
  },
});

export default GirisYap;
