// src/screens/ForgotPasswordScreen.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';

const ForgotPasswordScreen = ({ navigation }) => {
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Hata', 'Lütfen e-posta giriniz.');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendVerificationCode(email);
      navigation.navigate('ResetPasswordScreen', { email });
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.container}>
      <View style={CommonStyles.content}>
        <Text style={CommonStyles.title}>Şifremi Unuttum</Text>
        <View style={CommonStyles.card}>
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.5 }]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.buttonText}>Kod Gönder</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    input: { borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: theme.colors.background, color: theme.colors.text.primary },
    button: { backgroundColor: theme.colors.warning[600], padding: 14, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: theme.colors.text.onPrimary, fontWeight: 'bold' },
  });
}

export default ForgotPasswordScreen;
