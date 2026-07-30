import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { isSixDigitCode, isStrongPassword, isValidEmail, normalizeEmail, PASSWORD_RULES_TEXT } from '../../shared/validation/authValidation';
import { PageHeader, PrimaryButton } from '../../shared/ui/roomora/CanonicalUI';
import BrandMark from '../../components/BrandMark';

function AuthLayout({ navigation, title, subtitle, icon, children }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]} keyboardShouldPersistTaps="handled">
        <PageHeader title="" onBack={() => navigation.goBack()} />
        <View style={styles.brand}><BrandMark variant="mark" size={62} /><Text style={styles.brandName}>Roomora</Text></View>
        <View style={styles.icon}><Ionicons name={icon} size={28} color={theme.colors.primary[700]} /></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={theme.colors.text.disabled} style={styles.input} {...props} />
    </View>
  );
}

export function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const value = normalizeEmail(email);
    if (!isValidEmail(value)) return Alert.alert('Geçersiz e-posta', 'Geçerli bir e-posta adresi girin.');
    setLoading(true);
    try {
      await authApi.sendVerificationCode(value, 'reset');
      navigation.navigate('ResetPasswordScreen', { email: value });
    } catch (error) {
      Alert.alert('Kod gönderilemedi', error?.response?.data?.message ?? 'Lütfen tekrar deneyin.');
    } finally { setLoading(false); }
  };
  return (
    <AuthLayout navigation={navigation} title="Şifremi Unuttum" subtitle="E-posta adresini gir, şifreni yenilemen için bir kod gönderelim." icon="key-outline">
      <Field label="E-posta adresi" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="ornek@email.com" />
      <PrimaryButton label={loading ? 'Gönderiliyor...' : 'Kod Gönder'} icon="paper-plane-outline" onPress={submit} disabled={loading} />
    </AuthLayout>
  );
}

export function ResetPasswordScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const email = normalizeEmail(route?.params?.email);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!isSixDigitCode(code)) return Alert.alert('Geçersiz kod', 'Doğrulama kodu 6 haneli olmalıdır.');
    if (!isStrongPassword(password)) return Alert.alert('Şifre koşulları', PASSWORD_RULES_TEXT);
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, password);
      Alert.alert('Şifren güncellendi', 'Yeni şifrenle giriş yapabilirsin.', [{ text: 'Giriş Yap', onPress: () => navigation.navigate('Login') }]);
    } catch (error) {
      Alert.alert('Şifre güncellenemedi', error?.response?.data?.message ?? 'Lütfen tekrar deneyin.');
    } finally { setLoading(false); }
  };
  return (
    <AuthLayout navigation={navigation} title="Yeni Şifre Belirle" subtitle={`${email || 'E-posta adresin'} için gönderilen kodu ve yeni şifreni gir.`} icon="lock-closed-outline">
      <Field label="Doğrulama kodu" value={code} onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="000000" />
      <Field label="Yeni şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 8 karakter" />
      <Text style={styles.helper}>{PASSWORD_RULES_TEXT}</Text>
      <PrimaryButton label={loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'} icon="checkmark" onPress={submit} disabled={loading} />
    </AuthLayout>
  );
}

export function VerificationScreen({ route, navigation }) {
  const { login } = useAuth();
  const { email, fullName, password } = route?.params || {};
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    if (!seconds) return undefined;
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  const verify = async () => {
    if (!isSixDigitCode(code)) return Alert.alert('Geçersiz kod', '6 haneli doğrulama kodunu girin.');
    setLoading(true);
    try {
      const response = await authApi.verifyCodeAndRegister(email, code, fullName, password);
      const payload = response?.data;
      if (payload?.token && payload?.user) await login(payload.user, payload.token, payload.refreshToken);
      else navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Doğrulama başarısız', error?.response?.data?.message ?? 'Kod geçersiz veya süresi dolmuş olabilir.');
    } finally { setLoading(false); }
  };
  const resend = async () => {
    if (seconds) return;
    setLoading(true);
    try { await authApi.sendVerificationCode(email); setSeconds(60); }
    catch (error) { Alert.alert('Kod gönderilemedi', error?.response?.data?.message ?? 'Lütfen tekrar deneyin.'); }
    finally { setLoading(false); }
  };
  return (
    <AuthLayout navigation={navigation} title="Kod Girişi" subtitle={`${email} adresine gönderdiğimiz 6 haneli kodu gir.`} icon="shield-checkmark-outline">
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={theme.colors.text.disabled}
      />
      <PrimaryButton label={loading ? 'Doğrulanıyor...' : 'Doğrula'} icon="checkmark" onPress={verify} disabled={loading || code.length !== 6} />
      <TouchableOpacity style={styles.textButton} onPress={resend} disabled={loading || seconds > 0}>
        <Text style={styles.textButtonText}>{seconds ? `Kodu tekrar gönder (${seconds})` : 'Kodu tekrar gönder'}</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 36 },
  brand: { alignItems: 'center', marginTop: 4, marginBottom: 20 },
  brandName: { color: theme.colors.primary[900], fontFamily: theme.typography.extrabold, fontSize: 20, marginTop: 5 },
  icon: { width: 58, height: 58, borderRadius: 29, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50] },
  title: { color: theme.colors.text.primary, fontFamily: theme.typography.extrabold, fontSize: 27, textAlign: 'center', marginTop: 16 },
  subtitle: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  form: { marginTop: 24 },
  field: { marginBottom: 14 },
  label: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 14, marginBottom: 7 },
  input: { height: 50, borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, backgroundColor: theme.colors.surface, color: theme.colors.text.primary, paddingHorizontal: 14, fontFamily: theme.typography.regular, fontSize: 16 },
  helper: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 17, marginBottom: 14 },
  codeInput: { height: 64, borderWidth: 1, borderColor: theme.colors.primary[300], borderRadius: 8, backgroundColor: theme.colors.surface, color: theme.colors.text.primary, textAlign: 'center', fontFamily: theme.typography.bold, fontSize: 25, letterSpacing: 8, marginBottom: 16 },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  textButtonText: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 14 },
});
