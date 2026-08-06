import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PageHeader } from '../shared/ui/roomora/CanonicalUI';
import { houseApi, expensesApi, scheduledChargesApi } from '../services/api';
import eventBus from '../shared/events/bus';
import { getCategoryDisplayName, toExpenseCategory } from '../constants/ExpenseEnums';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';
import MoneyInput from '../shared/ui/roomora/MoneyInput';

export default function DuzenliGiderEkle({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const activeHouseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const activeHouseName = route?.params?.houseName || user?.defaultHouseName || 'Aktif Ev';

  const [members, setMembers] = useState([]);
  const [mode, setMode] = useState(route?.params?.defaultMode || 'recurring');
  const [type, setType] = useState('Rent');
  const [expenseName, setExpenseName] = useState('');
  const [note, setNote] = useState('');
  const [payerUserId, setPayerUserId] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [participants, setParticipants] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 15);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);

  const [customMonths, setCustomMonths] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeHouseId) {
      Alert.alert('Hata', 'Aktif bir ev grubu bulunamadı.');
      navigation.navigate('GrupListesi');
      return;
    }

    (async () => {
      try {
        const res = await houseApi.getMembers(activeHouseId);
        const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        const arr = raw.map((item) => ({
          userId: item.userId ?? item.UserId,
          fullName: item.fullName ?? item.FullName ?? item.name ?? 'Bilinmeyen',
        }));
        setMembers(arr);
        if (mode === 'recurring') setParticipants(arr.map((item) => String(item.userId)));
        const me = arr.find((item) => String(item.userId) === String(user?.id));
        if (me) setPayerUserId(String(me.userId));
      } catch {
        setMembers([]);
      }
    })();
  }, [activeHouseId, navigation, user?.id]);

  useEffect(() => {
    if (mode === 'recurring' && participants.length === 0 && members.length > 0) {
      setParticipants(members.map((item) => String(item.userId)));
    }
  }, [mode, members, participants.length]);

  const normalizePlanDate = (date) => new Date(
    date.getFullYear(),
    date.getMonth(),
    Math.min(date.getDate(), 28)
  );

  const openDatePicker = () => {
    setDraftDate(selectedDate);
    setShowDatePicker(true);
  };

  const applySelectedDate = () => {
    setSelectedDate(normalizePlanDate(draftDate));
    setShowDatePicker(false);
  };

  const handleDateChange = (event, date) => {
    if (event?.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    if (!date) return;
    const next = normalizePlanDate(date);
    setDraftDate(next);
    if (Platform.OS === 'android') {
      setSelectedDate(next);
      setShowDatePicker(false);
    }
  };

  const onSave = async () => {
    if (saving) return;
    try {
      if (!payerUserId) return Alert.alert('Hata', 'Ödeyecek kişiyi seçin.');
      const dueDayNum = Number(selectedDate.getDate());
      if (!(dueDayNum >= 1 && dueDayNum <= 28)) return Alert.alert('Hata', 'Lütfen 1-28 arasında bir gün seçin.');
      setSaving(true);

      const startMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const isoStart = `${startMonth}-01T00:00:00Z`;
      const safeTur = mode === 'installment' ? expenseName.trim() : getCategoryDisplayName(type);
      const displayName = expenseName.trim() || safeTur;
      const categoryEnum = toExpenseCategory(mode === 'installment' ? 'Other' : type);
      const descriptionSafe = note.trim() || displayName;

      if (participants.length === 0) {
        return Alert.alert('Eksik bilgi', 'Giderin paylaşılacağı en az bir kişi seçin.');
      }

      if (mode === 'installment') {
        const total = parseMoneyInput(totalAmount);
        if (!(total > 0)) return Alert.alert('Hata', 'Toplam tutar sıfırdan büyük olmalı.');
        const months = Number(installmentCount);
        if (!Number.isInteger(months) || months < 1 || months > 60) {
          return Alert.alert('Eksik bilgi', 'Kalan taksit sayısı 1 ile 60 arasında olmalı.');
        }
        if (!expenseName.trim()) {
          return Alert.alert('Eksik bilgi', 'Taksitli gider için bir gider adı yazın.');
        }

        await expensesApi.create({
          mode: 'installment',
          tur: displayName,
          category: categoryEnum,
          categoryId: categoryEnum,
          CategoryId: categoryEnum,
          tutar: total,
          installmentCount: months,
          dueDay: dueDayNum,
          startMonth: isoStart,
          houseId: activeHouseId,
          odeyenUserId: Number(payerUserId),
          kaydedenUserId: Number(user?.id),
          cardholderUserId: Number(payerUserId),
          participants: participants.length ? participants.map((id) => Number(id)) : [],
          note: note.trim(),
          Note: note.trim(),
          description: descriptionSafe,
          Description: descriptionSafe,
          Aciklama: descriptionSafe,
        });

        Alert.alert('Başarılı', 'Taksitli gider planı oluşturuldu.');
      } else if (mode === 'recurring') {
        const monthly = parseMoneyInput(fixedAmount);
        if (!(monthly > 0)) return Alert.alert('Hata', 'Aylık tutar sıfırdan büyük olmalı.');
        const collectionDay = Math.max(1, dueDayNum - 5);
        const scheduledParticipants = [...new Set([...participants, String(payerUserId)])];
        if (scheduledParticipants.length < 2) {
          return Alert.alert('Hata', 'En az iki ev üyesini kira payına dahil edin.');
        }

        await scheduledChargesApi.create({
          houseId: activeHouseId,
          title: displayName,
          type: type === 'Electricity' ? 'Electric' : type,
          payerUserId: Number(payerUserId),
          fixedAmount: monthly,
          dueDay: dueDayNum,
          collectionStartDay: collectionDay,
          startMonth,
          participantUserIds: scheduledParticipants.map((id) => Number(id)),
          note: note.trim(),
        });

        Alert.alert('Başarılı', 'Dönemsel ödeme planı oluşturuldu.');
      } else {
        const once = parseMoneyInput(fixedAmount);
        if (!(once > 0)) return Alert.alert('Hata', 'Tutar sıfırdan büyük olmalı.');

        await expensesApi.create({
          tur: safeTur,
          category: categoryEnum,
          categoryId: categoryEnum,
          CategoryId: categoryEnum,
          tutar: once,
          houseId: activeHouseId,
          odeyenUserId: Number(payerUserId),
          kaydedenUserId: Number(user?.id),
          date: selectedDate.toISOString(),
          ortakHarcamaTutari: once,
          sahsiHarcamalar: [],
          description: descriptionSafe,
          Description: descriptionSafe,
          Aciklama: descriptionSafe,
          Note: note.trim(),
        });

        Alert.alert('Başarılı', 'Tek seferlik gider oluşturuldu.');
      }

      eventBus.emit('expenses:updated', { houseId: activeHouseId });
      if (mode === 'recurring') eventBus.emit('scheduled-charges:updated', { houseId: activeHouseId });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || error?.message || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ active, title, onPress }) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.88}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const enteredAmount = mode === 'installment'
    ? parseMoneyInput(totalAmount)
    : parseMoneyInput(fixedAmount);
  const installmentMonths = Math.max(Number(installmentCount) || 1, 1);
  const periodAmount = mode === 'installment' ? enteredAmount / installmentMonths : enteredAmount;
  const perPersonAmount = participants.length
    ? Number((periodAmount / participants.length).toFixed(2))
    : 0;
  const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardOpeningTime={0}
      >
        <PageHeader title="Düzenli Gider Ekle" subtitle={activeHouseName} onBack={() => navigation.goBack()} />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Plan türü</Text>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentItem, mode === 'recurring' && styles.segmentItemActive]}
              onPress={() => setMode('recurring')}
            >
              <Text style={[styles.segmentText, mode === 'recurring' && styles.segmentTextActive]}>Sabit aylık</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentItem, mode === 'installment' && styles.segmentItemActive]}
              onPress={() => setMode('installment')}
            >
              <Text style={[styles.segmentText, mode === 'installment' && styles.segmentTextActive]}>Taksitli gider</Text>
            </TouchableOpacity>
          </View>
        </View>

        <MoneyInput
          label={mode === 'installment' ? 'Kalan toplam tutar' : 'Aylık tutar'}
          value={mode === 'installment' ? totalAmount : fixedAmount}
          onChangeText={(text) => (mode === 'installment'
            ? setTotalAmount(formatMoneyInput(text))
            : setFixedAmount(formatMoneyInput(text)))}
        />

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Gider adı</Text>
          <View style={styles.nameInputRow}>
            <Ionicons name="bag-handle-outline" size={20} color={theme.colors.primary[700]} />
            <TextInput
              style={styles.nameInput}
              value={expenseName}
              onChangeText={setExpenseName}
              placeholder={mode === 'installment' ? 'Örn. Buzdolabı' : 'Örn. Temmuz kirası'}
              placeholderTextColor={theme.colors.text.disabled}
              maxLength={80}
              returnKeyType="done"
            />
          </View>
          <Text style={styles.helperText}>
            {mode === 'installment' ? 'Satın alınan ürünü veya gideri kısa bir adla belirt.' : 'Boş bırakırsan seçtiğin gider türü kullanılır.'}
          </Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Not <Text style={styles.optionalText}>(isteğe bağlı)</Text></Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder={mode === 'installment' ? 'Örn. Kalan 4 taksit' : 'Örn. Ev sahibine havale edilecek'}
            placeholderTextColor={theme.colors.text.disabled}
            multiline
            maxLength={240}
            textAlignVertical="top"
          />
        </View>

        {mode !== 'installment' && <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Gider türü</Text>
          <View style={styles.rowWrap}>
            {[
              ['Rent', 'Kira'],
              ['Internet', 'İnternet'],
              ['Electricity', 'Elektrik'],
              ['Water', 'Su'],
              ['Gas', 'Doğalgaz'],
              ['Other', 'Diğer'],
            ].map(([key, label]) => (
              <Chip key={key} title={label} active={type === key} onPress={() => setType(key)} />
            ))}
          </View>
        </View>}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Ödemeyi yapacak kişi</Text>
          <View style={styles.rowWrap}>
            {members.map((member) => (
              <Chip
                key={String(member.userId)}
                title={member.fullName}
                active={String(payerUserId) === String(member.userId)}
                onPress={() => setPayerUserId(String(member.userId))}
              />
            ))}
          </View>
        </View>

          {mode === 'installment' && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Kalan taksit sayısı</Text>
              <View style={styles.rowWrap}>
                {['3', '6', '12'].map((count) => (
                  <Chip
                    key={count}
                    title={`${count} Ay`}
                    active={installmentCount === count && !customMonths}
                    onPress={() => {
                      setInstallmentCount(count);
                      setCustomMonths('');
                    }}
                  />
                ))}
                <Chip
                  title="Özel"
                  active={!!customMonths}
                  onPress={() => setCustomMonths(installmentCount && !['3', '6', '12'].includes(installmentCount) ? installmentCount : '1')}
                />
              </View>
              {!!customMonths && (
                <View style={styles.customMonthRow}>
                  <TextInput
                    style={[styles.input, styles.customMonthInput]}
                    value={customMonths}
                    onChangeText={(text) => {
                      const digits = text.replace(/\D/g, '').slice(0, 2);
                      setCustomMonths(digits);
                      if (digits) setInstallmentCount(digits);
                    }}
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor={theme.colors.text.disabled}
                  />
                  <Text style={styles.customMonthLabel}>ay boyunca sürsün</Text>
                </View>
              )}
              <Text style={styles.helperText}>
                Plan daha önce başladıysa yalnızca kalan tutarı ve kalan ay sayısını gir.
              </Text>
            </View>
          )}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Paylaşılacak kişiler</Text>
            <Text style={styles.sectionMeta}>{participants.length} kişi</Text>
          </View>
              <View style={styles.rowWrap}>
                {members.map((member) => {
                  const id = String(member.userId);
                  const active = participants.includes(id);
                  return (
                    <Chip
                      key={id}
                      title={member.fullName}
                      active={active}
                      onPress={() => setParticipants((prev) => (active ? prev.filter((x) => x !== id) : [...prev, id]))}
                    />
                  );
                })}
              </View>
          <View style={styles.splitSummary}>
            <View style={styles.splitSummaryCopy}>
              <Text style={styles.splitSummaryText}>{participants.length} kişi · Eşit bölüşüm</Text>
              {mode === 'installment' && <Text style={styles.splitSummaryHint}>Aylık taksit {formatCurrency(periodAmount)}</Text>}
            </View>
            <Text style={styles.splitSummaryValue}>Kişi başı {formatCurrency(perPersonAmount)}</Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Ödeme planı</Text>
          <TouchableOpacity style={styles.scheduleCard} onPress={openDatePicker} activeOpacity={0.88}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>Her ay ödeme günü</Text>
              <Text style={styles.scheduleValue}>{selectedDate.getDate()}. gün</Text>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={[styles.scheduleItem, styles.scheduleItemRight]}>
              <Text style={styles.scheduleLabel}>Başlangıç</Text>
              <Text style={styles.scheduleValue}>{selectedDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</Text>
            </View>
          </TouchableOpacity>
          {mode === 'recurring' && (
            <View style={styles.visibilityNote}>
              <Text style={styles.visibilityIcon}>◷</Text>
              <Text style={styles.visibilityText}>Bu gider ödeme gününden 5 gün önce görünür ve dönem sonunda kapanır.</Text>
            </View>
          )}
        </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.5 }]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.text.onPrimary} />
            <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : mode === 'installment' ? 'Taksit Planını Kaydet' : 'Düzenli Gideri Kaydet'}</Text>
          </TouchableOpacity>
      </KeyboardAwareScrollView>

      {showDatePicker && Platform.OS === 'ios' && (
      <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Ödeme tarihini seç</Text>
                <Text style={styles.modalSubtitle}>Her ay bu tarihte hatırlatılır</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={21} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.selectedDateCard}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary[700]} />
              <Text style={styles.selectedDateText}>
                {draftDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="inline"
              locale="tr-TR"
              themeVariant={theme.mode === 'light' ? 'light' : 'dark'}
              accentColor={theme.colors.primary[600]}
              onChange={handleDateChange}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.secondaryBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={applySelectedDate}>
                <Text style={styles.primaryBtnText}>Seç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: insets.top + 4, paddingBottom: insets.bottom + 36 },
  sectionBlock: { marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 10 },
  sectionTitleInline: { marginBottom: 0 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  sectionMeta: { color: theme.colors.primary[700], fontSize: 12, fontWeight: '700' },
  segment: {
    minHeight: 44,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.neutral[100],
  },
  segmentItem: { flex: 1, minHeight: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  segmentText: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: theme.colors.primary[700], fontWeight: '800' },
  amountCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
    padding: 16,
    marginBottom: 14,
  },
  amountLabel: { color: theme.colors.primary[700], fontSize: 11, fontWeight: '800' },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  amountCurrency: { color: theme.colors.primary[700], fontSize: 28, fontWeight: '700', marginRight: 7 },
  amountInput: { flex: 1, color: theme.colors.text.primary, fontSize: 34, fontWeight: '800', paddingVertical: 4 },
  nameInputRow: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: { flex: 1, minHeight: 48, color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  chipActive: { borderColor: theme.colors.primary[300], backgroundColor: theme.colors.primary[50] },
  chipText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: theme.colors.primary[700] },
  customMonthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  customMonthInput: { width: 80, marginBottom: 0, textAlign: 'center' },
  customMonthLabel: { color: theme.colors.text.secondary, fontWeight: '600' },
  helperText: { color: theme.colors.text.secondary, fontSize: 12, lineHeight: 17, marginTop: 8 },
  optionalText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  noteInput: { minHeight: 84, paddingTop: 12, marginBottom: 0, backgroundColor: theme.colors.surface },
  splitSummary: {
    minHeight: 44,
    marginTop: 9,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary[50],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  splitSummaryText: { color: theme.colors.primary[700], fontSize: 12, fontWeight: '700' },
  splitSummaryCopy: { flex: 1 },
  splitSummaryHint: { color: theme.colors.text.secondary, fontSize: 11, marginTop: 2 },
  splitSummaryValue: { color: theme.colors.primary[700], fontSize: 13, fontWeight: '800' },
  scheduleCard: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleItem: { flex: 1 },
  scheduleItemRight: { paddingLeft: 13 },
  scheduleDivider: { width: 1, height: 40, backgroundColor: theme.colors.neutral[200] },
  scheduleLabel: { color: theme.colors.text.secondary, fontSize: 11, fontWeight: '600', marginBottom: 5 },
  scheduleValue: { color: theme.colors.text.primary, fontSize: 13, fontWeight: '800' },
  visibilityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 9, paddingHorizontal: 2 },
  visibilityIcon: { color: theme.colors.primary[600], fontSize: 15, lineHeight: 18 },
  visibilityText: { flex: 1, color: theme.colors.text.secondary, fontSize: 12, lineHeight: 17 },
  saveButton: {
    marginTop: 6,
    minHeight: 52,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: { color: theme.colors.text.onPrimary, fontWeight: '900', fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 34, 51, 0.34)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: insets.bottom + 18,
  },
  modalHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: theme.colors.neutral[300], alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: '900', color: theme.colors.text.primary },
  modalSubtitle: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 3 },
  modalClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  selectedDateCard: { minHeight: 48, borderRadius: 10, backgroundColor: theme.colors.primary[50], flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, marginBottom: 6 },
  selectedDateText: { color: theme.colors.primary[800], fontSize: 14, fontWeight: '800' },
  modalLabel: { fontSize: 14, fontWeight: '800', color: theme.colors.text.secondary, marginBottom: 8, marginTop: 6 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  dayCellActive: { backgroundColor: theme.colors.primary[600] },
  dayCellText: { color: theme.colors.text.primary, fontWeight: '700' },
  dayCellTextActive: { color: theme.colors.text.onPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  secondaryBtn: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: theme.colors.text.primary, fontWeight: '800' },
  primaryBtn: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
});
