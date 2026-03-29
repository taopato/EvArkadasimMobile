// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';

const RegisterScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    if (!fullName.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return false;
    }
    if (password !== confirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.sendVerificationCode(email.trim());
      if (res?.status === 200) {
        Alert.alert('Doğrulama Kodu Gönderildi', 'E-posta kutunuzu kontrol edin.', [
          { text: 'Devam', onPress: () => navigation.navigate('VerificationScreen', { email: email.trim(), fullName: fullName.trim(), password }) }
        ]);
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.surface }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Hesap Oluştur</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Ev arkadaşlarınla harcamaları yönet.</Text>

        <View style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.neutral?.[200] }]}> 
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Ad Soyad</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.neutral?.[300], color: theme.colors.text.primary, backgroundColor: theme.colors.background }]}
            placeholder="Adınız ve soyadınız"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.neutral?.[300], color: theme.colors.text.primary, backgroundColor: theme.colors.background }]}
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Şifre</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.neutral?.[300], color: theme.colors.text.primary, backgroundColor: theme.colors.background }]}
            placeholder="En az 6 karakter"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Şifre Tekrar</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.neutral?.[300], color: theme.colors.text.primary, backgroundColor: theme.colors.background }]}
            placeholder="Şifrenizi tekrar girin"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text style={[styles.info, { color: theme.colors.text.secondary }]}>📧 Kayıt için e-posta adresinize doğrulama kodu gelecektir.</Text>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary?.[600] }, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Hesap Oluştur</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.neutral?.[200] }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { color: theme.colors.text.primary }]}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { marginBottom: 16 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },

  label: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 10,
    padding: 12, fontSize: 16,
  },
  info: { marginTop: 12, fontSize: 12 },

  btn: { paddingVertical: 12, borderRadius: 10, marginTop: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: '800' },
});

export default RegisterScreen;
