import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expensesApi, houseApi, ledgerApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { EmptyState, LoadingState, PageHeader, PrimaryButton, money } from '../shared/ui/roomora/CanonicalUI';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';
import eventBus from '../shared/events/bus';
import KeyboardAwareScreen from '../shared/ui/KeyboardAwareScreen';

const pick = (value, keys, fallback = undefined) =>
  keys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null) ?? fallback;

export default function HarcamaDetayi({ navigation, route }) {
  const expenseId = route?.params?.expenseId ?? route?.params?.billId;
  const houseId = route?.params?.houseId;
  const initialExpense = route?.params?.initialExpense || null;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [loading, setLoading] = useState(!initialExpense);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState(initialExpense);
  const [members, setMembers] = useState([]);
  const [shares, setShares] = useState([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payerId, setPayerId] = useState('');
  const [participantIds, setParticipantIds] = useState([]);
  const [personal, setPersonal] = useState({});

  const hydrateForm = useCallback((item, availableMembers = []) => {
    setTitle(String(pick(item, ['tur', 'Tur', 'description', 'Description'], 'Harcama')));
    setAmount(formatMoneyInput(String(pick(item, ['tutar', 'Tutar', 'amount', 'Amount'], 0))));
    setNote(String(pick(item, ['note', 'Note', 'aciklama', 'Aciklama', 'description', 'Description'], '')));
    setPayerId(String(pick(item, ['odeyenUserId', 'OdeyenUserId'], '')));

    const itemShares = pick(item, ['shares', 'Shares'], []);
    const personalItems = pick(item, ['sahsiHarcamalar', 'SahsiHarcamalar'], []);
    const selected = new Set(
      [...(Array.isArray(itemShares) ? itemShares : []), ...(Array.isArray(personalItems) ? personalItems : [])]
        .map((entry) => Number(pick(entry, ['userId', 'UserId'], 0)))
        .filter(Boolean)
    );
    if (!selected.size) availableMembers.forEach((member) => selected.add(member.id));
    setParticipantIds(Array.from(selected).map(String));
    setPersonal(
      (Array.isArray(personalItems) ? personalItems : []).reduce((result, entry) => {
        const userId = Number(pick(entry, ['userId', 'UserId'], 0));
        const value = Number(pick(entry, ['tutar', 'Tutar'], 0));
        if (userId && value > 0) result[String(userId)] = formatMoneyInput(String(value));
        return result;
      }, {})
    );
  }, []);

  const load = useCallback(async () => {
    if (!expenseId) {
      setLoading(false);
      return;
    }
    if (!initialExpense) setLoading(true);
    try {
      const [expenseResult, ledgerResult, memberResult] = await Promise.allSettled([
        expensesApi.getById(expenseId),
        ledgerApi.byExpense(expenseId),
        houseId ? houseApi.getMembers(houseId) : Promise.resolve({ data: [] }),
      ]);
      const item = expenseResult.status === 'fulfilled'
        ? expenseResult.value?.data?.data ?? expenseResult.value?.data
        : null;
      const ledger = ledgerResult.status === 'fulfilled'
        ? ledgerResult.value?.data?.data ?? ledgerResult.value?.data ?? []
        : [];
      const memberList = memberResult.status === 'fulfilled'
        ? memberResult.value?.data?.data ?? memberResult.value?.data ?? []
        : [];
      const normalizedMembers = (Array.isArray(memberList) ? memberList : []).map((member) => {
        const id = Number(pick(member, ['userId', 'UserId', 'id'], 0));
        return {
          id,
          fullName: pick(member, ['fullName', 'FullName', 'name', 'Name'], `Kullanıcı ${id}`),
        };
      }).filter((member) => member.id > 0);
      const totals = new Map();
      (Array.isArray(ledger) ? ledger : []).forEach((line) => {
        const id = Number(pick(line, ['fromUserId', 'FromUserId'], 0));
        const value = Number(pick(line, ['amount', 'Amount'], 0));
        if (id) totals.set(id, (totals.get(id) || 0) + value);
      });
      const apiShares = pick(item, ['shares', 'Shares'], []);
      const normalizedShares = (Array.isArray(apiShares) ? apiShares : [])
        .map((share) => ({
          userId: Number(pick(share, ['userId', 'UserId'], 0)),
          value: Number(pick(share, ['paylasimTutar', 'PaylasimTutar'], 0)),
        }))
        .filter((share) => share.userId > 0);
      setMembers(normalizedMembers);
      setShares(normalizedShares.length
        ? normalizedShares
        : Array.from(totals, ([userId, value]) => ({ userId, value })));
      setExpense(item);
      if (item) hydrateForm(item, normalizedMembers);
    } catch {
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }, [expenseId, houseId, hydrateForm, initialExpense]);

  useEffect(() => {
    if (initialExpense) hydrateForm(initialExpense, []);
  }, [hydrateForm, initialExpense]);
  useEffect(() => { load(); }, [load]);

  const toggleParticipant = (memberId) => {
    const id = String(memberId);
    setParticipantIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        setPersonal((values) => {
          const next = { ...values };
          delete next[id];
          return next;
        });
        return current.filter((value) => value !== id);
      }
      return [...current, id];
    });
  };

  const save = async () => {
    const totalValue = parseMoneyInput(amount);
    const personalItems = Object.entries(personal)
      .filter(([userId]) => participantIds.includes(String(userId)))
      .map(([userId, value]) => ({ UserId: Number(userId), Tutar: parseMoneyInput(value) || 0 }))
      .filter((item) => item.Tutar > 0);
    const personalTotal = personalItems.reduce((sum, item) => sum + item.Tutar, 0);
    const sharedValue = Number(Math.max(totalValue - personalTotal, 0).toFixed(2));
    if (
      !title.trim()
      || totalValue <= 0
      || !participantIds.length
      || !payerId
      || personalTotal > totalValue
    ) {
      Alert.alert(
        'Bilgileri kontrol et',
        'Kişisel kalemler toplam tutarı aşamaz; ödeyen ile en az bir katılımcı seçilmelidir.'
      );
      return;
    }
    setSaving(true);
    try {
      await expensesApi.update(expenseId, {
        Tur: title.trim(),
        Tutar: totalValue,
        OrtakHarcamaTutari: sharedValue,
        OdeyenUserId: Number(payerId),
        Participants: participantIds.map(Number),
        Aciklama: note.trim(),
        Note: note.trim(),
        Description: note.trim(),
        SahsiHarcamalar: personalItems,
      });
      eventBus.emit('expenses:updated', { houseId: Number(houseId) });
      setEditing(false);
      await load();
      Alert.alert('Harcama güncellendi');
    } catch (error) {
      Alert.alert('Güncellenemedi', error?.response?.data?.message || 'Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => Alert.alert(
    'Harcamayı sil',
    'Bu işlem geri alınamaz.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await expensesApi.remove(expenseId);
            eventBus.emit('expenses:updated', { houseId: Number(houseId) });
            navigation.goBack();
          } catch {
            Alert.alert('Silinemedi', 'Harcama silinirken bir sorun oluştu.');
          }
        },
      },
    ]
  );

  if (loading) {
    return <View style={styles.screen}><LoadingState label="Harcama yükleniyor..." /></View>;
  }
  if (!expense) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <PageHeader title="Harcama Detayı" onBack={() => navigation.goBack()} />
          <EmptyState title="Harcama bulunamadı" description="Kayıt silinmiş veya artık erişilemiyor olabilir." />
        </View>
      </View>
    );
  }

  const total = Number(pick(expense, ['tutar', 'Tutar', 'amount', 'Amount'], 0));
  const payer = pick(expense, ['odeyenKullaniciAdi', 'OdeyenKullaniciAdi'], 'Bilinmiyor');
  const memberName = (userId) =>
    members.find((member) => member.id === Number(userId))?.fullName || `Kullanıcı ${userId}`;
  const dateRaw = pick(expense, ['postDate', 'PostDate', 'kayitTarihi', 'KayitTarihi', 'createdAt', 'CreatedAt']);
  const date = dateRaw ? new Date(dateRaw) : null;
  const personalItems = (Array.isArray(pick(expense, ['sahsiHarcamalar', 'SahsiHarcamalar'], []))
    ? pick(expense, ['sahsiHarcamalar', 'SahsiHarcamalar'], [])
    : [])
    .map((item) => ({
      userId: Number(pick(item, ['userId', 'UserId'], 0)),
      value: Number(pick(item, ['tutar', 'Tutar'], 0)),
      name: pick(item, ['kullaniciAdi', 'KullaniciAdi'], ''),
    }))
    .filter((item) => item.userId > 0 && item.value > 0);
  const visibleNote = note && note.trim() !== title.trim() ? note : '';

  return (
    <View style={styles.screen}>
      <KeyboardAwareScreen contentContainerStyle={styles.content} bottomOffset={44}>
        <PageHeader
          title={editing ? 'Harcamayı Düzenle' : 'Harcama Detayı'}
          subtitle={route?.params?.houseName}
          onBack={() => editing ? setEditing(false) : navigation.goBack()}
          rightIcon={editing ? undefined : 'trash-outline'}
          onRightPress={remove}
        />

        {!editing ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="cart-outline" size={30} color="#fff" />
              </View>
              <Text style={styles.heroAmount}>{money(total)}</Text>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroDate}>{date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('tr-TR') : 'Tarih yok'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Harcama Bilgileri</Text>
              <InfoRow icon="person-outline" label="Ödeyen" value={payer} styles={styles} theme={theme} />
              <InfoRow icon="people-outline" label="Bölüşüm" value={`${Math.max(shares.length, 1)} kişi`} styles={styles} theme={theme} />
              {!!visibleNote && <InfoRow icon="document-text-outline" label="Not" value={visibleNote} styles={styles} theme={theme} />}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Nasıl Bölüşüldü?</Text>
              {shares.length ? shares.map((item) => (
                <View key={String(item.userId)} style={styles.shareRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{memberName(item.userId).charAt(0)}</Text></View>
                  <Text style={styles.shareName}>{memberName(item.userId)}</Text>
                  <Text style={styles.shareValue}>{money(item.value)}</Text>
                </View>
              )) : <Text style={styles.muted}>Bu harcama için paylaşım satırı bulunmuyor.</Text>}
            </View>

            {personalItems.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Kişisel kalemler</Text>
                <Text style={styles.sectionDescription}>Yalnızca ilgili kişinin payına eklenen tutarlar</Text>
                {personalItems.map((item) => (
                  <View key={`personal-detail-${item.userId}`} style={styles.shareRow}>
                    <View style={styles.personalIcon}>
                      <Ionicons name="person-outline" size={16} color={theme.colors.warning[700]} />
                    </View>
                    <View style={styles.personalBody}>
                      <Text style={styles.shareName}>{item.name || memberName(item.userId)}</Text>
                      <Text style={styles.personalCaption}>Kişisel harcama</Text>
                    </View>
                    <Text style={styles.shareValue}>{money(item.value)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Ionicons name="pencil-outline" size={19} color={theme.colors.primary[700]} />
              <Text style={styles.editText}>Düzenle</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.formCard}>
            <Field label="Harcama adı" value={title} onChangeText={setTitle} styles={styles} />
            <Field label="Toplam tutar" value={amount} onChangeText={(value) => setAmount(formatMoneyInput(value))} keyboardType="decimal-pad" styles={styles} />
            <Text style={styles.fieldLabel}>Ödemeyi yapan</Text>
            <View style={styles.chips}>
              {members.map((member) => {
                const active = payerId === String(member.id);
                return (
                  <TouchableOpacity
                    key={`payer-${member.id}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setPayerId(String(member.id))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>Kimin için?</Text>
            <View style={styles.chips}>
              <TouchableOpacity
                style={[styles.chip, participantIds.length === members.length && styles.chipActive]}
                onPress={() => setParticipantIds(members.map((member) => String(member.id)))}
              >
                <Text style={[styles.chipText, participantIds.length === members.length && styles.chipTextActive]}>Ortak</Text>
              </TouchableOpacity>
              {members.map((member) => {
                const active = participantIds.includes(String(member.id));
                return (
                  <TouchableOpacity
                    key={`participant-${member.id}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleParticipant(member.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{member.fullName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>Kişisel kalemler</Text>
            {members.map((member) => {
              const enabled = participantIds.includes(String(member.id));
              return (
                <View key={`personal-${member.id}`} style={[styles.personalRow, !enabled && styles.disabledRow]}>
                  <Text style={[styles.personalName, !enabled && styles.disabledText]}>{member.fullName}</Text>
                  <TextInput
                    editable={enabled}
                    value={enabled ? personal[String(member.id)] || '' : ''}
                    onChangeText={(value) => setPersonal((current) => ({
                      ...current,
                      [String(member.id)]: formatMoneyInput(value),
                    }))}
                    placeholder={enabled ? '0,00' : 'Seçilmedi'}
                    placeholderTextColor={theme.colors.text.disabled}
                    keyboardType="decimal-pad"
                    style={[styles.personalInput, !enabled && styles.personalInputDisabled]}
                  />
                </View>
              );
            })}
            <View style={styles.splitSummary}>
              <Text style={styles.splitSummaryLabel}>Ortak bölüşülecek tutar</Text>
              <Text style={styles.splitSummaryValue}>
                {money(Math.max(parseMoneyInput(amount) - Object.entries(personal)
                  .filter(([userId]) => participantIds.includes(String(userId)))
                  .reduce((sum, [, value]) => sum + (parseMoneyInput(value) || 0), 0), 0))}
              </Text>
            </View>
            <Field label="Not" value={note} onChangeText={setNote} multiline styles={styles} />
            <PrimaryButton label={saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'} icon="checkmark" onPress={save} disabled={saving} />
          </View>
        )}
      </KeyboardAwareScreen>
    </View>
  );
}

function InfoRow({ icon, label, value, styles, theme }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={19} color={theme.colors.primary[700]} /></View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Field({ label, styles, multiline, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#95a3b1"
        style={[styles.input, multiline && styles.multiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: insets.bottom + 28 },
  hero: { alignItems: 'center', paddingVertical: 18 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  heroAmount: { color: theme.colors.text.primary, fontFamily: theme.typography.extrabold, fontSize: 31, marginTop: 10 },
  heroTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 17, marginTop: 6 },
  heroDate: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 12, marginTop: 4 },
  card: { borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 10 },
  sectionTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 15, marginBottom: 6 },
  sectionDescription: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 12, marginTop: -5, marginBottom: 7 },
  infoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.neutral[100] },
  infoIcon: { width: 30, height: 30, borderRadius: 7, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 13 },
  infoValue: { maxWidth: '48%', color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 13, textAlign: 'right' },
  shareRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.neutral[100] },
  avatar: { width: 29, height: 29, borderRadius: 15, backgroundColor: theme.colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.primary[700], fontFamily: theme.typography.bold },
  shareName: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.medium, fontSize: 14 },
  shareValue: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 14 },
  personalIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.warning[50], alignItems: 'center', justifyContent: 'center' },
  personalBody: { flex: 1 },
  personalCaption: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 11, marginTop: 2 },
  muted: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 13, paddingVertical: 8 },
  editButton: { minHeight: 52, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary[300], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface },
  editText: { color: theme.colors.primary[700], fontFamily: theme.typography.bold, fontSize: 15 },
  formCard: { borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, padding: 16, marginTop: 14 },
  field: { marginBottom: 15 },
  fieldLabel: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 13, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[300], backgroundColor: theme.colors.background, color: theme.colors.text.primary, fontFamily: theme.typography.regular, fontSize: 15, paddingHorizontal: 13 },
  multiline: { height: 88, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[300], backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50] },
  chipText: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 13 },
  chipTextActive: { color: theme.colors.primary[700], fontFamily: theme.typography.bold },
  personalRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  disabledRow: { opacity: 0.48 },
  personalName: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.medium, fontSize: 13 },
  disabledText: { color: theme.colors.text.disabled },
  personalInput: { width: 112, minHeight: 44, borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, paddingHorizontal: 12, color: theme.colors.text.primary, backgroundColor: theme.colors.background, textAlign: 'right' },
  personalInputDisabled: { backgroundColor: theme.colors.neutral[100] },
  splitSummary: { minHeight: 52, borderRadius: 8, backgroundColor: theme.colors.primary[50], paddingHorizontal: 14, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  splitSummaryLabel: { flex: 1, color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 13 },
  splitSummaryValue: { color: theme.colors.primary[800], fontFamily: theme.typography.bold, fontSize: 15 },
});
