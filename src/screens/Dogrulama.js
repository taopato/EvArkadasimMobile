import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../context/AuthContext';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';
import { isSixDigitCode } from '../shared/validation/authValidation';

const VerificationScreen = ({ navigation, route }) => {
  const { email, fullName, password } = route.params || {};
  const { login } = useAuth();
  const commonStyles = useCommonStyles();
  const { theme } = useTheme();
  const colorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleVerification = async () => {
    if (!isSixDigitCode(verificationCode)) {
      Alert.alert('Hata', 'Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.verifyCodeAndRegister(
        email,
        verificationCode.trim(),
        fullName,
        password
      );
      const payload = response?.data;

      if (payload?.token && payload?.user) {
        await login(payload.user, payload.token);
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [{ text: 'Tamam' }]);
      } else {
        Alert.alert(
          'Başarılı',
          payload?.raw?.message || 'Kayıt tamamlandı. Şimdi giriş yapabilirsiniz.',
          [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      const status = error?.response?.status;
      const raw = error?.response?.data?.message || error?.response?.data || error?.message || '';
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const lower = text.toLowerCase();
      let message = 'Doğrulama başarısız';
      if (lower.includes('zaten kay') || lower.includes('already')) {
        message = 'Bu e-posta zaten kayıtlı. Lütfen giriş yapmayı deneyin.';
      } else if (lower.includes('expired') || lower.includes('sure') || lower.includes('gecersiz')) {
        message = 'Kod geçersiz veya süresi dolmuş. Lütfen yeni kod isteyin.';
      } else if (status === 400 && text) {
        message = text;
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
    <View style={commonStyles.container}>
      <KeyboardAwareScrollView
        style={commonStyles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        <View style={commonStyles.header}>
          <Text style={commonStyles.title}>E-posta Doğrulama</Text>
          <Text style={commonStyles.subtitle}>{email} adresine gönderilen kodu girin</Text>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.inputContainer}>
            <Text style={commonStyles.label}>Doğrulama Kodu</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor={theme.colors.text.secondary}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <Text style={styles.infoText}>
            {email} adresine 6 haneli doğrulama kodu gönderildi.
          </Text>
          <Text style={[styles.countdownText, { color: theme.colors.text.secondary }]}>
            {secondsLeft > 0 ? `Yeniden gönderim: ${secondsLeft} sn` : 'Yeniden gönderime hazır'}
          </Text>
        </View>

        <TouchableOpacity
          style={[commonStyles.menuButton, (!verificationCode.trim() || loading) && { opacity: 0.5 }]}
          onPress={handleVerification}
          disabled={!verificationCode.trim() || loading}
          activeOpacity={0.8}
        >
          <View style={[commonStyles.buttonContent, { backgroundColor: colorThemes.success.background }]}>
            <Text style={commonStyles.buttonText}>{loading ? 'Doğrulanıyor...' : 'Hesabı Doğrula'}</Text>
            <Text style={commonStyles.buttonSubtext}>Hesabinizi aktifestirin</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.menuButton, (loading || secondsLeft > 0) && { opacity: 0.5 }]}
          onPress={handleResendCode}
          disabled={loading || secondsLeft > 0}
          activeOpacity={0.8}
        >
          <View style={[commonStyles.buttonContent, { backgroundColor: colorThemes.warning.background }]}>
            <Text style={commonStyles.buttonText}>
              {loading ? 'Gönderiliyor...' : secondsLeft > 0 ? `Kodu Tekrar Gönder (${secondsLeft})` : 'Kodu Tekrar Gönder'}
            </Text>
            <Text style={commonStyles.buttonSubtext}>Yeni kod talep edin</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={commonStyles.menuButton}
          onPress={() => navigation.navigate('SignupScreen')}
          activeOpacity={0.8}
        >
          <View style={[commonStyles.buttonContent, { backgroundColor: colorThemes.neutral.background }]}>
            <Text style={commonStyles.buttonText}>Geri Dön</Text>
            <Text style={commonStyles.buttonSubtext}>Kayıt sayfasına dön</Text>
          </View>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    codeInput: {
      borderWidth: 1,
      borderColor: theme.colors.neutral?.[300],
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.colors.background,
      fontSize: 20,
      color: theme.colors.text.primary,
      textAlign: 'center',
      letterSpacing: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      lineHeight: 20,
      marginTop: 16,
      padding: 12,
      backgroundColor: theme.colors.neutral[50],
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning[600],
    },
    countdownText: {
      marginTop: 12,
      fontSize: 12,
    },
  });
}

export default VerificationScreen;
