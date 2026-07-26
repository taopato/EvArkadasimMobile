import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { expensesApi, houseApi, ledgerApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { EmptyState, LoadingState, PageHeader, PrimaryButton, money } from '../shared/ui/roomora/CanonicalUI';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';
import eventBus from '../shared/events/bus';

const pick = (value, keys, fallback = undefined) =>
  keys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null) ?? fallback;

export default function HarcamaDetayi({ navigation, route }) {
  const expenseId = route?.params?.expenseId ?? route?.params?.billId;
  const houseId = route?.params?.houseId;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState(null);
  const [members, setMembers] = useState({});
  const [shares, setShares] = useState([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [shared, setShared] = useState('');
  const [note, setNote] = useState('');

  const hydrateForm = useCallback((item) => {
    setTitle(String(pick(item, ['tur', 'Tur', 'description', 'Description'], 'Harcama')));
    setAmount(formatMoneyInput(String(pick(item, ['tutar', 'Tutar', 'amount', 'Amount'], 0))));
    setShared(formatMoneyInput(String(pick(item, ['ortakHarcamaTutari', 'OrtakHarcamaTutari'], 0))));
    setNote(String(pick(item, ['note', 'Note', 'aciklama', 'Aciklama', 'description', 'Description'], '')));
  }, []);

  const load = useCallback(async () => {
    if (!expenseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
      const names = {};
      (Array.isArray(memberList) ? memberList : []).forEach((member) => {
        const id = Number(pick(member, ['userId', 'UserId', 'id'], 0));
        names[id] = pick(member, ['fullName', 'FullName', 'name', 'Name'], `Kullanıcı ${id}`);
      });
      const totals = new Map();
      (Array.isArray(ledger) ? ledger : []).forEach((line) => {
        const id = Number(pick(line, ['fromUserId', 'FromUserId'], 0));
        const value = Number(pick(line, ['amount', 'Amount'], 0));
        if (id) totals.set(id, (totals.get(id) || 0) + value);
      });
      setMembers(names);
      setShares(Array.from(totals, ([userId, value]) => ({ userId, value })));
      setExpense(item);
      if (item) hydrateForm(item);
    } catch {
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }, [expenseId, houseId, hydrateForm]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const totalValue = parseMoneyInput(amount);
    const sharedValue = parseMoneyInput(shared);
    if (!title.trim() || totalValue <= 0 || sharedValue < 0 || sharedValue > totalValue) {
      Alert.alert('Bilgileri kontrol et', 'Başlık, toplam tutar ve ortak tutar alanlarını kontrol et.');
      return;
    }
    setSaving(true);
    try {
      await expensesApi.update(expenseId, {
        Tur: title.trim(),
        Tutar: totalValue,
        OrtakHarcamaTutari: sharedValue,
        Aciklama: note.trim(),
        Note: note.trim(),
        Description: note.trim(),
        SahsiHarcamalar: pick(expense, ['sahsiHarcamalar', 'SahsiHarcamalar'], []),
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
  const dateRaw = pick(expense, ['postDate', 'PostDate', 'kayitTarihi', 'KayitTarihi', 'createdAt', 'CreatedAt']);
  const date = dateRaw ? new Date(dateRaw) : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
              {!!note && <InfoRow icon="document-text-outline" label="Not" value={note} styles={styles} theme={theme} />}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Nasıl Bölüşüldü?</Text>
              {shares.length ? shares.map((item) => (
                <View key={String(item.userId)} style={styles.shareRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{String(members[item.userId] || 'K').charAt(0)}</Text></View>
                  <Text style={styles.shareName}>{members[item.userId] || `Kullanıcı ${item.userId}`}</Text>
                  <Text style={styles.shareValue}>{money(item.value)}</Text>
                </View>
              )) : <Text style={styles.muted}>Bu harcama için paylaşım satırı bulunmuyor.</Text>}
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Ionicons name="pencil-outline" size={19} color={theme.colors.primary[700]} />
              <Text style={styles.editText}>Düzenle</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.formCard}>
            <Field label="Harcama adı" value={title} onChangeText={setTitle} styles={styles} />
            <Field label="Toplam tutar" value={amount} onChangeText={(value) => setAmount(formatMoneyInput(value))} keyboardType="decimal-pad" styles={styles} />
            <Field label="Ortak tutar" value={shared} onChangeText={(value) => setShared(formatMoneyInput(value))} keyboardType="decimal-pad" styles={styles} />
            <Field label="Not" value={note} onChangeText={setNote} multiline styles={styles} />
            <PrimaryButton label={saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'} icon="checkmark" onPress={save} disabled={saving} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  hero: { alignItems: 'center', paddingVertical: 28 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  heroAmount: { color: theme.colors.text.primary, fontFamily: theme.typography.extrabold, fontSize: 34, marginTop: 14 },
  heroTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 17, marginTop: 6 },
  heroDate: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 12, marginTop: 4 },
  card: { borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, padding: 16, marginBottom: 14 },
  sectionTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 17, marginBottom: 10 },
  infoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.neutral[100] },
  infoIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 13 },
  infoValue: { maxWidth: '48%', color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 13, textAlign: 'right' },
  shareRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.neutral[100] },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.primary[700], fontFamily: theme.typography.bold },
  shareName: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.medium, fontSize: 14 },
  shareValue: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 14 },
  muted: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 13, paddingVertical: 8 },
  editButton: { minHeight: 52, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary[300], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.surface },
  editText: { color: theme.colors.primary[700], fontFamily: theme.typography.bold, fontSize: 15 },
  formCard: { borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, padding: 16, marginTop: 14 },
  field: { marginBottom: 15 },
  fieldLabel: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 13, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[300], backgroundColor: theme.colors.background, color: theme.colors.text.primary, fontFamily: theme.typography.regular, fontSize: 15, paddingHorizontal: 13 },
  multiline: { height: 88, paddingTop: 12 },
});
