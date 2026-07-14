import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';

export default function HesabiSil({ navigation }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isConfirmed = confirmation.trim().toLocaleUpperCase('tr-TR') === 'SİL';

  const deleteAccount = () => {
    if (!isConfirmed || submitting) return;

    Alert.alert(
      'Hesabın kalıcı olarak silinsin mi?',
      'Bu işlem geri alınamaz. Kişisel bilgilerin silinir ve tüm evlerden ayrılırsın.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await authApi.deleteAccount(Number(user?.id));
              await logout();
              Alert.alert('Hesap silindi', 'Roomora hesabın ve kişisel bilgilerin silindi.');
            } catch (error) {
              const message = error?.response?.data?.message || 'Hesap şu anda silinemedi. Lütfen tekrar dene.';
              Alert.alert('İşlem tamamlanamadı', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hesabımı Sil</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={96}
      >
        <View style={styles.warningIcon}>
          <Ionicons name="shield-outline" size={30} color={theme.colors.error[700]} />
        </View>
        <Text style={styles.title}>Hesabını ve kişisel verilerini sil</Text>
        <Text style={styles.body}>
          Profil fotoğrafın, adın, e-posta adresin, telefon numaran ve IBAN bilgin kalıcı olarak silinir.
          Tüm evlerden ayrılırsın.
        </Text>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary[700]} />
          <Text style={styles.noticeText}>
            Ev arkadaşlarının bakiyelerini bozmamak için daha önce paylaşılmış harcama ve ödeme kayıtları
            kişisel bilgilerinden arındırılmış olarak tutulur.
          </Text>
        </View>

        <Text style={styles.label}>Devam etmek için SİL yaz</Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="SİL"
          placeholderTextColor={theme.colors.neutral[400]}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={3}
          returnKeyType="done"
          style={styles.input}
        />

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.88}
          disabled={!isConfirmed || submitting}
          onPress={deleteAccount}
          style={[styles.deleteButton, (!isConfirmed || submitting) && styles.deleteButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.text.onPrimary} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={theme.colors.text.onPrimary} />
              <Text style={styles.deleteButtonText}>Hesabımı Kalıcı Olarak Sil</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingTop: insets.top + 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  content: { padding: 22, paddingBottom: Math.max(insets.bottom, 18) + 24 },
  warningIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error[50],
    borderWidth: 1,
    borderColor: theme.colors.error[100],
    marginBottom: 18,
  },
  title: { color: theme.colors.text.primary, fontSize: 24, fontWeight: '900', lineHeight: 31 },
  body: { color: theme.colors.text.secondary, fontSize: 15, lineHeight: 23, marginTop: 10 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 22,
    padding: 15,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  noticeText: { flex: 1, color: theme.colors.text.secondary, fontSize: 13, lineHeight: 20 },
  label: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '800', marginTop: 26, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.surface,
    color: theme.colors.text.primary,
    paddingHorizontal: 15,
    fontSize: 16,
    fontWeight: '800',
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: theme.colors.error[600],
    ...shadow(2, 'rgba(170,54,47,0.22)'),
  },
  deleteButtonDisabled: { opacity: 0.42 },
  deleteButtonText: { color: theme.colors.text.onPrimary, fontSize: 15, fontWeight: '800' },
});
