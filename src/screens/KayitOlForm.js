import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';
import {
  PASSWORD_RULES_TEXT,
  normalizeEmail,
  validateRegistrationForm,
} from '../shared/validation/authValidation';

const RegisterScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const error = validateRegistrationForm({ fullName, email, password, confirm });
    if (error) {
      Alert.alert('Hata', error);
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      const res = await authApi.sendVerificationCode(normalizedEmail);
      if (res?.status === 200) {
        navigation.navigate('VerificationScreen', {
          email: normalizedEmail,
          fullName: fullName.trim(),
          password,
        });
      } else {
        Alert.alert('Hata', 'Kod gönderilemedi.');
      }
    } catch (e) {
      console.error('Kayıt hatası:', e);
      Alert.alert('Hata', e?.response?.data?.message || e.message || 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 18, paddingTop: 42, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Hesap Oluştur</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Ev arkadaşlarınla harcamaları düzenli ve güvenli şekilde yönet.
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.neutral?.[200],
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Ad Soyad</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.neutral?.[300],
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background,
              },
            ]}
            placeholder="Adınız ve soyadınız"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.label, { color: theme.colors.text.primary }]}>E-posta</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.neutral?.[300],
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background,
              },
            ]}
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Şifre</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.neutral?.[300],
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background,
              },
            ]}
            placeholder="Güçlü şifre oluşturun"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.info, { color: theme.colors.text.secondary }]}>{PASSWORD_RULES_TEXT}</Text>

          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Şifre Tekrar</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.neutral?.[300],
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background,
              },
            ]}
            placeholder="Şifrenizi tekrar girin"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.info, { color: theme.colors.text.secondary }]}>
            Kayıt için e-posta adresinize doğrulama kodu gelecektir.
          </Text>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: theme.colors.primary?.[900] },
              loading && styles.btnDisabled,
            ]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text.onPrimary} />
            ) : (
              <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Hesap Oluştur</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.neutral?.[200] }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { color: theme.colors.text.primary }]}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  subtitle: { marginBottom: 20, fontSize: 15, lineHeight: 22 },
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#172839',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  label: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
  },
  info: { marginTop: 12, fontSize: 12, lineHeight: 18 },
  btn: { paddingVertical: 14, borderRadius: 14, marginTop: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: '800' },
});

export default RegisterScreen;
