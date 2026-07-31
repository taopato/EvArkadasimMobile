import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PageHeader, PrimaryButton } from '../shared/ui/roomora/CanonicalUI';
import {
  formatTurkishIbanDigits,
  getTurkishIbanDigits,
  isValidTurkishIban,
  toCanonicalTurkishIban,
} from '../shared/validation/profileValidation';
import KeyboardAwareScreen from '../shared/ui/KeyboardAwareScreen';

export default function IbanBilgileri({ navigation }) {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [digits, setDigits] = useState(() => getTurkishIbanDigits(user?.iban));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const iban = digits ? toCanonicalTurkishIban(digits) : '';
    if (iban && !isValidTurkishIban(iban)) {
      Alert.alert('IBAN geçersiz', '24 haneli geçerli bir Türkiye IBAN’ı gir.');
      return;
    }
    setSaving(true);
    try {
      const response = await authApi.updateProfile(Number(user.id), { iban });
      await updateUser({ ...user, iban: response?.data?.iban ?? iban });
      Alert.alert('IBAN kaydedildi', 'Ev arkadaşların ödeme sırasında bu bilgiyi görebilecek.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Kaydedilemedi', error?.response?.data?.message || 'Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScreen contentContainerStyle={styles.content} bottomOffset={44}>
        <PageHeader
          title="IBAN Bilgileri"
          subtitle="Ödemeleri kolayca al"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.card}>
          <Text style={styles.label}>Türkiye IBAN’ı</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>TR</Text>
            <TextInput
              style={styles.input}
              value={formatTurkishIbanDigits(digits)}
              onChangeText={(value) => setDigits(getTurkishIbanDigits(value))}
              placeholder="00 0000 0000 0000 0000 0000 00"
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={29}
              returnKeyType="done"
            />
          </View>
          <Text style={styles.helper}>
            IBAN yalnızca aynı evdeki üyelerin sana ödeme yapmasını kolaylaştırmak için gösterilir.
          </Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton
            label={saving ? 'Kaydediliyor...' : 'IBAN’ı Kaydet'}
            icon="checkmark"
            onPress={save}
            disabled={saving}
          />
        </View>
      </KeyboardAwareScreen>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingTop: insets.top + 4, paddingHorizontal: 18, paddingBottom: insets.bottom + 18 },
  card: { marginTop: 20, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface },
  label: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 14, marginBottom: 9 },
  inputWrap: { minHeight: 56, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary[300], backgroundColor: theme.colors.background, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  prefix: { color: theme.colors.primary[800], fontFamily: theme.typography.bold, fontSize: 17, marginRight: 8 },
  input: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.medium, fontSize: 16, paddingVertical: 12 },
  helper: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 18, marginTop: 10 },
  footer: { marginTop: 'auto' },
});
