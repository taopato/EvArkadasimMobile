import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  Platform,
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
import { expensesApi, houseApi } from '../services/api';
import {
  getCategoryDisplayName,
  normalizeExpenseCategoryKey,
  toExpenseCategory,
} from '../constants/ExpenseEnums';
import { useTheme } from '../shared/theme/ThemeProvider';
import DateField from '../shared/ui/DateField';
import { shadow } from '../shared/ui/shadow';
import Toast from '../components/Toast';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';

const BILL_TYPES = [
  { key: 'Electricity', icon: 'flash-outline', label: 'Elektrik', hint: 'Aylık tutar değişebilir' },
  { key: 'Water', icon: 'water-outline', label: 'Su', hint: 'Aylık tutar değişebilir' },
  { key: 'Gas', icon: 'flame-outline', label: 'Doğalgaz', hint: 'Aylık tutar değişebilir' },
  { key: 'Internet', icon: 'wifi-outline', label: 'İnternet', hint: 'Düzenli fatura' },
  { key: 'Rent', icon: 'home-outline', label: 'Kira', hint: 'Düzenli ödeme' },
  { key: 'Other', icon: 'document-text-outline', label: 'Diğer', hint: 'Başka bir fatura' },
];
const AMOUNT_ACCESSORY_ID = 'roomora-bill-amount-accessory';

const todayISO = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const categoryFromBill = (bill) => {
  const mapped = normalizeExpenseCategoryKey(bill?.category);
  if (mapped && mapped !== 'Other') return mapped;

  const text = `${bill?.tur || ''} ${bill?.description || ''}`.toLocaleLowerCase('tr-TR');
  if (text.includes('elektrik')) return 'Electricity';
  if (/(doğalgaz|dogalgaz|gaz)/.test(text)) return 'Gas';
  if (/(internet|wifi)/.test(text)) return 'Internet';
  if (/(kira|rent)/.test(text)) return 'Rent';
  if (/(^|\s)su(\s|$)|water/.test(text)) return 'Water';
  return mapped || 'Other';
};

const normalizeMembers = (raw) => (Array.isArray(raw) ? raw : [])
  .map((member) => ({
    userId: Number(member.userId ?? member.user?.id ?? member.id),
    fullName: member.fullName ?? member.name ?? member.user?.fullName ?? 'Kullanıcı',
  }))
  .filter((member) => Number.isInteger(member.userId) && member.userId > 0);

export default function FaturaEkle({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const params = route?.params || {};
  const houseId = Number(params.houseId || user?.defaultHouseId || 0);
  const houseName = params.houseName || user?.defaultHouseName || 'Aktif ev';
  const isEditing = Boolean(params.isEditing && params.billId);
  const billId = Number(params.billId || 0);

  const [amount, setAmount] = useState('');
  const [billDate, setBillDate] = useState(todayISO());
  const [billType, setBillType] = useState('Electricity');
  const [note, setNote] = useState('');
  const [members, setMembers] = useState([]);
  const [responsibleUserId, setResponsibleUserId] = useState(Number(user?.id) || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const selectedType = BILL_TYPES.find((item) => item.key === billType) || BILL_TYPES[0];

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!houseId) {
        setToast({ visible: true, message: 'Önce aktif bir ev seçmelisin.', type: 'error' });
        setLoading(false);
        return;
      }

      try {
        const memberResponse = await houseApi.getMembers(houseId);
        const memberList = normalizeMembers(memberResponse?.data?.data ?? memberResponse?.data);
        if (!active) return;
        setMembers(memberList);
        const me = memberList.find((member) => member.userId === Number(user?.id));
        if (me) setResponsibleUserId(me.userId);

        if (isEditing) {
          const response = await expensesApi.getById(billId);
          const bill = response?.data?.data ?? response?.data;
          if (!bill || !active) return;
          setAmount(formatMoneyInput(String(bill.tutar ?? bill.amount ?? '')));
          const rawDate = bill.postDate || bill.dueDate || bill.kayitTarihi || bill.createdDate;
          if (rawDate) setBillDate(String(rawDate).slice(0, 10));
          setBillType(categoryFromBill(bill));
          setResponsibleUserId(Number(bill.odeyenUserId) || me?.userId || null);
          const rawNote = bill.note || bill.description || '';
          const title = String(bill.tur || '').trim();
          setNote(rawNote && rawNote !== title ? rawNote : '');
        }
      } catch (error) {
        const message = error?.response?.data?.message || 'Fatura bilgileri yüklenemedi.';
        setToast({ visible: true, message: String(message), type: 'error' });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [billId, houseId, isEditing, user?.id]);

  const save = async () => {
    Keyboard.dismiss();
    const money = parseMoneyInput(amount);
    if (money <= 0) {
      setToast({ visible: true, message: 'Geçerli bir fatura tutarı gir.', type: 'warning' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) {
      setToast({ visible: true, message: 'Geçerli bir tarih seç.', type: 'warning' });
      return;
    }
    if (!members.some((member) => member.userId === Number(responsibleUserId))) {
      setToast({ visible: true, message: 'Ödemeyi yapan ev arkadaşını seç.', type: 'warning' });
      return;
    }

    const category = toExpenseCategory(billType);
    const title = `${selectedType.label} Faturası`;
    const description = note.trim() || title;
    const date = `${billDate}T12:00:00`;

    setSaving(true);
    try {
      if (isEditing) {
        await expensesApi.update(billId, {
          tur: title,
          tutar: money,
          ortakHarcamaTutari: money,
          sahsiHarcamalar: [],
          category,
          postDate: date,
          dueDate: date,
          odeyenUserId: Number(responsibleUserId),
          description,
          note: description,
          aciklama: description,
        });
      } else {
        await expensesApi.createIrregular({
          tur: title,
          category,
          tutar: money,
          houseId,
          odeyenUserId: Number(responsibleUserId),
          kaydedenUserId: Number(user?.id),
          postDate: date,
          dueDate: date,
          splitPolicy: 0,
          personalItems: [],
          description,
          note: description,
          aciklama: description,
        });
      }

      try {
        const bus = (await import('../shared/events/bus')).default;
        bus.emit('expenses:updated', { houseId });
      } catch {}
      setToast({ visible: true, message: isEditing ? 'Fatura güncellendi.' : 'Fatura kaydedildi.', type: 'success' });
      setTimeout(() => navigation.goBack(), 450);
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data || error?.message || 'Fatura kaydedilemedi.';
      setToast({ visible: true, message: String(message), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Geri" style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={25} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Faturayı Düzenle' : 'Yeni Fatura'}</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Text style={styles.loadingText}>Fatura hazırlanıyor...</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          extraScrollHeight={110}
          keyboardOpeningTime={0}
        >
          <View style={styles.contextRow}>
            <Ionicons name="home-outline" size={17} color={theme.colors.primary[600]} />
            <Text style={styles.contextText} numberOfLines={1}>{houseName}</Text>
          </View>

          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Fatura tutarı</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currency}>₺</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(value) => setAmount(formatMoneyInput(value))}
                placeholder="0,00"
                placeholderTextColor={theme.colors.primary[300]}
                keyboardType="decimal-pad"
                inputMode="decimal"
                inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_ACCESSORY_ID : undefined}
                maxLength={12}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fatura türü</Text>
            <View style={styles.typeGrid}>
              {BILL_TYPES.map((type) => {
                const selected = billType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.typeButton, selected && styles.typeButtonSelected]}
                    onPress={() => setBillType(type.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={type.icon}
                      size={21}
                      color={selected ? theme.colors.primary[700] : theme.colors.text.secondary}
                    />
                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]} numberOfLines={1}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fatura tarihi</Text>
            <DateField value={billDate} onChange={setBillDate} placeholder="Tarih seç" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ödemeyi yapan</Text>
            <View style={styles.memberWrap}>
              {members.map((member) => {
                const selected = member.userId === Number(responsibleUserId);
                return (
                  <TouchableOpacity
                    key={member.userId}
                    style={[styles.memberChip, selected && styles.memberChipSelected]}
                    onPress={() => setResponsibleUserId(member.userId)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.memberInitial, selected && styles.memberInitialSelected]}>
                      <Text style={[styles.memberInitialText, selected && styles.memberInitialTextSelected]}>
                        {member.fullName.trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.memberText, selected && styles.memberTextSelected]} numberOfLines={1}>
                      {member.fullName}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary[600]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not <Text style={styles.optional}>(isteğe bağlı)</Text></Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Örn. Haziran dönemi"
              placeholderTextColor={theme.colors.text.disabled}
              multiline
              textAlignVertical="top"
              maxLength={240}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.text.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={theme.colors.text.onPrimary} />
                <Text style={styles.saveButtonText}>{isEditing ? 'Değişiklikleri Kaydet' : 'Faturayı Kaydet'}</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
          <View style={styles.keyboardToolbar}>
            <TouchableOpacity style={styles.keyboardDone} onPress={Keyboard.dismiss}>
              <Text style={styles.keyboardDoneText}>Bitti</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    minHeight: 56 + insets.top,
    paddingTop: insets.top,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text.primary, fontSize: 19, fontWeight: '800' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.colors.text.secondary, marginTop: 12 },
  content: { padding: 18, paddingBottom: insets.bottom + 36 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  contextText: { flex: 1, color: theme.colors.text.secondary, fontSize: 14, fontWeight: '600' },
  amountCard: {
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
    backgroundColor: theme.colors.primary[600],
    ...shadow(2, 'rgba(10,29,45,0.20)'),
  },
  amountLabel: { color: theme.colors.primary[200], fontSize: 13, fontWeight: '700' },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  currency: { color: theme.colors.text.onPrimary, fontSize: 30, fontWeight: '700', marginRight: 7 },
  amountInput: { flex: 1, color: theme.colors.text.onPrimary, fontSize: 36, fontWeight: '800', paddingVertical: 4 },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '800', marginBottom: 11 },
  optional: { color: theme.colors.text.secondary, fontWeight: '500' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 90,
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  typeButtonSelected: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  typeLabel: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700' },
  typeLabelSelected: { color: theme.colors.primary[700] },
  selectionHint: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 10 },
  memberWrap: { gap: 8 },
  memberChip: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  memberChipSelected: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[50] },
  memberInitial: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.neutral[200] },
  memberInitialSelected: { backgroundColor: theme.colors.primary[100] },
  memberInitialText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '800' },
  memberInitialTextSelected: { color: theme.colors.primary[700] },
  memberText: { flex: 1, color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' },
  memberTextSelected: { color: theme.colors.primary[700], fontWeight: '800' },
  noteInput: {
    minHeight: 84,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    fontSize: 15,
    padding: 13,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveButtonText: { color: theme.colors.text.onPrimary, fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.65 },
  keyboardToolbar: {
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  keyboardDone: { minWidth: 60, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  keyboardDoneText: { color: theme.colors.primary[700], fontSize: 15, fontWeight: '700' },
});
