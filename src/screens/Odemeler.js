import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { houseApi, paymentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import eventBus from '../shared/events/bus';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';
import BrandMark from '../components/BrandMark';

const PAGE_SIZE = 8;

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeStatus = (raw) => {
  const s = String(raw || '').toLowerCase();
  if (s.includes('onay') || s.includes('approve')) return 'Approved';
  if (s.includes('red') || s.includes('reject')) return 'Rejected';
  return 'Pending';
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount || 0));

export default function Odemeler({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const houseId = route?.params?.houseId || user?.defaultHouseId;

  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [filterMode, setFilterMode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      let list = [];
      if (houseId) {
        const res = await paymentsApi.getByHouse(houseId);
        const raw = res?.data;
        list = raw?.data ?? raw?.items ?? raw?.payments ?? raw ?? [];
      } else if (user?.id) {
        const housesRes = await houseApi.getUserHouses(user.id);
        const houses = asArray(housesRes?.data);
        const all = [];
        for (const house of houses) {
          try {
            const res = await paymentsApi.getByHouse(house.id);
            const raw = res?.data;
            all.push(...asArray(raw?.data ?? raw?.items ?? raw?.payments ?? raw));
          } catch {
            // no-op
          }
        }
        list = all;
      }

      const normalized = asArray(list).map((item) => {
        const status = normalizeStatus(item.onayDurumu ?? item.Durum ?? item.status);
        const amount = Number(item.tutar ?? item.Tutar ?? item.amount ?? 0);
        const date = item.odemeTarihi || item.OdemeTarihi || item.date || item.createdAt || item.updatedAt;
        const payerId = item.borcluUserId || item.BorcluUserId || item.payerUserId || item.fromUserId;
        const toId = item.alacakliUserId || item.AlacakliUserId || item.toUserId;
        return {
          id: item.id ?? item.paymentId,
          status,
          amount,
          date,
          payerId,
          toId,
          payerName: item.borcluUserName || item.BorcluUserName || item.payerName || item.fromUser?.fullName || 'Bilinmeyen',
          toName: item.alacakliUserName || item.AlacakliUserName || item.toUserName || item.toUser?.fullName || 'Bilinmeyen',
          note: item.aciklama || item.Aciklama || item.note || '',
          paymentMethod: item.paymentMethod || item.PaymentMethod || 'Cash',
        };
      }).filter((item) => Number(item.payerId) === Number(user?.id) || Number(item.toId) === Number(user?.id));

      normalized.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setVisibleCount(PAGE_SIZE);
      setAllItems(normalized);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [houseId]);

  useEffect(() => {
    const off = eventBus.on('payments:updated', load);
    return () => off?.();
  }, [houseId]);

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (filterMode === 'sent') {
      items = items.filter((x) => Number(x.payerId) === Number(user?.id));
    } else if (filterMode === 'received') {
      items = items.filter((x) => Number(x.toId) === Number(user?.id));
    }

    if (statusFilter !== 'all') {
      items = items.filter((x) => x.status === statusFilter);
    }

    return items;
  }, [allItems, filterMode, statusFilter, user?.id]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let sent = 0;
    let received = 0;
    allItems.forEach((item) => {
      const d = item.date ? new Date(item.date) : null;
      if (!d || d < monthStart) return;
      if (Number(item.payerId) === Number(user?.id)) sent += item.amount;
      if (Number(item.toId) === Number(user?.id)) received += item.amount;
    });
    return { sent, received };
  }, [allItems, user?.id]);

  const STATUS_META = {
    Approved: { label: 'Onaylandı', color: theme.colors.success[700], bg: theme.colors.success[50], icon: 'checkmark-circle' },
    Rejected: { label: 'Reddedildi', color: theme.colors.error[700], bg: theme.colors.error[50], icon: 'close-circle' },
    Pending: { label: 'Bekliyor', color: theme.colors.warning[700], bg: theme.colors.warning[50], icon: 'time' },
  };

  const renderItem = ({ item }) => {
    const isSent = Number(item.payerId) === Number(user?.id);
    const statusMeta = STATUS_META[item.status];

    return (
      <View style={styles.card}>
        <View style={[styles.cardIconWrap, { backgroundColor: isSent ? theme.colors.error[50] : theme.colors.success[50] }]}>
          <Ionicons
            name={isSent ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={24}
            color={isSent ? theme.colors.error[600] : theme.colors.success[600]}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {isSent ? `${item.toName} kişisine` : `${item.payerName} kişisinden`}
          </Text>
          <Text style={styles.cardSub}>
            {item.date ? new Date(item.date).toLocaleDateString('tr-TR') : '-'}
            {item.note ? ` • ${item.note}` : ''}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: isSent ? theme.colors.error[700] : theme.colors.success[700] }]}>
            {isSent ? '-' : '+'}{formatCurrency(item.amount)}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={12} color={statusMeta.color} />
            <Text style={[styles.statusChipText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  const Chip = ({ active, title, onPress }) => (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary[500]} />}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (visibleCount < filteredItems.length) {
            setVisibleCount((prev) => prev + PAGE_SIZE);
          }
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={(
          <View>
            <Text style={styles.header}>Ödemeler</Text>
            <Text style={styles.subtitle}>Gönderilen, alınan ve onay bekleyen ödemeler</Text>

            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>BU AY</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroCol}>
                  <Text style={styles.heroLabel}>Gönderdiğin</Text>
                  <Text style={styles.heroValue}>{formatCurrency(monthTotals.sent)}</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroCol}>
                  <Text style={styles.heroLabel}>Aldığın</Text>
                  <Text style={styles.heroValue}>{formatCurrency(monthTotals.received)}</Text>
                </View>
              </View>
              <BrandMark variant="logo" size={110} subtle style={styles.heroWatermark} />
            </View>

            <TouchableOpacity
              style={styles.primaryCta}
              activeOpacity={0.9}
              onPress={() => {
                if (houseId) {
                  navigation.navigate('OdemeEkle', { houseId, houseName: user?.defaultHouseName || 'Aktif Ev' });
                } else {
                  navigation.navigate('GrupListesi', { redirectTo: 'OdemeEkle' });
                }
              }}
            >
              <View style={styles.primaryCtaIconWrap}>
                <Ionicons name="add" size={22} color={theme.colors.text.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.primaryCtaTitle}>Yeni Ödeme Ekle</Text>
                <Text style={styles.primaryCtaSubtitle}>Borcu kapat veya ödeme isteği gönder</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.onPrimary} />
            </TouchableOpacity>

            <View style={styles.filterRow}>
              <Chip title="Tümü" active={filterMode === 'all'} onPress={() => setFilterMode('all')} />
              <Chip title="Ben ödedim" active={filterMode === 'sent'} onPress={() => setFilterMode('sent')} />
              <Chip title="Bana ödendi" active={filterMode === 'received'} onPress={() => setFilterMode('received')} />
            </View>
            <View style={styles.filterRow}>
              <Chip title="Hepsi" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
              <Chip title="Bekleyen" active={statusFilter === 'Pending'} onPress={() => setStatusFilter('Pending')} />
              <Chip title="Onaylı" active={statusFilter === 'Approved'} onPress={() => setStatusFilter('Approved')} />
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="card-outline" size={30} color={theme.colors.primary[600]} />
            </View>
            <Text style={styles.emptyTitle}>Henüz ödeme kaydı yok</Text>
            <Text style={styles.emptyDesc}>Bir ödeme gönderdiğinde ya da aldığında burada listelenir.</Text>
          </View>
        ) : null}
        ListFooterComponent={visibleCount < filteredItems.length ? <Text style={styles.more}>Daha fazla yüklemek için aşağı kaydır</Text> : <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingTop: insets.top + 16, paddingBottom: 32 },
  header: { fontSize: 26, fontWeight: '900', color: theme.colors.text.primary, marginBottom: 4 },
  subtitle: { color: theme.colors.text.secondary, fontSize: 14, marginBottom: 18 },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    backgroundColor: theme.colors.primary[900],
    overflow: 'hidden',
    ...shadow(3, 'rgba(23,40,57,0.22)'),
  },
  heroEyebrow: {
    color: theme.colors.primary[200],
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroCol: { flex: 1 },
  heroDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 6, fontWeight: '700' },
  heroValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroWatermark: { position: 'absolute', right: -20, bottom: -20, opacity: 0.12 },
  primaryCta: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    ...shadow(2, 'rgba(23,40,57,0.18)'),
  },
  primaryCtaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaTitle: { color: theme.colors.text.onPrimary, fontSize: 16, fontWeight: '800' },
  primaryCtaSubtitle: { marginTop: 2, color: theme.colors.text.onPrimary, opacity: 0.9, fontSize: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  chipActive: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
  chipText: { color: theme.colors.text.primary, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: theme.colors.text.onPrimary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, paddingRight: 8 },
  cardTitle: { fontWeight: '800', color: theme.colors.text.primary, fontSize: 14 },
  cardSub: { color: theme.colors.text.secondary, marginTop: 3, fontSize: 12 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontWeight: '900', fontSize: 15, marginBottom: 6 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusChipText: { fontSize: 11, fontWeight: '800' },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 19 },
  more: { textAlign: 'center', paddingVertical: 12, color: theme.colors.text.secondary },
});
