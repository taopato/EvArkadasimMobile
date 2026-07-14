import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { houseApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';

export default function DavetEt({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const houseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const houseName = route?.params?.houseName || user?.defaultHouseName || 'Aktif Ev';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendInvite = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!houseId || !cleanEmail) {
      Alert.alert('Eksik bilgi', 'Ev ve e-posta zorunludur.');
      return;
    }

    setLoading(true);
    try {
      await houseApi.sendInvitation(houseId, cleanEmail);
      Alert.alert('Başarılı', 'Davet gönderildi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || error?.message || 'Davet gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.82}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Arkadaş Davet Et</Text>
          <View style={styles.avatar}>
            <Ionicons name="person-add" size={20} color={theme.colors.success[700]} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{houseName}</Text>
          <Text style={styles.title}>Eve yeni kişi ekle</Text>
          <Text style={styles.subtitle}>
            Davet bağlantısı e-posta ile gönderilir. Kabul eden kişi bu eve otomatik olarak katılır.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>E-posta adresi</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@email.com"
            placeholderTextColor={theme.colors.text.disabled}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={sendInvite} disabled={loading} activeOpacity={0.86}>
            <Text style={styles.primaryText}>{loading ? 'Gönderiliyor...' : 'Daveti Gönder'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()} activeOpacity={0.86}>
            <Text style={styles.secondaryText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 24,
      paddingTop: insets.top + 14,
      paddingBottom: 36,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    backButton: {
      alignItems: 'center',
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    topTitle: {
      color: theme.colors.text.primary,
      fontSize: 22,
      fontWeight: '900',
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: theme.colors.success[100],
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    avatarText: {
      color: theme.colors.success[700],
      fontSize: 24,
      fontWeight: '900',
    },
    heroCard: {
      backgroundColor: theme.colors.primary[900],
      borderRadius: 28,
      marginBottom: 18,
      padding: 24,
      ...shadow(4, 'rgba(23,40,57,0.24)'),
    },
    eyebrow: {
      color: theme.colors.primary[200],
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 10,
    },
    title: {
      color: '#ffffff',
      fontSize: 30,
      fontWeight: '900',
      lineHeight: 36,
      marginBottom: 10,
    },
    subtitle: {
      color: theme.colors.primary[100],
      fontSize: 15,
      lineHeight: 22,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.neutral[200],
      borderRadius: 24,
      borderWidth: 1,
      padding: 20,
      ...shadow(3, 'rgba(23,40,57,0.12)'),
    },
    label: {
      color: theme.colors.text.primary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.neutral[300],
      borderRadius: 16,
      borderWidth: 1,
      color: theme.colors.text.primary,
      fontSize: 16,
      marginBottom: 14,
      minHeight: 54,
      paddingHorizontal: 16,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary[900],
      borderRadius: 18,
      justifyContent: 'center',
      minHeight: 54,
      marginBottom: 12,
    },
    primaryText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
    },
    secondaryButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.neutral[100],
      borderRadius: 18,
      justifyContent: 'center',
      minHeight: 54,
    },
    secondaryText: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '900',
    },
  });
