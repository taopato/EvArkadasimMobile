import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { houseApi, expensesApi, receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { money, PageHeader } from '../shared/ui/roomora/CanonicalUI';
import Toast from '../components/Toast';
import { toExpenseCategory } from '../constants/ExpenseEnums';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';
import KeyboardAwareScreen from '../shared/ui/KeyboardAwareScreen';
import MoneyInput from '../shared/ui/roomora/MoneyInput';

const QUICK_EXPENSES = [
  { key: 'Market', label: 'Market' },
  { key: 'Food', label: 'Yemek' },
  { key: 'Other', label: 'Diğer' },
];

const DEFAULT_QUICK_CHOICES = [
  { id: 'bread', label: 'Ekmek', category: 'Market' },
  { id: 'market', label: 'Market', category: 'Market' },
  { id: 'water', label: 'Su', category: 'Market' },
  { id: 'transport', label: 'Ulaşım', category: 'Other' },
];
const QUICK_CHOICES_KEY = 'roomora_quick_expense_choices';

export default function AddExpenseScreen({ navigation, route }) {
  const { user } = useAuth();
  const activeHouseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [participantIds, setParticipantIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [personal, setPersonal] = useState({});
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [quickChoices, setQuickChoices] = useState(DEFAULT_QUICK_CHOICES);
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [quickLabel, setQuickLabel] = useState('');
  const [quickCategory, setQuickCategory] = useState('Market');

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    AsyncStorage.getItem(QUICK_CHOICES_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        if (Array.isArray(saved) && saved.length > 0) setQuickChoices(saved);
      })
      .catch(() => {});
  }, []);

  const persistQuickChoices = (next) => {
    setQuickChoices(next);
    AsyncStorage.setItem(QUICK_CHOICES_KEY, JSON.stringify(next)).catch(() => {});
  };

  const selectQuickChoice = (choice) => {
    setNote(choice.label);
    setCategoryKey(choice.category);
  };

  const addQuickChoice = () => {
    const label = quickLabel.trim();
    if (!label) return;
    const next = [
      ...quickChoices,
      { id: `${Date.now()}`, label, category: quickCategory },
    ].slice(-8);
    persistQuickChoices(next);
    setQuickLabel('');
    setQuickCategory('Market');
    setQuickModalVisible(false);
  };

  const removeQuickChoice = (id) => {
    persistQuickChoices(quickChoices.filter((item) => item.id !== id));
  };

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
      setParticipantIds(list.map((member) => String(member.id)));
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

  const amountNum = parseMoneyInput(amount) || 0;
  const personalTotalForSummary = Object.entries(personal).reduce((total, [userId, value]) => (
    participantIds.includes(String(userId))
      ? total + (parseMoneyInput(value) || 0)
      : total
  ), 0);
  const sharedAmountForSummary = Math.max(0, amountNum - personalTotalForSummary);
  const allSelected = members.length > 0 && participantIds.length === members.length;

  const toggleParticipant = (memberId) => {
    const id = String(memberId);
    setParticipantIds((current) => {
      if (current.includes(id)) {
        if (current.length <= 1) return current;
        setPersonal((previous) => {
          const next = { ...previous };
          delete next[id];
          return next;
        });
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  };

  const selectAllParticipants = () => {
    setParticipantIds(members.map((member) => String(member.id)));
  };

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
    if (!participantIds.length) {
      Alert.alert('Hata', 'En az bir katılımcı seçin.');
      return;
    }

    let personalTotal = 0;
    const personalItems = [];

    Object.entries(personal).forEach(([userId, value]) => {
      if (!participantIds.includes(String(userId))) return;
      const numeric = parseMoneyInput(value) || 0;
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
    const expenseTitle = note.trim()
      || QUICK_EXPENSES.find((item) => item.key === categoryKey)?.label
      || 'Harcama';

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
      participants: participantIds.map(Number),
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
      let preparedAsset = asset;
      if (Platform.OS !== 'web') {
        const actions = Number(asset.width) > 2200
          ? [{ resize: { width: 2200 } }]
          : [];
        const processed = await ImageManipulator.manipulateAsync(
          asset.uri,
          actions,
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        preparedAsset = {
          ...asset,
          ...processed,
          fileName: `fis-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        };
      }

      const fileName = preparedAsset.fileName
        || preparedAsset.uri.split('/').pop()
        || `fis-${Date.now()}.jpg`;
      const mimeType = preparedAsset.mimeType || 'image/jpeg';

      // Web'de FormData gerçek bir File/Blob bekler; RN'in {uri,name,type}
      // nesnesi native'de çalışır ama web'de görsel hiç gönderilmez.
      const image = Platform.OS === 'web'
        ? new File([await (await fetch(preparedAsset.uri)).blob()], fileName, { type: mimeType })
        : { uri: preparedAsset.uri, name: fileName, type: mimeType };

      const response = await receiptsApi.scan({
        houseId: activeHouseId,
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
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
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
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      await uploadReceipt(result.assets?.[0]);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScreen
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        contentInsetAdjustmentBehavior="never"
        bottomOffset={44}
      >
        <PageHeader title="Harcama Ekle" onBack={() => navigation.goBack()} />

        <MoneyInput label="Tutar" value={amount} onChangeText={(text) => setAmount(formatMoneyInput(text))} />

        <View style={styles.quickSection}>
          <View style={styles.quickHeader}>
            <Text style={styles.label}>Hızlı seçimler</Text>
            <TouchableOpacity onPress={() => setQuickModalVisible(true)} style={styles.quickAddButton}>
              <Ionicons name="add" size={17} color={theme.colors.primary[700]} />
              <Text style={styles.quickAddText}>Yeni</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickList}>
            {quickChoices.map((choice) => (
              <TouchableOpacity
                key={choice.id}
                style={styles.quickChoice}
                onPress={() => selectQuickChoice(choice)}
                onLongPress={() => removeQuickChoice(choice.id)}
                delayLongPress={500}
              >
                <Text style={styles.quickChoiceText}>{choice.label}</Text>
                <TouchableOpacity
                  accessibilityLabel={`${choice.label} hızlı seçimini kaldır`}
                  hitSlop={8}
                  onPress={() => removeQuickChoice(choice.id)}
                >
                  <Ionicons name="close" size={15} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.fieldBlock} ref={noteWrapRef}>
          <Text style={styles.label}>Harcama adı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn. Ekmek"
            placeholderTextColor={theme.colors.text.disabled}
            value={note}
            onChangeText={setNote}
            onFocus={scrollToNoteField}
          />
        </View>

        <View style={styles.selectionCard}>
          <View style={styles.selectionIcon}><Ionicons name="cart-outline" size={21} color={theme.colors.primary[700]} /></View>
          <View style={styles.selectionBody}><Text style={styles.selectionLabel}>Kategori</Text><Text style={styles.selectionValue}>{QUICK_EXPENSES.find((item) => item.key === categoryKey)?.label || 'Seç'}</Text></View>
          <View style={[styles.chips, styles.selectionChips]}>
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

        <View style={styles.selectionCard}>
          <View style={styles.selectionIcon}><Ionicons name="person-outline" size={21} color={theme.colors.primary[700]} /></View>
          <View style={styles.selectionBody}><Text style={styles.selectionLabel}>Ödeyen</Text><Text style={styles.selectionValue}>{members.find((member) => String(member.id) === String(payerId))?.fullName || 'Seç'}</Text></View>
          <View style={[styles.chips, styles.selectionChips]}>
            {members.map((member) => {
              const active = String(member.id) === String(payerId);
              return (
                <TouchableOpacity
                  key={String(member.id)}
                  accessibilityLabel={`${member.fullName} ödeyen kişi`}
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

        <View style={styles.selectionCard}>
          <View style={styles.selectionIcon}><Ionicons name="people-outline" size={21} color={theme.colors.primary[700]} /></View>
          <View style={styles.selectionBody}>
            <Text style={styles.selectionLabel}>Kimin için?</Text>
            <Text style={styles.selectionValue}>
              {allSelected ? 'Ortak' : `${participantIds.length} kişi · Eşit`}
            </Text>
          </View>
          <View style={[styles.chips, styles.selectionChips]}>
            <TouchableOpacity
              style={[styles.chip, allSelected && styles.chipActive]}
              onPress={selectAllParticipants}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, allSelected && styles.chipTextActive]}>Ortak</Text>
            </TouchableOpacity>
            {members.map((member) => {
              const active = participantIds.includes(String(member.id));
              return (
                <TouchableOpacity
                  key={String(member.id)}
                  accessibilityLabel={`${member.fullName} katılımcı`}
                  testID={`participant-${member.id}`}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleParticipant(member.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.toggle} onPress={() => setShowPersonal((prev) => !prev)} activeOpacity={0.8}>
          <Text style={styles.toggleText}>{showPersonal ? 'Kişisel kalemleri gizle' : 'Kişisel kalem ekle'}</Text>
        </TouchableOpacity>

        {showPersonal ? (
          <View style={styles.card}>
            <Text style={styles.label}>Kişisel Kalemler</Text>
            {members.map((member) => {
              const isParticipant = participantIds.includes(String(member.id));
              return (
                <View
                  key={String(member.id)}
                  style={[styles.personalRow, !isParticipant && styles.personalRowDisabled]}
                >
                  <Text style={[styles.personalName, !isParticipant && styles.personalNameDisabled]}>
                    {member.fullName}
                  </Text>
                  {isParticipant ? (
                    <TextInput
                      accessibilityLabel={`${member.fullName} kişisel kalem tutarı`}
                      testID={`personal-input-${member.id}`}
                      style={styles.personalInput}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      value={personal[String(member.id)] || ''}
                      onChangeText={(value) => setPersonal((prev) => ({
                        ...prev,
                        [String(member.id)]: formatMoneyInput(value),
                      }))}
                    />
                  ) : (
                    <View
                      accessibilityLabel={`${member.fullName} kişisel kalem seçilemez`}
                      accessibilityState={{ disabled: true }}
                      testID={`personal-disabled-${member.id}`}
                      style={styles.personalDisabledValue}
                    >
                      <Text style={styles.personalDisabledText}>Seçilmedi</Text>
                    </View>
                  )}
                </View>
              );
            })}
            <Text style={styles.info}>Kişisel kalemler toplamdan düşülür, kalan kısım ortak paylaştırılır.</Text>
          </View>
        ) : null}

        <View style={styles.splitSummary}>
          <Text style={styles.splitSummaryText}>{allSelected ? 'Ortak' : `${participantIds.length} kişi`} · Eşit bölüşüm</Text>
          <Text style={styles.splitSummaryValue}>
            Kişi başı {money(participantIds.length ? Number((sharedAmountForSummary / participantIds.length).toFixed(2)) : 0)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!amountNum || !categoryKey || !payerId || loading) && styles.disabledButton]}
          onPress={save}
          disabled={!amountNum || !categoryKey || !payerId || loading}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <><Ionicons name="checkmark-circle" size={20} color={theme.colors.text.onPrimary} /><Text style={styles.saveButtonText}>Harcamayı Kaydet</Text></>}
        </TouchableOpacity>

        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Fiş ile eklemek ister misin?</Text>
            <Text style={styles.receiptSubtitle}>
              Fişi taratarak harcama bilgilerini otomatik doldurabilirsin.
            </Text>
          </View>
          <View style={styles.receiptActions}>
            <TouchableOpacity style={styles.receiptPrimaryButton} onPress={openCamera} disabled={scanningReceipt} activeOpacity={0.9}>
              {scanningReceipt ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={styles.receiptPrimaryButtonText}>Kamerayı Aç</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.receiptSecondaryButton} onPress={openGallery} disabled={scanningReceipt} activeOpacity={0.9}>
              <Text style={styles.receiptSecondaryButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.receiptGhostButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('FisGecmisi', { houseId: activeHouseId })}
          >
            <Text style={styles.receiptGhostButtonText}>Fiş Geçmişi</Text>
          </TouchableOpacity>
        </View>

        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </KeyboardAwareScreen>

      <Modal visible={quickModalVisible} transparent animationType="fade" onRequestClose={() => setQuickModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hızlı Seçim Ekle</Text>
                <TouchableOpacity accessibilityLabel="Kapat" onPress={() => setQuickModalVisible(false)} style={styles.modalClose}>
                  <Ionicons name="close" size={22} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Harcama adı</Text>
              <TextInput
                autoFocus
                value={quickLabel}
                onChangeText={setQuickLabel}
                placeholder="Örn. Sigara"
                placeholderTextColor={theme.colors.text.disabled}
                style={styles.input}
              />
              <Text style={[styles.label, { marginTop: 16 }]}>Kategori</Text>
              <View style={styles.chips}>
                {QUICK_EXPENSES.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.chip, quickCategory === option.key && styles.chipActive]}
                    onPress={() => setQuickCategory(option.key)}
                  >
                    <Text style={[styles.chipText, quickCategory === option.key && styles.chipTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.modalSave, !quickLabel.trim() && styles.disabledButton]}
                disabled={!quickLabel.trim()}
                onPress={addQuickChoice}
              >
                <Text style={styles.saveButtonText}>Hızlı Seçimi Kaydet</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], padding: 16, borderRadius: 8, marginBottom: 12 },
  fieldBlock: { marginBottom: 12 },
  selectionCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], padding: 14, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  selectionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  selectionBody: { flex: 1, minWidth: 110 },
  selectionLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 12 },
  selectionValue: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 15, marginTop: 2 },
  quickSection: { marginBottom: 9 },
  quickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickAddButton: { minHeight: 36, flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: theme.colors.primary[50] },
  quickAddText: { color: theme.colors.primary[700], fontFamily: theme.typography?.bold, fontSize: 13 },
  quickList: { gap: 7, paddingTop: 4, paddingBottom: 2 },
  quickChoice: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  quickChoiceText: { color: theme.colors.text.primary, fontFamily: theme.typography?.semibold, fontSize: 12 },
  receiptCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  receiptHeader: { marginBottom: 14 },
  receiptTitle: { fontFamily: theme.typography?.bold, fontSize: 17, color: theme.colors.text.primary },
  receiptSubtitle: { fontFamily: theme.typography?.regular, fontSize: 13, color: theme.colors.text.secondary, marginTop: 4, lineHeight: 18 },
  receiptActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  receiptPrimaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  receiptPrimaryButtonText: { color: theme.colors.text.onPrimary, fontFamily: theme.typography?.bold },
  receiptSecondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    borderRadius: 8,
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
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  receiptGhostButtonText: { color: theme.colors.text.primary, fontWeight: '700' },
  label: { fontFamily: theme.typography?.semibold, fontSize: 14, color: theme.colors.text.primary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text.primary,
  },
  noteInput: { height: 80, textAlignVertical: 'top' },
  hint: { marginTop: 6, color: theme.colors.text.secondary, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectionChips: { width: '100%' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 20, backgroundColor: theme.colors.background },
  chipActive: { borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50] },
  chipText: { color: theme.colors.text.primary, fontWeight: '500' },
  chipTextActive: { color: theme.colors.primary[700], fontWeight: '700' },
  toggle: { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[200], borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
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
  personalRowDisabled: { opacity: 0.48, backgroundColor: theme.colors.neutral[100] },
  personalNameDisabled: { color: theme.colors.text.disabled },
  personalDisabledValue: {
    width: 100,
    minHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral[100],
  },
  personalDisabledText: { color: theme.colors.text.disabled, fontSize: 12 },
  splitSummary: { minHeight: 42, borderRadius: 8, backgroundColor: theme.colors.primary[50], paddingHorizontal: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  splitSummaryText: { color: theme.colors.primary[700], fontFamily: theme.typography.medium, fontSize: 12 },
  splitSummaryValue: { color: theme.colors.primary[800], fontFamily: theme.typography.bold, fontSize: 12 },
  saveButton: { flexDirection: 'row', gap: 8, backgroundColor: theme.colors.primary[600], minHeight: 52, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  disabledButton: { opacity: 0.5 },
  saveButtonText: { color: theme.colors.text.onPrimary, fontFamily: theme.typography?.bold, fontSize: 15 },
  info: { marginTop: 8, color: theme.colors.text.secondary, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,29,45,0.38)', justifyContent: 'flex-end' },
  modalKeyboard: { width: '100%' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: Platform.OS === 'ios' ? 34 : 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle: { color: theme.colors.text.primary, fontFamily: theme.typography?.bold, fontSize: 19 },
  modalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalSave: { minHeight: 52, marginTop: 22, borderRadius: 12, backgroundColor: theme.colors.primary[600], alignItems: 'center', justifyContent: 'center' },
});
