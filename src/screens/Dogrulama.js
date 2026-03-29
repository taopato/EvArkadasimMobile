// src/screens/VerificationScreen.js
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';

const VerificationScreen = ({ navigation, route }) => {
  const { email, fullName, password } = route.params || {};
  const { login } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // 60 sn geri sayım
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Hata', 'Lütfen doğrulama kodunu girin.');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.verifyCodeAndRegister(email, verificationCode.trim(), fullName, password);
      const payload = response?.data?.data;
      if (payload?.token && payload?.user) {
        await login(payload.user, payload.token);
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [
          { text: 'Tamam' },
        ]);
      } else {
        Alert.alert('Hata', 'Beklenmeyen yanıt alındı.');
      }
    } catch (error) {
      const status = error?.response?.status;
      const raw = error?.response?.data?.message || error?.response?.data || error?.message || '';
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const lower = text.toLowerCase();
      let message = 'Doğrulama başarısız';
      if (lower.includes('zaten kayıtlı') || lower.includes('already') || status === 500) {
        message = 'Bu e-posta zaten kayıtlı. Lütfen giriş yapmayı deneyin.';
      } else if (lower.includes('expired') || lower.includes('süre') || lower.includes('geçersiz')) {
        message = 'Kod geçersiz veya süresi dolmuş. Lütfen yeni kod isteyin.';
      } else if (text) {
        message = text;
      }
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (secondsLeft > 0) return;
    setLoading(true);
    try {
      await authApi.sendVerificationCode(email);
      Alert.alert('Başarılı', 'Yeni doğrulama kodu gönderildi.');
      setSecondsLeft(60);
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || error?.message || 'Kod gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={CommonStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={CommonStyles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Email Doğrulama</Text>
          <Text style={CommonStyles.subtitle}>{email} adresine gönderilen kodu girin</Text>
        </View>

        <View style={CommonStyles.card}>
          <View style={CommonStyles.inputContainer}>
            <Text style={CommonStyles.label}>Doğrulama Kodu</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor={theme.colors.text.secondary}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <Text style={styles.infoText}>
            📧 {email} adresine 6 haneli doğrulama kodu gönderildi.
          </Text>
          <Text style={[styles.countdownText, { color: theme.colors.text.secondary }]}>
            {secondsLeft > 0 ? `Yeniden gönderim: ${secondsLeft} sn` : 'Yeniden gönderime hazır'}
          </Text>
        </View>

        <TouchableOpacity
          style={[CommonStyles.menuButton, (!verificationCode.trim() || loading) && { opacity: 0.5 }]}
          onPress={handleVerification}
          disabled={!verificationCode.trim() || loading}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.success.background }]}>
            <Text style={CommonStyles.buttonIcon}>✅</Text>
            <Text style={CommonStyles.buttonText}>{loading ? 'Doğrulanıyor...' : 'Hesabı Doğrula'}</Text>
            <Text style={CommonStyles.buttonSubtext}>Hesabınızı aktifleştirin</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[CommonStyles.menuButton, (loading || secondsLeft > 0) && { opacity: 0.5 }]} onPress={handleResendCode} disabled={loading || secondsLeft > 0} activeOpacity={0.8}>
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.warning.background }]}>
            <Text style={CommonStyles.buttonIcon}>📧</Text>
            <Text style={CommonStyles.buttonText}>
              {loading ? 'Gönderiliyor...' : (secondsLeft > 0 ? `Kodu Tekrar Gönder (${secondsLeft})` : 'Kodu Tekrar Gönder')}
            </Text>
            <Text style={CommonStyles.buttonSubtext}>Yeni kod talep edin</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={CommonStyles.menuButton} onPress={() => navigation.navigate('SignupScreen')} activeOpacity={0.8}>
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.neutral.background }]}>
            <Text style={CommonStyles.buttonIcon}>🔙</Text>
            <Text style={CommonStyles.buttonText}>Geri Dön</Text>
            <Text style={CommonStyles.buttonSubtext}>Kayıt sayfasına dön</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    codeInput: {
      borderWidth: 1, borderColor: theme.colors.neutral?.[300], borderRadius: 8, padding: 12,
      backgroundColor: theme.colors.background, fontSize: 20, color: theme.colors.text.primary,
      textAlign: 'center', letterSpacing: 8,
    },
    infoText: {
      fontSize: 14, color: theme.colors.text.secondary, lineHeight: 20, marginTop: 16,
      padding: 12, backgroundColor: theme.colors.neutral[50], borderRadius: 8, borderLeftWidth: 4, borderLeftColor: theme.colors.warning[600],
    },
  });
}

export default VerificationScreen;
