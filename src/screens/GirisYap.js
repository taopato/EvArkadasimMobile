import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { TextInput as ThemedTextInput } from '../shared/ui/TextInput';
import { Button as ThemedButton } from '../shared/ui/Button';
import { GOOGLE_CLIENT_IDS } from '../shared/config/env';

WebBrowser.maybeCompleteAuthSession();

const LOGO = require('../assets/icon.png');

const GirisYap = ({ navigation }) => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const CommonStyles = useCommonStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isExpoGo = Constants?.appOwnership === 'expo';
  const projectNameForProxy = Constants?.expoConfig?.owner && Constants?.expoConfig?.slug
    ? `@${Constants.expoConfig.owner}/${Constants.expoConfig.slug}`
    : undefined;

  const googleConfigured = useMemo(
    () => Boolean(
      GOOGLE_CLIENT_IDS.web ||
      GOOGLE_CLIENT_IDS.android ||
      GOOGLE_CLIENT_IDS.ios ||
      GOOGLE_CLIENT_IDS.expo
    ),
    []
  );

  const googleClientConfig = useMemo(
    () => ({
      expoClientId: GOOGLE_CLIENT_IDS.expo || undefined,
      webClientId: GOOGLE_CLIENT_IDS.web || undefined,
      androidClientId: GOOGLE_CLIENT_IDS.android || undefined,
      iosClientId: GOOGLE_CLIENT_IDS.ios || undefined,
      clientId: GOOGLE_CLIENT_IDS.web || GOOGLE_CLIENT_IDS.expo || undefined,
    }),
    []
  );

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
      scheme: 'evarkadasim',
      path: 'oauthredirect',
    });
  }, [isExpoGo, projectNameForProxy]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientConfig.clientId,
    expoClientId: googleClientConfig.expoClientId,
    webClientId: googleClientConfig.webClientId,
    androidClientId: googleClientConfig.androidClientId,
    iosClientId: googleClientConfig.iosClientId,
    redirectUri: googleRedirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
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
          user = { id: userId ?? 0, fullName: fullName ?? email, email: emailFromApi ?? email };
        }
      }

      if (token && user) {
        await login(user, token);
        return;
      }

      Alert.alert('Giriş başarısız', raw?.message || 'Lütfen bilgilerinizi kontrol edin.');
    } catch (error) {
      const status = error?.response?.status;
      const raw = error?.response?.data?.message || error?.response?.data || error?.message || '';
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const lower = text.toLowerCase();

      let message = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      if (status === 401 || lower.includes('şifre') || lower.includes('password') || lower.includes('invalid')) {
        message = 'E-posta veya şifre hatalı.';
      } else if (lower.includes('locked') || lower.includes('kilit')) {
        message = 'Hesabınız geçici olarak kilitlendi. Bir süre sonra tekrar deneyin.';
      } else if (text) {
        message = text;
      }

      Alert.alert('Giriş başarısız', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleConfigured || (isExpoGo && !GOOGLE_CLIENT_IDS.web)) {
      Alert.alert(
        'Google girişi hazır değil',
        isExpoGo
          ? 'Expo Go ile test için GOOGLE_EXPO_CLIENT_ID alanı doldurulmalı.'
          : 'Frontend ve backend için Google client ID alanları henüz doldurulmamış görünüyor.'
      );
      return;
    }

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
        Alert.alert('Google girişi başarısız', 'Google kimlik doğrulama belirteci alınamadı.');
        return;
      }

      try {
        const apiResponse = await authApi.googleLogin(idToken);
        const payload = apiResponse?.data || {};
        const token = payload?.token;
        const user = payload?.user;

        if (!token || !user) {
          throw new Error('Google giriş yanıtı eksik.');
        }

        await login(user, token);
      } catch (error) {
        Alert.alert('Google girişi başarısız', error?.response?.data?.message || error?.message || 'Sunucuya giriş yapılamadı.');
      } finally {
        setGoogleLoading(false);
      }
    };

    runGoogleLogin();
  }, [response, login, navigation]);

  return (
    <KeyboardAvoidingView
      style={[CommonStyles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[CommonStyles.content, styles.content, { backgroundColor: theme.colors.background }]}>
          <View style={styles.hero}>
            <View style={[styles.logoWrap, { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[200] }]}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={[styles.heading, { color: theme.colors.text.primary }]}>Ev Arkadaşım</Text>
            <Text style={[styles.subheading, { color: theme.colors.text.secondary }]}>
              Harcamaları paylaş, borçları gör, ödemeleri tek yerden yönet.
            </Text>
          </View>

          <View style={[CommonStyles.card, styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral[200] }]}>
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

            <TouchableOpacity
              style={[styles.googleButton, { borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.background }]}
              onPress={handleGoogleLogin}
              disabled={!request || googleLoading}
              activeOpacity={0.85}
            >
              <Text style={[styles.googleIcon, { color: theme.colors.primary[600] }]}>G</Text>
              <Text style={[styles.googleText, { color: theme.colors.text.primary }]}>
                {googleLoading ? 'Google ile bağlanılıyor...' : 'Google ile giriş yap'}
              </Text>
            </TouchableOpacity>

            {!googleConfigured && (
              <Text style={[styles.helper, { color: theme.colors.warning[600] }]}>
                Google client ID bilgileri tanımlanınca bu buton aktif şekilde çalışacak.
              </Text>
            )}

            {googleConfigured && isExpoGo && (
              <Text style={[styles.helper, { color: theme.colors.warning[600] }]}>
                Expo Go ile denemek için ayrıca `GOOGLE_EXPO_CLIENT_ID` tanımlanmalı.
              </Text>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
              <Text style={[styles.link, { color: theme.colors.text.secondary }]}>Şifremi unuttum</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SignupScreen')}>
              <Text style={[styles.link, { color: theme.colors.primary[600] }]}>Hesabın yok mu? Kayıt ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    justifyContent: 'center',
    paddingVertical: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    width: '100%',
    borderWidth: 1,
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
