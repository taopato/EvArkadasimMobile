import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PageHeader } from '../shared/ui/roomora/CanonicalUI';
import { houseApi, expensesApi, scheduledChargesApi } from '../services/api';
import eventBus from '../shared/events/bus';
import { getCategoryDisplayName, toExpenseCategory } from '../constants/ExpenseEnums';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';

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
  const [tempMonthOffset, setTempMonthOffset] = useState(0);
  const [tempDay, setTempDay] = useState('15');

  const calendarMonths = useMemo(() => Array.from({ length: 12 }).map((_, index) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), index, 1);
    return {
      key: index,
      date,
      label: date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
    };
  }), []);

  const [customMonths, setCustomMonths] = useState('');

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

  const applySelectedDate = () => {
    const now = new Date();
    const monthDate = new Date(now.getFullYear(), tempMonthOffset, 1);
    const nextDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), Number(tempDay));
    setSelectedDate(nextDate);
    setCollectionStartDay(String(Math.max(1, Number(tempDay) - 5)));
    setShowDatePicker(false);
  };

  const onSave = async () => {
    try {
      if (!payerUserId) return Alert.alert('Hata', 'Ödeyecek kişiyi seçin.');
      const dueDayNum = Number(selectedDate.getDate());
      if (!(dueDayNum >= 1 && dueDayNum <= 28)) return Alert.alert('Hata', 'Lütfen 1-28 arasında bir gün seçin.');

      const startMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      const isoStart = `${startMonth}-01T00:00:00Z`;
      const safeTur = getCategoryDisplayName(type);
      const categoryEnum = toExpenseCategory(type);
      const descriptionSafe = `${safeTur} | Başlangıç ${selectedDate.toLocaleDateString('tr-TR')}`;

      if (mode === 'installment') {
        const total = parseMoneyInput(totalAmount);
        if (!(total > 0)) return Alert.alert('Hata', 'Toplam tutar sıfırdan büyük olmalı.');

        await expensesApi.create({
          mode: 'installment',
          tur: safeTur,
          category: categoryEnum,
          categoryId: categoryEnum,
          CategoryId: categoryEnum,
          tutar: total,
          installmentCount: Number(installmentCount),
          dueDay: dueDayNum,
          startMonth: isoStart,
          houseId: activeHouseId,
          odeyenUserId: Number(payerUserId),
          kaydedenUserId: Number(user?.id),
          cardholderUserId: Number(payerUserId),
          participants: participants.length ? participants.map((id) => Number(id)) : [],
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
          title: safeTur,
          type: type === 'Electricity' ? 'Electric' : type,
          payerUserId: Number(payerUserId),
          fixedAmount: monthly,
          dueDay: dueDayNum,
          collectionStartDay: collectionDay,
          startMonth,
          participantUserIds: scheduledParticipants.map((id) => Number(id)),
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
        });

        Alert.alert('Başarılı', 'Tek seferlik gider oluşturuldu.');
      }

      eventBus.emit('expenses:updated', { houseId: activeHouseId });
      if (mode === 'recurring') eventBus.emit('scheduled-charges:updated', { houseId: activeHouseId });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || error?.message || 'Kaydedilemedi');
    }
  };

  const Chip = ({ active, title, onPress }) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.88}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Plan tipi</Text>
          <View style={styles.rowWrap}>
            <Chip title="Dönemsel sabit" active={mode === 'recurring'} onPress={() => setMode('recurring')} />
            <Chip title="Taksitli" active={mode === 'installment'} onPress={() => setMode('installment')} />
            <Chip title="Tek seferlik" active={mode === 'irregular'} onPress={() => setMode('irregular')} />
          </View>

          <Text style={styles.sectionTitle}>Kategori</Text>
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

          <Text style={styles.sectionTitle}>Ödeyecek kişi</Text>
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

          {(mode === 'recurring' || mode === 'irregular') && (
            <>
              <Text style={styles.label}>{mode === 'recurring' ? 'Aylık tutar (TL)' : 'Tutar (TL)'}</Text>
              <TextInput
                style={styles.input}
                value={fixedAmount}
                onChangeText={(text) => setFixedAmount(formatMoneyInput(text))}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="20.000"
                placeholderTextColor={theme.colors.text.disabled}
              />
            </>
          )}

          {mode === 'installment' && (
            <>
              <Text style={styles.label}>Kalan toplam tutar (TL)</Text>
              <TextInput
                style={styles.input}
                value={totalAmount}
                onChangeText={(text) => setTotalAmount(formatMoneyInput(text))}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="120.000"
                placeholderTextColor={theme.colors.text.disabled}
              />
            </>
          )}

          {mode === 'installment' && (
            <>
              <Text style={styles.label}>Kalan taksit sayısı</Text>
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
            </>
          )}

          <Text style={styles.label}>{mode === 'irregular' ? 'Tarih seç' : 'Başlangıç tarihi ve ödeme günü'}</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)} activeOpacity={0.88}>
            <Text style={styles.dateButtonText}>{selectedDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
            <Text style={styles.dateHint}>Takvimden seç</Text>
          </TouchableOpacity>

          {mode === 'recurring' && (
            <>
              <Text style={styles.label}>Borçlarım görünürlük aralığı</Text>
              <View style={styles.collectionRow}>
                <Text style={styles.collectionHint}>
                  Ödeme gününden 5 gün önce görünür, ödeme gününün sonunda otomatik kapanır.
                </Text>
              </View>
            </>
          )}

          {(mode === 'installment' || mode === 'recurring') && (
            <>
              <Text style={styles.label}>{mode === 'recurring' ? 'Kira payına dahil kişiler' : 'Katılımcılar'}</Text>
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
            </>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.9}>
            <Text style={styles.saveButtonText}>Planı Kaydet</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tarih seç</Text>

            <Text style={styles.modalLabel}>Ay</Text>
            <View style={styles.monthGrid}>
              {calendarMonths.map((month) => (
                <Chip
                  key={String(month.key)}
                  title={month.label}
                  active={tempMonthOffset === month.key}
                  onPress={() => setTempMonthOffset(month.key)}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Gün</Text>
            <View style={styles.dayGrid}>
              {Array.from({ length: 28 }).map((_, index) => {
                const day = String(index + 1);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCell, tempDay === day && styles.dayCellActive]}
                    onPress={() => setTempDay(day)}
                  >
                    <Text style={[styles.dayCellText, tempDay === day && styles.dayCellTextActive]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: insets.top + 4, paddingBottom: 220 },
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 8, padding: 16 },
  label: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 14, marginTop: 12, marginBottom: 7 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.neutral[100],
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary[600] },
  chipText: { color: theme.colors.text.primary, fontWeight: '700' },
  chipTextActive: { color: theme.colors.text.onPrimary },
  customMonthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  customMonthInput: { width: 80, marginBottom: 0, textAlign: 'center' },
  customMonthLabel: { color: theme.colors.text.secondary, fontWeight: '600' },
  helperText: { color: theme.colors.text.secondary, fontSize: 12, lineHeight: 17, marginTop: -2, marginBottom: 8 },
  collectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  collectionPrefix: { color: theme.colors.text.secondary, fontWeight: '700' },
  collectionHint: { flex: 1, color: theme.colors.text.secondary, fontSize: 12, lineHeight: 17 },
  dayInput: { width: 58, marginBottom: 0, textAlign: 'center', paddingHorizontal: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  dateButton: {
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    marginBottom: 14,
  },
  dateButtonText: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '800' },
  dateHint: { color: theme.colors.text.secondary, marginTop: 4 },
  saveButton: {
    marginTop: 6,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: { color: theme.colors.text.onPrimary, fontWeight: '900', fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text.primary, marginBottom: 12 },
  modalLabel: { fontSize: 14, fontWeight: '800', color: theme.colors.text.secondary, marginBottom: 8, marginTop: 6 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
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
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: theme.colors.text.primary, fontWeight: '800' },
  primaryBtn: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
});
