import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PageHeader, PrimaryButton } from '../shared/ui/roomora/CanonicalUI';
import KeyboardAwareScreen from '../shared/ui/KeyboardAwareScreen';

export default function YeniEvGrubu({ navigation }) {
  const { user, setDefaultHouseId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const value = name.trim();
    if (value.length < 2) {
      Alert.alert('Ev adı gerekli', 'Ev için en az iki karakterlik bir ad yaz.');
      return;
    }
    setSaving(true);
    try {
      const response = await houseApi.createHouse({ name: value, creatorUserId: Number(user.id) });
      const house = response?.data?.data ?? response?.data ?? {};
      if (house?.id) await setDefaultHouseId(house.id, house.name || value);
      Alert.alert('Ev oluşturuldu', `${value} artık kullanıma hazır.`, [
        { text: 'Tamam', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } catch (error) {
      Alert.alert('Ev oluşturulamadı', error?.response?.data?.message || 'Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScreen contentContainerStyle={styles.content} bottomOffset={44}>
        <PageHeader
          title="Yeni Ev Oluştur"
          subtitle="Ev arkadaşlarını daha sonra davet edebilirsin"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.heroIcon}>
          <Ionicons name="home-outline" size={42} color={theme.colors.primary[700]} />
        </View>
        <Text style={styles.label}>Ev Adı</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Örn. Kadıköy Evi"
          placeholderTextColor={theme.colors.neutral[400]}
          style={styles.input}
          maxLength={60}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={create}
        />
        <Text style={styles.hint}>Bu ad yalnızca ev üyeleri tarafından görülecek.</Text>
        <View style={styles.footer}>
          <PrimaryButton
            label={saving ? 'Oluşturuluyor...' : 'Evi Oluştur'}
            icon="checkmark"
            onPress={create}
            disabled={saving}
          />
        </View>
      </KeyboardAwareScreen>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: insets.bottom + 18 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 42,
    marginBottom: 36,
  },
  label: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.surface,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.regular,
    fontSize: 16,
    paddingHorizontal: 15,
  },
  hint: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    marginTop: 8,
  },
  footer: { marginTop: 'auto' },
});
