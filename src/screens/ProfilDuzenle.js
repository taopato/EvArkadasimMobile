import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { resolveMediaUrl } from '../shared/config/env';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';
import {
  formatTurkishIbanDigits,
  formatTurkishMobile,
  getTurkishIbanDigits,
  getTurkishMobileDigits,
  isValidTurkishIban,
  isValidTurkishMobile,
  toCanonicalTurkishIban,
  toTurkishMobileE164,
} from '../shared/validation/profileValidation';

const FormField = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  prefix,
  maxLength,
  inputMode,
  autoComplete,
  textContentType,
  styles,
  theme,
}) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputWrap, !editable && styles.inputDisabled]}>
      <Ionicons name={icon} size={19} color={theme.colors.neutral[500]} />
      {!!prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.disabled}
        keyboardType={keyboardType}
        inputMode={inputMode}
        editable={editable}
        maxLength={maxLength}
        autoComplete={autoComplete}
        textContentType={textContentType}
        returnKeyType="done"
        style={styles.input}
      />
    </View>
  </View>
);

const buildUploadImage = async (asset) => {
  let preparedAsset = asset;
  if (Platform.OS !== 'web') {
    const actions = Number(asset.width) > 1200
      ? [{ resize: { width: 1200 } }]
      : [];
    const processed = await ImageManipulator.manipulateAsync(
      asset.uri,
      actions,
      { compress: 0.84, format: ImageManipulator.SaveFormat.JPEG }
    );
    preparedAsset = { ...asset, ...processed };
  }

  const fileName = `profil-${Date.now()}.jpg`;
  const mimeType = 'image/jpeg';
  if (Platform.OS !== 'web') return { uri: preparedAsset.uri, name: fileName, type: mimeType };

  const blob = await (await fetch(preparedAsset.uri)).blob();
  return new File([blob], fileName, { type: mimeType });
};

export default function ProfilDuzenle({ navigation }) {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [phoneDigits, setPhoneDigits] = useState(() => getTurkishMobileDigits(user?.phoneNumber || user?.phone));
  const [ibanDigits, setIbanDigits] = useState(() => getTurkishIbanDigits(user?.iban));
  const [photoAsset, setPhotoAsset] = useState(null);
  const [saving, setSaving] = useState(false);

  const initials = useMemo(() => {
    const source = fullName || user?.email || 'Kullanıcı';
    return String(source)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [fullName, user?.email]);

  const currentPhoto = photoAsset?.uri || resolveMediaUrl(user?.profileImageUrl);

  const choosePhoto = async (source) => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('İzin gerekli', source === 'camera'
        ? 'Profil fotoğrafı çekmek için kamera izni vermelisin.'
        : 'Profil fotoğrafı seçmek için galeri izni vermelisin.');
      return;
    }

    const options = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]) setPhotoAsset(result.assets[0]);
  };

  const openPhotoMenu = () => Alert.alert(
    'Profil fotoğrafı',
    'Fotoğrafını nasıl eklemek istersin?',
    [
      { text: 'Kamerayla Çek', onPress: () => choosePhoto('camera') },
      { text: 'Galeriden Seç', onPress: () => choosePhoto('gallery') },
      { text: 'Vazgeç', style: 'cancel' },
    ]
  );

  const onSave = async () => {
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) {
      Alert.alert('Eksik bilgi', 'Ad soyad alanını kontrol et.');
      return;
    }
    if (phoneDigits && !isValidTurkishMobile(phoneDigits)) {
      Alert.alert('Telefon numarası', 'Numara 5XX XXX XX XX formatında olmalıdır.');
      return;
    }
    if (ibanDigits && !isValidTurkishIban(`TR${ibanDigits}`)) {
      Alert.alert('IBAN', 'Geçerli bir Türkiye IBAN’ı gir.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Oturum hatası', 'Profil güncellemek için yeniden giriş yapmalısın.');
      return;
    }

    setSaving(true);
    try {
      let profileImageUrl = user?.profileImageUrl || null;
      if (photoAsset) {
        const image = await buildUploadImage(photoAsset);
        const uploadResponse = await authApi.uploadProfileImage(user.id, image);
        profileImageUrl = uploadResponse?.data?.profileImageUrl || profileImageUrl;
      }

      const response = await authApi.updateProfile(user.id, {
        fullName: cleanName,
        phoneNumber: phoneDigits ? toTurkishMobileE164(phoneDigits) : '',
        iban: ibanDigits ? toCanonicalTurkishIban(ibanDigits) : '',
      });
      const saved = response?.data || {};
      await updateUser({
        ...(user || {}),
        fullName: saved.fullName || cleanName,
        email: saved.email || user?.email,
        phoneNumber: saved.phoneNumber ?? (phoneDigits ? toTurkishMobileE164(phoneDigits) : ''),
        iban: saved.iban ?? (ibanDigits ? toCanonicalTurkishIban(ibanDigits) : ''),
        profileImageUrl: saved.profileImageUrl || profileImageUrl,
      });
      Alert.alert('Profil güncellendi', 'Bilgilerin güvenle kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Profil kaydedilemedi.';
      Alert.alert('Kaydedilemedi', String(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Geri"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={25} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={120}
        keyboardOpeningTime={0}
      >
        <TouchableOpacity style={styles.avatarArea} onPress={openPhotoMenu} activeOpacity={0.88}>
          <View style={styles.avatar}>
            {currentPhoto ? (
              <Image source={{ uri: currentPhoto }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.photoButton}>
            <Ionicons name="camera" size={17} color={theme.colors.text.onPrimary} />
          </View>
          <Text style={styles.photoText}>{currentPhoto ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}</Text>
        </TouchableOpacity>

        <View style={styles.formCard}>
          <FormField
            icon="person-outline"
            label="Ad Soyad"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Adınızı ve soyadınızı girin"
            autoComplete="name"
            textContentType="name"
            styles={styles}
            theme={theme}
          />
          <FormField
            icon="mail-outline"
            label="E-posta"
            value={user?.email || ''}
            placeholder="E-posta adresi"
            editable={false}
            styles={styles}
            theme={theme}
          />
          <FormField
            icon="call-outline"
            label="Telefon Numarası"
            prefix="+90"
            value={formatTurkishMobile(phoneDigits)}
            onChangeText={(value) => setPhoneDigits(getTurkishMobileDigits(value))}
            placeholder="(5XX) XXX XX XX"
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={15}
            styles={styles}
            theme={theme}
          />
          <FormField
            icon="card-outline"
            label="IBAN (İsteğe Bağlı)"
            prefix="TR"
            value={formatTurkishIbanDigits(ibanDigits)}
            onChangeText={(value) => setIbanDigits(getTurkishIbanDigits(value))}
            placeholder="00 0000 0000 0000 0000 0000 00"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={29}
            styles={styles}
            theme={theme}
          />

          <Text style={styles.helper}>IBAN yalnızca ev arkadaşlarının sana ödeme yapmasını kolaylaştırmak için kullanılır.</Text>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            activeOpacity={0.88}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.text.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={theme.colors.text.onPrimary} />
                <Text style={styles.saveText}>Değişiklikleri Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    minHeight: 56 + insets.top,
    paddingTop: insets.top,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text.primary, fontSize: 19, fontWeight: '800' },
  content: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: insets.bottom + 36 },
  avatarArea: { alignItems: 'center', marginBottom: 22 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: theme.colors.primary[100],
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(2, 'rgba(23,40,57,0.14)'),
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: theme.colors.primary[900], fontSize: 28, fontWeight: '800' },
  photoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.success[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    marginLeft: 74,
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  photoText: { color: theme.colors.primary[700], fontSize: 14, fontWeight: '700', marginTop: 10 },
  formCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: 16,
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  fieldBlock: { marginBottom: 15 },
  fieldLabel: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  inputDisabled: { opacity: 0.65 },
  inputPrefix: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '700' },
  input: { flex: 1, color: theme.colors.text.primary, fontSize: 16, paddingVertical: 10 },
  helper: { color: theme.colors.text.secondary, fontSize: 12, lineHeight: 18, marginTop: -2, marginBottom: 20 },
  saveButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[900],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.65 },
  saveText: { color: theme.colors.text.onPrimary, fontSize: 15, fontWeight: '800' },
});
