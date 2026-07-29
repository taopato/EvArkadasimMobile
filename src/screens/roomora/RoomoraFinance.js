import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { houseApi, paymentsApi } from '../../services/api';
import { formatMoneyInput, parseMoneyInput } from '../../shared/format/money';
import { resolveMediaUrl } from '../../shared/config/env';
import { useTheme } from '../../shared/theme/ThemeProvider';
import {
  Avatar,
  EmptyState,
  ListRow,
  LoadingState,
  PageHeader,
  Pill,
  PrimaryButton,
  SectionHeader,
  money,
} from '../../shared/ui/roomora/CanonicalUI';

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const numberOf = (value) => Number(value || 0);
const dateText = (value) => value
  ? new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '-';

function normalizePayment(item) {
  const rawStatus = String(item.onayDurumu ?? item.Durum ?? item.status ?? 'Pending').toLowerCase();
  const status = rawStatus.includes('approve') || rawStatus.includes('onay')
    ? 'Approved'
    : rawStatus.includes('reject') || rawStatus.includes('red')
      ? 'Rejected'
      : 'Pending';
  return {
    id: item.id ?? item.paymentId,
    amount: numberOf(item.tutar ?? item.Tutar ?? item.amount),
    date: item.odemeTarihi ?? item.OdemeTarihi ?? item.date ?? item.createdAt,
    payerId: numberOf(item.borcluUserId ?? item.BorcluUserId ?? item.payerUserId ?? item.fromUserId),
    receiverId: numberOf(item.alacakliUserId ?? item.AlacakliUserId ?? item.toUserId),
    payerName: item.borcluUserName ?? item.BorcluUserName ?? item.payerName ?? item.fromUserName ?? 'Ev arkadaşı',
    receiverName: item.alacakliUserName ?? item.AlacakliUserName ?? item.toUserName ?? 'Ev arkadaşı',
    note: item.aciklama ?? item.Aciklama ?? item.note ?? '',
    status,
  };
}

function useHouseId(route) {
  const { user } = useAuth();
  return numberOf(route?.params?.houseId ?? user?.defaultHouseId);
}

function useDebtSummary(houseId) {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, debts: [], receivables: [], totals: {} });
  const load = useCallback(async () => {
    if (!houseId || !user?.id) {
      setState({ loading: false, debts: [], receivables: [], totals: {} });
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    try {
      const [debtResponse, memberResponse] = await Promise.all([
        houseApi.getUserDebts(numberOf(user.id), houseId),
        houseApi.getMembers(houseId),
      ]);
      const body = unwrap(debtResponse);
      const members = arrayOf(unwrap(memberResponse));
      const people = new Map(members.map((member) => [
        numberOf(member.userId ?? member.user?.id ?? member.id),
        {
          name: member.fullName ?? member.name ?? member.user?.fullName ?? 'Ev arkadaşı',
          photo: resolveMediaUrl(member.profileImageUrl ?? member.user?.profileImageUrl),
        },
      ]));
      const me = numberOf(user.id);
      const pairs = arrayOf(body.pairs);
      const debts = [];
      const receivables = [];
      pairs.forEach((pair) => {
        const from = numberOf(pair.fromUserId);
        const to = numberOf(pair.toUserId);
        const amount = Math.abs(numberOf(pair.netAmount));
        if (!amount) return;
        if (from === me) debts.push({ id: to, name: pair.toUserName ?? people.get(to)?.name, photo: people.get(to)?.photo, amount });
        if (to === me) receivables.push({ id: from, name: pair.fromUserName ?? people.get(from)?.name, photo: people.get(from)?.photo, amount });
      });
      if (!pairs.length) {
        arrayOf(body.kullaniciBazliDurumlar).forEach((row) => {
          const amount = numberOf(row.amount);
          const person = people.get(numberOf(row.userId));
          const item = { id: numberOf(row.userId), name: row.userName ?? person?.name, photo: person?.photo, amount: Math.abs(amount) };
          if (amount > 0) debts.push(item);
          if (amount < 0) receivables.push(item);
        });
      }
      const payable = numberOf(body.toplamBorc) || debts.reduce((sum, row) => sum + row.amount, 0);
      const receivable = numberOf(body.toplamAlacak) || receivables.reduce((sum, row) => sum + row.amount, 0);
      setState({ loading: false, debts, receivables, totals: { payable, receivable, net: receivable - payable } });
    } catch {
      setState({ loading: false, debts: [], receivables: [], totals: { payable: 0, receivable: 0, net: 0 } });
    }
  }, [houseId, user?.id]);
  useEffect(() => { load(); }, [load]);
  return { ...state, load };
}

function Screen({ children, scroll = true, refreshControl }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!scroll) return <View style={[styles.screen, { paddingTop: insets.top }]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function SummaryHero({ title, value, subtitle, tone = 'primary' }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const backgroundColor = tone === 'primary' ? theme.colors.primary[700] : theme.colors.surface;
  const foreground = tone === 'primary' ? '#fff' : theme.colors.text.primary;
  return (
    <View style={[styles.hero, { backgroundColor }]}>
      <Text style={[styles.heroLabel, { color: foreground }]}>{title}</Text>
      <Text style={[styles.heroAmount, { color: foreground }]}>{money(value)}</Text>
      {!!subtitle && <Text style={[styles.heroSubtitle, { color: tone === 'primary' ? theme.colors.primary[100] : theme.colors.text.secondary }]}>{subtitle}</Text>}
    </View>
  );
}

export function DebtSummaryScreen({ route, navigation }) {
  const houseId = useHouseId(route);
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const data = useDebtSummary(houseId);
  if (data.loading) return <Screen><LoadingState label="Borç ve alacaklar yükleniyor..." /></Screen>;
  return (
    <Screen refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.load} />}>
      <PageHeader title="Borç / Alacak Özeti" subtitle={route?.params?.houseName ?? user?.defaultHouseName ?? 'Aktif ev'} onBack={() => navigation.goBack()} />
      <SummaryHero title="Net durumun" value={data.totals.net} subtitle={data.totals.net >= 0 ? 'Alacaklı durumdasın' : 'Borçlu durumdasın'} />
      <View style={styles.metricRow}>
        <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('Alacaklarim', { houseId })}>
          <Text style={styles.metricLabel}>Alacağım</Text>
          <Text style={[styles.metricValue, { color: theme.colors.success[700] }]}>{money(data.totals.receivable)}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral[400]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('Borclar', { houseId })}>
          <Text style={styles.metricLabel}>Borcum</Text>
          <Text style={[styles.metricValue, { color: theme.colors.error[700] }]}>{money(data.totals.payable)}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral[400]} />
        </TouchableOpacity>
      </View>
      <View style={styles.actionGap}>
        {data.debts.length > 0 && (
          <PrimaryButton
            label="Ödeme Yap"
            icon="card-outline"
            onPress={() => navigation.navigate('OdemeEkle', { houseId })}
          />
        )}
        <TouchableOpacity
          style={styles.pendingLink}
          onPress={() => navigation.navigate('PaymentsScreen', { houseId })}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.primary[700]} />
          <Text style={styles.pendingLinkText}>Gönderilen ve alınan ödemeler</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary[700]} />
        </TouchableOpacity>
      </View>
      <SectionHeader title="Kişi bazlı durum" />
      {[...data.debts.map((x) => ({ ...x, kind: 'debt' })), ...data.receivables.map((x) => ({ ...x, kind: 'receivable' }))].map((item) => (
        <ListRow
          key={`${item.kind}-${item.id}`}
          icon="person-outline"
          title={item.name || 'Ev arkadaşı'}
          subtitle={item.kind === 'debt' ? 'Borçlusun' : 'Sana borçlu'}
          amount={item.amount}
          amountTone={item.kind === 'debt' ? 'negative' : 'positive'}
          onPress={() => navigation.navigate('KisiDetayi', { houseId, userAId: user?.id, userBId: item.id, userName: item.name, userPhoto: item.photo })}
        />
      ))}
      {!data.debts.length && !data.receivables.length && <EmptyState icon="checkmark-circle-outline" title="Hesaplar dengede" description="Bu ev için açık borç veya alacak bulunmuyor." />}
    </Screen>
  );
}

function BalanceListScreen({ route, navigation, mode }) {
  const houseId = useHouseId(route);
  const { user } = useAuth();
  const data = useDebtSummary(houseId);
  const rows = mode === 'debt' ? data.debts : data.receivables;
  const total = mode === 'debt' ? data.totals.payable : data.totals.receivable;
  const title = mode === 'debt' ? 'Borçlarım' : 'Alacaklarım';
  if (data.loading) return <Screen><LoadingState label={`${title} yükleniyor...`} /></Screen>;
  return (
    <Screen refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.load} />}>
      <PageHeader title={title} subtitle={route?.params?.houseName ?? user?.defaultHouseName ?? 'Aktif ev'} onBack={() => navigation.goBack()} />
      <SummaryHero title={mode === 'debt' ? 'Toplam borcum' : 'Toplam alacağım'} value={total} />
      <SectionHeader title={mode === 'debt' ? 'Borçlu olduğum kişiler' : 'Bana borçlu kişiler'} />
      {rows.map((item) => (
        <ListRow
          key={String(item.id)}
          icon="person-outline"
          title={item.name || 'Ev arkadaşı'}
          subtitle={mode === 'debt' ? 'Ödeme bekliyor' : 'Tahsilat bekliyor'}
          amount={item.amount}
          amountTone={mode === 'debt' ? 'negative' : 'positive'}
          onPress={() => navigation.navigate('KisiDetayi', { houseId, userAId: user?.id, userBId: item.id, userName: item.name, userPhoto: item.photo })}
        />
      ))}
      {!rows.length && <EmptyState title={mode === 'debt' ? 'Borcun yok' : 'Alacağın yok'} description="Yeni hareketler burada görünecek." />}
      {mode === 'debt' && rows.length > 0 && <PrimaryButton label="Ödeme Bildir" icon="card-outline" onPress={() => navigation.navigate('OdemeEkle', { houseId })} />}
    </Screen>
  );
}

export const DebtsScreen = (props) => <BalanceListScreen {...props} mode="debt" />;
export const ReceivablesScreen = (props) => <BalanceListScreen {...props} mode="receivable" />;

export function PaymentsScreen({ route, navigation }) {
  const houseId = useHouseId(route);
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    if (!houseId) return setLoading(false);
    setLoading(true);
    try {
      const response = await paymentsApi.getByHouse(houseId);
      const body = unwrap(response);
      setItems(arrayOf(body.items ?? body.payments ?? body).map(normalizePayment).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
    } catch { setItems([]); } finally { setLoading(false); }
  }, [houseId]);
  useEffect(() => { load(); }, [load]);
  const filtered = items.filter((item) => filter === 'all' || item.status === filter);
  const pending = items.filter((item) => item.status === 'Pending' && item.receiverId === numberOf(user?.id)).length;
  if (loading) return <Screen><LoadingState label="Ödemeler yükleniyor..." /></Screen>;
  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <PageHeader title="Ödemeler" subtitle="Borç, alacak ve ödeme hareketleri" onBack={() => navigation.goBack()} />
      <SummaryHero title="Bu ayki ödeme hareketleri" value={items.reduce((sum, item) => sum + item.amount, 0)} subtitle={`${items.length} işlem`} />
      <View style={styles.actionGap}>
        <PrimaryButton label="Yeni Ödeme Ekle" icon="card-outline" onPress={() => navigation.navigate('OdemeEkle', { houseId })} />
        {pending > 0 && (
          <TouchableOpacity style={styles.pendingLink} onPress={() => navigation.navigate('BekleyenOdemeler', { userId: user?.id })}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary[700]} />
            <Text style={styles.pendingLinkText}>{pending} ödeme onayını bekliyor</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primary[700]} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.pills}>
        <Pill label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill label="Bekleyen" active={filter === 'Pending'} onPress={() => setFilter('Pending')} />
        <Pill label="Onaylanan" active={filter === 'Approved'} onPress={() => setFilter('Approved')} />
      </View>
      <SectionHeader title="Hesap hareketleri" />
      {filtered.map((item) => {
        const sent = item.payerId === numberOf(user?.id);
        return (
          <ListRow
            key={String(item.id)}
            icon={sent ? 'arrow-up-outline' : 'arrow-down-outline'}
            title={sent ? item.receiverName : item.payerName}
            subtitle={`${dateText(item.date)}${item.note ? ` · ${item.note}` : ''}`}
            amount={item.amount}
            amountTone={sent ? 'negative' : 'positive'}
            badge={item.status === 'Pending' ? 'Bekliyor' : item.status === 'Approved' ? 'Onaylandı' : 'Reddedildi'}
            badgeTone={item.status === 'Pending' ? 'info' : item.status === 'Approved' ? 'success' : 'error'}
          />
        );
      })}
      {!filtered.length && <EmptyState title="Ödeme hareketi yok" description="Seçtiğin filtreye uygun bir ödeme bulunmuyor." />}
    </Screen>
  );
}

export function PendingPaymentsScreen({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const userId = numberOf(route?.params?.userId ?? user?.id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentsApi.getPendingPayments(userId);
      setItems(arrayOf(unwrap(response)).map(normalizePayment));
    } catch { setItems([]); } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  const act = async (item, approve) => {
    setBusyId(item.id);
    try {
      if (approve) await paymentsApi.approve(item.id);
      else await paymentsApi.reject(item.id);
      Alert.alert(approve ? 'Ödeme onaylandı' : 'Ödeme reddedildi', approve ? 'Bakiye güncellendi.' : 'Gönderene bilgi verilecek.');
      await load();
    } catch (error) {
      Alert.alert('İşlem yapılamadı', error?.response?.data?.message ?? 'Lütfen tekrar deneyin.');
    } finally { setBusyId(null); }
  };
  if (loading) return <Screen><LoadingState label="Bekleyen ödemeler yükleniyor..." /></Screen>;
  return (
    <Screen>
      <PageHeader title="Bekleyen Ödemeler" subtitle="Onayını bekleyen ödeme bildirimleri" onBack={() => navigation.goBack()} />
      {items.map((item) => (
        <View key={String(item.id)} style={styles.approvalCard}>
          <View style={styles.personRow}><Avatar name={item.payerName} /><View style={styles.flex}><Text style={styles.cardTitle}>{item.payerName}</Text><Text style={styles.cardSub}>{dateText(item.date)} · {item.note || 'Ödeme bildirimi'}</Text></View><Text style={styles.cardAmount}>{money(item.amount)}</Text></View>
          <View style={styles.buttonRow}>
            <TouchableOpacity disabled={busyId === item.id} style={styles.secondaryButton} onPress={() => act(item, false)}><Text style={styles.secondaryButtonText}>Reddet</Text></TouchableOpacity>
            <TouchableOpacity disabled={busyId === item.id} style={styles.approveButton} onPress={() => act(item, true)}><Text style={styles.approveButtonText}>Onayla</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {!items.length && <EmptyState icon="checkmark-circle-outline" title="Bekleyen ödeme yok" description="Onay gerektiren yeni bildirimler burada görünecek." />}
    </Screen>
  );
}

export function PersonDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const houseId = useHouseId(route);
  const otherId = numberOf(route?.params?.userBId ?? route?.params?.otherUserId ?? route?.params?.userId);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!houseId || !otherId || !user?.id) return setLoading(false);
    setLoading(true);
    try {
      const [summaryResponse, paymentResponse] = await Promise.all([
        houseApi.getUserDebtBetween(houseId, numberOf(user.id), otherId),
        paymentsApi.getByHouse(houseId),
      ]);
      setSummary(unwrap(summaryResponse));
      setPayments(arrayOf(unwrap(paymentResponse)?.items ?? unwrap(paymentResponse)?.payments ?? unwrap(paymentResponse))
        .map(normalizePayment)
        .filter((item) => (
          (item.payerId === numberOf(user.id) && item.receiverId === otherId)
          || (item.receiverId === numberOf(user.id) && item.payerId === otherId)
        ))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5));
    }
    catch { setSummary(null); } finally { setLoading(false); }
  }, [houseId, otherId, user?.id]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <Screen><LoadingState label="Kişi detayı yükleniyor..." /></Screen>;
  const debtorId = numberOf(summary?.borcluUserId ?? summary?.fromUserId);
  const amount = numberOf(summary?.tutar ?? summary?.amount);
  const name = route?.params?.userName ?? summary?.userBName ?? summary?.toUserName ?? summary?.alacakliUserName ?? 'Ev arkadaşı';
  const photo = route?.params?.userPhoto;
  const iOwe = debtorId === numberOf(user?.id);
  return (
    <Screen>
      <PageHeader title="Kişi Detayı" onBack={() => navigation.goBack()} />
      <View style={styles.profileHero}><Avatar name={name} uri={photo} size={64} /><Text style={styles.profileName}>{name}</Text></View>
      <SummaryHero title={iOwe ? 'Bu kişiye borcun' : 'Bu kişiden alacağın'} value={amount} subtitle={amount ? 'Açık bakiye' : 'Hesaplar dengede'} />
      {amount > 0 && iOwe && <PrimaryButton label="Ödeme Bildir" icon="card-outline" onPress={() => navigation.navigate('OdemeEkle', { houseId, toUserId: otherId, maxAmount: amount })} />}
      {!amount && <EmptyState icon="checkmark-circle-outline" title="Hesaplar dengede" description="Bu kişiyle açık bir bakiyen bulunmuyor." />}
      <SectionHeader title="Ortak harcamalar" />
      {arrayOf(summary?.recentExpenses).map((item) => (
        <ListRow
          key={String(item.expenseId)}
          icon="receipt-outline"
          title={item.title || 'Ortak harcama'}
          subtitle={dateText(item.date)}
          amount={item.amount}
          onPress={() => navigation.navigate('HarcamaDetayi', { houseId, expenseId: item.expenseId })}
        />
      ))}
      {!arrayOf(summary?.recentExpenses).length && <Text style={styles.mutedText}>Bu kişiyle açık ortak harcama kaydı yok.</Text>}
      <SectionHeader
        title="Ortak ödeme hareketleri"
        action="Tüm Geçmiş"
        onAction={() => navigation.navigate('PaymentsScreen', { houseId })}
      />
      {payments.map((item) => {
        const sent = item.payerId === numberOf(user?.id);
        return (
          <ListRow
            key={String(item.id)}
            icon={sent ? 'arrow-up-outline' : 'arrow-down-outline'}
            title={item.note || (sent ? 'Gönderdiğin ödeme' : 'Aldığın ödeme')}
            subtitle={`${dateText(item.date)} · ${item.status === 'Approved' ? 'Onaylandı' : item.status === 'Rejected' ? 'Reddedildi' : 'Onay bekliyor'}`}
            amount={item.amount}
            amountTone={sent ? 'negative' : 'positive'}
          />
        );
      })}
      {!payments.length && <Text style={styles.mutedText}>Bu kişiyle henüz bir ödeme hareketi yok.</Text>}
    </Screen>
  );
}

export function PaymentReportScreen({ route, navigation }) {
  const { user } = useAuth();
  const houseId = useHouseId(route);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const debtData = useDebtSummary(houseId);
  const [members, setMembers] = useState([]);
  const [receiverId, setReceiverId] = useState(numberOf(route?.params?.toUserId));
  const [amount, setAmount] = useState(route?.params?.maxAmount ? formatMoneyInput(String(route.params.maxAmount)) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!houseId) return;
    houseApi.getMembers(houseId).then((response) => {
      const rows = arrayOf(unwrap(response)).map((m) => ({
        id: numberOf(m.userId ?? m.user?.id ?? m.id),
        name: m.fullName ?? m.name ?? m.user?.fullName ?? 'Ev arkadaşı',
      })).filter((m) => m.id && m.id !== numberOf(user?.id));
      setMembers(rows);
      if (!receiverId && rows[0]) setReceiverId(rows[0].id);
    }).catch(() => setMembers([]));
  }, [houseId, receiverId, user?.id]);
  const selectedDebt = debtData.debts.find((item) => item.id === receiverId);
  const numericAmount = parseMoneyInput(amount) || 0;
  const maxAmount = numberOf(route?.params?.maxAmount) || numberOf(selectedDebt?.amount);
  const selectDebt = (item) => {
    setReceiverId(item.id);
    setAmount(formatMoneyInput(String(item.amount)));
  };
  const submit = async () => {
    if (!receiverId || numericAmount <= 0) return Alert.alert('Eksik bilgi', 'Kişi ve ödeme tutarı gereklidir.');
    if (maxAmount <= 0) return Alert.alert('Açık borç yok', 'Bu kişiye bildirebileceğin açık bir borç bulunmuyor.');
    if (numericAmount > maxAmount) return Alert.alert('Tutar çok yüksek', `En fazla ${money(maxAmount)} bildirebilirsin.`);
    setSaving(true);
    try {
      await paymentsApi.create({ houseId, borcluUserId: user.id, alacakliUserId: receiverId, tutar: numericAmount, note, paymentMethod: 'Cash' });
      Alert.alert('Ödeme bildirildi', 'Karşı taraf onayladığında bakiyen güncellenecek.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Ödeme bildirilemedi', error?.response?.data?.message ?? 'Lütfen tekrar deneyin.');
    } finally { setSaving(false); }
  };
  return (
    <Screen>
      <PageHeader title="Ödeme Bildir" subtitle="Kısmi veya tam ödeme yapabilirsin" onBack={() => navigation.goBack()} />
      <View style={styles.balanceOverview}>
        <View style={styles.balanceOverviewItem}>
          <Text style={styles.balanceOverviewLabel}>Toplam borcun</Text>
          <Text style={styles.balanceOverviewDebt}>{money(debtData.totals.payable)}</Text>
        </View>
        <View style={styles.balanceOverviewItem}>
          <Text style={styles.balanceOverviewLabel}>Toplam alacağın</Text>
          <Text style={styles.balanceOverviewReceivable}>{money(debtData.totals.receivable)}</Text>
        </View>
      </View>
      {!!debtData.debts.length && (
        <>
          <SectionHeader title="Ödenecek borcu seç" />
          {debtData.debts.map((item) => (
            <ListRow
              key={String(item.id)}
              icon={item.id === receiverId ? 'checkmark-circle' : 'person-outline'}
              title={item.name}
              subtitle={item.id === receiverId ? 'Tutar alana aktarıldı; istersen azaltabilirsin' : 'Tamamını veya bir kısmını öde'}
              amount={item.amount}
              amountTone="negative"
              onPress={() => selectDebt(item)}
            />
          ))}
        </>
      )}
      {maxAmount > 0 && <SummaryHero title="Seçili açık borç" value={maxAmount} subtitle={`Ödeme sonrası kalan: ${money(Math.max(0, maxAmount - numericAmount))}`} tone="surface" />}
      <Text style={styles.fieldLabel}>Ödeme yapılacak kişi</Text>
      <View style={styles.pills}>{members.map((member) => <Pill key={String(member.id)} label={member.name} active={member.id === receiverId} onPress={() => setReceiverId(member.id)} />)}</View>
      <Text style={styles.fieldLabel}>Ödediğin tutar</Text>
      <View style={styles.amountInputWrap}><Text style={styles.currency}>₺</Text><TextInput style={styles.amountInput} value={amount} onChangeText={(value) => setAmount(formatMoneyInput(value))} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={theme.colors.text.disabled} /></View>
      {maxAmount > 0 && numericAmount !== maxAmount ? (
        <TouchableOpacity style={styles.fullPaymentButton} onPress={() => setAmount(formatMoneyInput(String(maxAmount)))}>
          <Text style={styles.fullPaymentText}>Borcun tamamını kullan: {money(maxAmount)}</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.fieldLabel}>Açıklama</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Örn. Temmuz ortak gider ödemesi" placeholderTextColor={theme.colors.text.disabled} />
      <PrimaryButton label={saving ? 'Gönderiliyor...' : 'Ödemeyi Bildir'} icon="paper-plane-outline" onPress={submit} disabled={saving || !receiverId || numericAmount <= 0 || maxAmount <= 0} />
    </Screen>
  );
}

const createStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  hero: { borderRadius: 8, padding: 20, marginTop: 12, marginBottom: 16 },
  heroLabel: { fontFamily: theme.typography.medium, fontSize: 15 },
  heroAmount: { fontFamily: theme.typography.extrabold, fontSize: 34, marginTop: 8 },
  heroSubtitle: { fontFamily: theme.typography.regular, fontSize: 14, marginTop: 6 },
  metricRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, minHeight: 116, borderRadius: 8, padding: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  metricLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 14 },
  metricValue: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 20, marginTop: 8 },
  actionGap: { gap: 10 },
  pendingLink: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary[200], backgroundColor: theme.colors.primary[50], paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingLinkText: { flex: 1, color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 },
  approvalCard: { padding: 16, borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 8, backgroundColor: theme.colors.surface, marginBottom: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  cardTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 16 },
  cardSub: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 13, marginTop: 3 },
  cardAmount: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 18 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: { flex: 1, height: 46, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[300], alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: theme.colors.text.primary, fontFamily: theme.typography.bold },
  approveButton: { flex: 1, height: 46, borderRadius: 8, backgroundColor: theme.colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  approveButtonText: { color: '#fff', fontFamily: theme.typography.bold },
  profileHero: { alignItems: 'center', paddingVertical: 18 },
  profileName: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 21, marginTop: 10 },
  mutedText: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 13, marginBottom: 10 },
  balanceOverview: { flexDirection: 'row', gap: 10, marginTop: 10 },
  balanceOverviewItem: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, padding: 14 },
  balanceOverviewLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 12 },
  balanceOverviewDebt: { color: theme.colors.error[700], fontFamily: theme.typography.bold, fontSize: 18, marginTop: 5 },
  balanceOverviewReceivable: { color: theme.colors.success[700], fontFamily: theme.typography.bold, fontSize: 18, marginTop: 5 },
  fieldLabel: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 14, marginTop: 16, marginBottom: 7 },
  input: { height: 50, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[300], backgroundColor: theme.colors.surface, color: theme.colors.text.primary, paddingHorizontal: 14, fontFamily: theme.typography.regular, fontSize: 16 },
  amountInputWrap: { height: 64, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary[300], backgroundColor: theme.colors.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  currency: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 25 },
  amountInput: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.extrabold, fontSize: 28, paddingHorizontal: 10 },
  fullPaymentButton: { minHeight: 40, justifyContent: 'center', alignItems: 'flex-end' },
  fullPaymentText: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 13 },
});
