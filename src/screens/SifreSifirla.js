import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';
import {
  isSixDigitCode,
  isStrongPassword,
  normalizeEmail,
  PASSWORD_RULES_TEXT,
} from '../shared/validation/authValidation';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const commonStyles = useCommonStyles();
  const { theme } = useTheme();
  makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !code || !newPassword) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }

    if (!isSixDigitCode(code)) {
      Alert.alert('Hata', 'Doğrulama kodu 6 haneli olmalı.');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      Alert.alert('Hata', PASSWORD_RULES_TEXT);
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(normalizedEmail, code.trim(), newPassword);
      Alert.alert('Başarılı', 'Şifreniz güncellendi.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
        <Text style={commonStyles.title}>Şifre Sıfırla</Text>
        <View style={commonStyles.card}>
          <TextInput
            style={styles.input}
            placeholder="Doğrulama Kodu"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            placeholder="Yeni şifre"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Text style={styles.helper}>{PASSWORD_RULES_TEXT}</Text>
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.5 }]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi Sıfırla</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.colors.background,
      color: theme.colors.text.primary,
    },
    helper: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 12,
    },
    button: {
      backgroundColor: theme.colors.primary[900],
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: { color: theme.colors.text.onPrimary, fontWeight: 'bold' },
  });
}

export default ResetPasswordScreen;
