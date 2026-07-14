import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';

const Field = ({ icon, label, value, onChangeText, placeholder, keyboardType, editable = true, styles, theme }) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputWrap, !editable && styles.inputDisabled]}>
      <Ionicons name={icon} size={20} color={theme.colors.neutral[500]} style={{ marginRight: 10 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#b4b8be"
        keyboardType={keyboardType}
        editable={editable}
        style={styles.input}
      />
    </View>
  </View>
);

export default function ProfilDuzenle({ navigation }) {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || user?.phone || '');
  const [iban, setIban] = useState(user?.iban || '');
  const [saving, setSaving] = useState(false);

  const initials = useMemo(() => {
    const source = fullName || email || 'Kullanıcı';
    return String(source)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [fullName, email]);

  const onSave = async () => {
    const cleanName = fullName.trim();
    if (!cleanName) {
      Alert.alert('Eksik bilgi', 'Ad soyad alanı boş bırakılamaz.');
      return;
    }

    const nextUser = {
      ...(user || {}),
      fullName: cleanName,
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      iban: iban.trim(),
    };

    setSaving(true);
    try {
      if (user?.id) {
        await authApi.updateProfile(user.id, {
          fullName: nextUser.fullName,
          email: nextUser.email,
          phoneNumber: nextUser.phoneNumber,
          iban: nextUser.iban,
        });
      }
      await updateUser(nextUser);
      Alert.alert('Kaydedildi', 'Profil bilgilerin güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch {
      await updateUser(nextUser);
      Alert.alert('Yerel olarak kaydedildi', 'Sunucuya ulaşılamadı, bilgiler bu cihazda güncellendi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarArea}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity style={styles.photoButton} activeOpacity={0.86}>
            <Ionicons name="pencil" size={18} color={theme.colors.text.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.photoText}>Fotoğrafı Değiştir</Text>
        </View>

        <View style={styles.formCard}>
          <Field
            icon="person-outline"
            label="Ad Soyad"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Adınızı girin"
            styles={styles}
            theme={theme}
          />
          <Field
            icon="mail-outline"
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            keyboardType="email-address"
            styles={styles}
            theme={theme}
          />
          <Field
            icon="call-outline"
            label="Telefon Numarası"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+90 555 123 45 67"
            keyboardType="phone-pad"
            styles={styles}
            theme={theme}
          />
          <Field
            icon="card-outline"
            label="IBAN (İsteğe Bağlı)"
            value={iban}
            onChangeText={setIban}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            styles={styles}
            theme={theme}
          />

          <Text style={styles.helper}>Ödemelerinizi kolayca almak için IBAN bilginizi ekleyebilirsiniz.</Text>

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.88} onPress={onSave} disabled={saving}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.text.onPrimary} style={{ marginRight: 8 }} />
            <Text style={styles.saveText}>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </View>
  );
}

const makeStyles = (theme, insets) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      height: 60 + insets.top,
      paddingHorizontal: 22,
      paddingTop: insets.top + 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      color: theme.colors.text.primary,
      fontSize: 42,
      lineHeight: 42,
      fontWeight: '300',
    },
    headerTitle: {
      color: theme.colors.text.primary,
      fontSize: 21,
      fontWeight: '900',
    },
    headerSpacer: {
      width: 44,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 30,
      paddingBottom: 108,
    },
    avatarArea: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary[100],
      borderWidth: 1,
      borderColor: theme.colors.primary[200],
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow(1, 'rgba(23,40,57,0.10)'),
    },
    avatarText: {
      color: theme.colors.primary[900],
      fontSize: 28,
      fontWeight: '900',
    },
    photoButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.success[600],
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -30,
      marginLeft: 78,
      borderWidth: 4,
      borderColor: theme.colors.background,
    },
    photoIcon: {
      color: theme.colors.text.onPrimary,
      fontSize: 21,
      fontWeight: '900',
    },
    photoText: {
      color: theme.colors.text.secondary,
      fontSize: 17,
      fontWeight: '700',
      marginTop: 14,
    },
    formCard: {
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      padding: 18,
      ...shadow(2, 'rgba(23,40,57,0.10)'),
    },
    fieldBlock: {
      marginBottom: 16,
    },
    fieldLabel: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 10,
    },
    inputWrap: {
      minHeight: 56,
      borderRadius: 12,
      borderWidth: 1.3,
      borderColor: theme.colors.neutral[300],
      backgroundColor: theme.colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    inputDisabled: {
      opacity: 0.72,
    },
    inputIcon: {
      color: theme.colors.neutral[500],
      fontSize: 21,
      width: 34,
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: 18,
      paddingVertical: 10,
    },
    helper: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 22,
      marginTop: -4,
      marginBottom: 24,
    },
    saveButton: {
      minHeight: 58,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[900],
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...shadow(2, 'rgba(23,40,57,0.22)'),
    },
    saveIcon: {
      color: theme.colors.text.onPrimary,
      fontSize: 21,
      fontWeight: '900',
      marginRight: 10,
    },
    saveText: {
      color: theme.colors.text.onPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
  });
