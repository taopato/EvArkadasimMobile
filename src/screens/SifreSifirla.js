// src/screens/ResetPasswordScreen.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { authApi } from '../services/api';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !code || !newPassword) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(email, code, newPassword);
      Alert.alert('Başarılı', 'Şifreniz güncellendi.');
      navigation.navigate('LoginScreen');
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.container}>
      <View style={CommonStyles.content}>
        <Text style={CommonStyles.title}>Şifre Sıfırla</Text>
        <View style={CommonStyles.card}>
          <TextInput
            style={styles.input}
            placeholder="Doğrulama Kodu"
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={styles.input}
            placeholder="Yeni Şifre"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.5 }]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.buttonText}>Şifreyi Sıfırla</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    input: { borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: theme.colors.background, color: theme.colors.text.primary },
    button: { backgroundColor: theme.colors.success[600], padding: 14, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: theme.colors.text.onPrimary, fontWeight: 'bold' },
  });
}

export default ResetPasswordScreen;
