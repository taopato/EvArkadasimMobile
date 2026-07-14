import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { houseApi, expensesApi, receiptsApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import Toast from '../components/Toast';
import { toExpenseCategory } from '../constants/ExpenseEnums';

const formatThousandsTRInput = (text) => {
  if (text == null) return '';
  const digits = String(text).replace(/\D/g, '');
  if (!digits) return '';
  const intStr = digits.replace(/^0+(?=\d)/, '');
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseIntFromTR = (value) => {
  if (!value) return 0;
  const digits = String(value).replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

const QUICK_EXPENSES = [
  { key: 'Market', label: 'Market' },
  { key: 'Food', label: 'Yemek' },
  { key: 'Other', label: 'Diğer' },
];

export default function AddExpenseScreen({ navigation, route }) {
  const { user } = useAuth();
  const activeHouseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scrollRef = useRef(null);
  const noteWrapRef = useRef(null);

  const scrollToNoteField = () => {
    requestAnimationFrame(() => {
      noteWrapRef.current?.measureLayout(
        scrollRef.current?.getInnerViewNode?.() ?? scrollRef.current,
        (x, y) => scrollRef.current?.scrollTo({ y: y - 24, animated: true }),
        () => {}
      );
    });
  };

  const [amount, setAmount] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [note, setNote] = useState('');
  const [members, setMembers] = useState([]);
  const [payerId, setPayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [personal, setPersonal] = useState({});
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    if (!activeHouseId) {
      Alert.alert('Hata', 'Aktif bir ev grubu bulunamadı.');
      navigation.navigate('GrupListesi');
      return;
    }
    fetchMembers();
  }, [activeHouseId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await houseApi.getMembers(activeHouseId);
      const raw = res?.data?.data || res?.data || [];
      const list = (Array.isArray(raw) ? raw : [])
        .map((member) => ({
          id: Number(member.userId ?? member.user?.id ?? member.id),
          fullName: member.fullName ?? member.name ?? member.user?.fullName ?? 'Uye',
        }))
        .filter((member) => Number.isFinite(member.id));

      setMembers(list);
      const me = list.find((item) => item.id === Number(user?.id));
      if (me) setPayerId(String(me.id));

      const initialPersonal = {};
      list.forEach((member) => {
        initialPersonal[member.id] = '';
      });
      setPersonal(initialPersonal);
    } catch (error) {
      console.error('Üyeler alınamadı:', error?.response?.data || error?.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const amountNum = parseIntFromTR(amount) || 0;

  const save = async () => {
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }
    if (!categoryKey) {
      Alert.alert('Hata', 'Bir kategori seçin.');
      return;
    }
    if (!payerId) {
      Alert.alert('Hata', 'Ödemeyi yapan kişiyi seçin.');
      return;
    }

    let personalTotal = 0;
    const personalItems = [];

    Object.entries(personal).forEach(([userId, value]) => {
      const numeric = Number(String(value).replace(',', '.')) || 0;
      if (numeric > 0) {
        personalTotal += numeric;
        personalItems.push({ userId: Number(userId), tutar: numeric });
      }
    });

    if (personalTotal > amountNum) {
      Alert.alert('Hata', 'Kişisel toplam, genel toplamdan büyük olamaz.');
      return;
    }

    const sharedAmount = Number((amountNum - personalTotal).toFixed(2));
    const categoryId = toExpenseCategory(categoryKey);
    const expenseTitle = QUICK_EXPENSES.find((item) => item.key === categoryKey)?.label || 'Harcama';

    const payload = {
      tur: expenseTitle,
      Tur: expenseTitle,
      categoryId,
      CategoryId: categoryId,
      tutar: amountNum,
      houseId: activeHouseId,
      odeyenUserId: Number(payerId),
      kaydedenUserId: Number(user?.id),
      date: new Date().toISOString(),
      postDate: new Date().toISOString(),
      note,
      Aciklama: note,
      aciklama: note,
      description: note,
      Description: note,
      ortakHarcamaTutari: sharedAmount,
      sahsiHarcamalar: personalItems,
    };

    try {
      setLoading(true);
      await expensesApi.create(payload);
      try {
        const bus = (await import('../shared/events/bus')).default;
        bus.emit('expenses:updated', { houseId: activeHouseId });
      } catch {}
      showToast('Harcama kaydedildi.', 'success');
      setTimeout(() => navigation.goBack(), 800);
    } catch (error) {
      console.error('Harcama kaydi hatasi:', error?.response?.data || error?.message);
      showToast('Kayıt sırasında bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadReceipt = async (asset) => {
    if (!asset?.uri) return;

    try {
      setScanningReceipt(true);
      const fileName = asset.fileName || asset.uri.split('/').pop() || `receipt-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      // Web'de FormData gerçek bir File/Blob bekler; RN'in {uri,name,type}
      // nesnesi native'de çalışır ama web'de görsel hiç gönderilmez.
      const image = Platform.OS === 'web'
        ? new File([await (await fetch(asset.uri)).blob()], fileName, { type: mimeType })
        : { uri: asset.uri, name: fileName, type: mimeType };

      const response = await receiptsApi.scan({
        houseId: activeHouseId,
        uploadedByUserId: Number(user?.id),
        image,
      });

      const receipt = response?.data;
      if (receipt?.id) {
        navigation.navigate('FisDetayi', { receiptId: receipt.id, houseId: activeHouseId });
      } else {
        showToast('Fiş yüklendi ama detay açılamadı.', 'error');
      }
    } catch (error) {
      console.error('Fis yukleme hatasi:', error?.response?.data || error?.message);
      showToast('Fiş yüklenirken bir hata oluştu.', 'error');
    } finally {
      setScanningReceipt(false);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriden fiş yüklemek için izin vermelisin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadReceipt(result.assets?.[0]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Kamera ile fiş çekmek için izin vermelisin.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadReceipt(result.assets?.[0]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={CommonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={CommonStyles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="always"
      >
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Harcama Ekle</Text>
          <Text style={CommonStyles.subtitle}>Düzensiz harcamalar için hızlı kayıt veya fiş okutma.</Text>
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Fiş veya fatura okut</Text>
            <Text style={styles.receiptSubtitle}>
              Fotoğrafı yükle, kalemleri tek tek düzenle ve mevcut harcama sistemine dönüştür.
            </Text>
          </View>
          <View style={styles.receiptActions}>
            <TouchableOpacity style={styles.receiptPrimaryButton} onPress={openCamera} disabled={scanningReceipt} activeOpacity={0.9}>
              {scanningReceipt ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={styles.receiptPrimaryButtonText}>Kameradan çek</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.receiptSecondaryButton} onPress={openGallery} disabled={scanningReceipt} activeOpacity={0.9}>
              <Text style={styles.receiptSecondaryButtonText}>Galeriden seç</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.receiptGhostButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('FisGecmisi', { houseId: activeHouseId })}
          >
            <Text style={styles.receiptGhostButtonText}>Kayıtlı fişleri gör</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Tutar (TL)</Text>
          <TextInput
            style={styles.input}
            placeholder="1.000"
            keyboardType="numeric"
            value={amount}
            onChangeText={(text) => setAmount(formatThousandsTRInput(text))}
          />
          <Text style={styles.hint}>Örnek: 1.000</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chips}>
            {QUICK_EXPENSES.map((option) => {
              const active = categoryKey === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryKey(option.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Ödeyen</Text>
          <View style={styles.chips}>
            {members.map((member) => {
              const active = String(member.id) === String(payerId);
              return (
                <TouchableOpacity
                  key={String(member.id)}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setPayerId(String(member.id))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card} ref={noteWrapRef}>
          <Text style={styles.label}>Açıklama (opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Kısa bir not..."
            value={note}
            onChangeText={setNote}
            onFocus={scrollToNoteField}
            multiline
          />
        </View>

        <TouchableOpacity style={styles.toggle} onPress={() => setShowPersonal((prev) => !prev)} activeOpacity={0.8}>
          <Text style={styles.toggleText}>{showPersonal ? 'Kişisel kalemleri gizle' : 'Kişisel kalem ekle'}</Text>
        </TouchableOpacity>

        {showPersonal ? (
          <View style={styles.card}>
            <Text style={styles.label}>Kişisel Kalemler</Text>
            {members.map((member) => (
              <View key={String(member.id)} style={styles.personalRow}>
                <Text style={styles.personalName}>{member.fullName}</Text>
                <TextInput
                  style={styles.personalInput}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={personal[String(member.id)] || ''}
                  onChangeText={(value) => setPersonal((prev) => ({ ...prev, [String(member.id)]: value }))}
                />
              </View>
            ))}
            <Text style={styles.info}>Kişisel kalemler toplamdan düşülür, kalan kısım ortak paylaştırılır.</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, (!amountNum || !categoryKey || !payerId || loading) && styles.disabledButton]}
          onPress={save}
          disabled={!amountNum || !categoryKey || !payerId || loading}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
        </TouchableOpacity>

        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: { backgroundColor: theme.colors.background, padding: 16, borderRadius: 12, marginBottom: 14 },
  receiptCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  receiptHeader: { marginBottom: 14 },
  receiptTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text.primary },
  receiptSubtitle: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 4, lineHeight: 18 },
  receiptActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  receiptPrimaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  receiptPrimaryButtonText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
  receiptSecondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  receiptSecondaryButtonText: { color: theme.colors.primary[700], fontWeight: '800' },
  receiptGhostButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  receiptGhostButtonText: { color: theme.colors.text.primary, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
  },
  noteInput: { height: 80, textAlignVertical: 'top' },
  hint: { marginTop: 6, color: theme.colors.text.secondary, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 20, backgroundColor: theme.colors.background },
  chipActive: { borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50] },
  chipText: { color: theme.colors.text.primary, fontWeight: '500' },
  chipTextActive: { color: theme.colors.primary[700], fontWeight: '700' },
  toggle: { backgroundColor: theme.colors.primary[100], borderColor: theme.colors.primary[300], borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  toggleText: { color: theme.colors.primary[800], fontWeight: '600' },
  personalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  personalName: { fontSize: 15, color: theme.colors.text.primary, flex: 1, marginRight: 10 },
  personalInput: { width: 100, borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 8, textAlign: 'right', color: theme.colors.text.primary },
  saveButton: { backgroundColor: theme.colors.success[600], padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 28 },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { color: theme.colors.text.onPrimary, fontWeight: '700', fontSize: 16 },
  info: { marginTop: 8, color: theme.colors.text.secondary, fontSize: 12 },
});
