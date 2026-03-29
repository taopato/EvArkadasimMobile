import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { houseApi, paymentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import eventBus from '../shared/events/bus';
import { useTheme } from '../shared/theme/ThemeProvider';

const PAGE_SIZE = 5;

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeStatus = (raw) => {
  const s = String(raw || '').toLowerCase();
  if (s.includes('onay') || s.includes('approve')) return 'Approved';
  if (s.includes('red') || s.includes('reject')) return 'Rejected';
  return 'Pending';
};

export default function Odemeler({ route, navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  const statusText = {
    Approved: 'Onaylandi',
    Rejected: 'Reddedildi',
    Pending: 'Bekliyor',
  };

  const renderItem = ({ item }) => {
    const statusColor =
      item.status === 'Approved' ? theme.colors.success[600]
        : item.status === 'Rejected' ? theme.colors.error[600]
          : theme.colors.warning[600];

    return (
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <Text style={styles.title}>{item.payerName} {'->'} {item.toName}</Text>
        <Text style={styles.sub}>{item.date ? new Date(item.date).toLocaleString('tr-TR') : '-'}</Text>
        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
        <Text style={styles.meta}>{item.paymentMethod}</Text>
        <Text style={[styles.amount, { color: statusColor }]}>
          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.amount)} - {statusText[item.status]}
        </Text>
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (visibleCount < filteredItems.length) {
            setVisibleCount((prev) => prev + PAGE_SIZE);
          }
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={(
          <View>
            <Text style={styles.header}>Odemeler</Text>
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
              <View>
                <Text style={styles.primaryCtaTitle}>Yeni Odeme Ekle</Text>
                <Text style={styles.primaryCtaSubtitle}>Borcu kapat veya odeme istegi gonder</Text>
              </View>
              <Text style={styles.primaryCtaArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.filterRow}>
              <Chip title="Tumu" active={filterMode === 'all'} onPress={() => setFilterMode('all')} />
              <Chip title="Ben odedim" active={filterMode === 'sent'} onPress={() => setFilterMode('sent')} />
              <Chip title="Bana odendi" active={filterMode === 'received'} onPress={() => setFilterMode('received')} />
            </View>
            <View style={styles.filterRow}>
              <Chip title="Hepsi" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
              <Chip title="Bekleyen" active={statusFilter === 'Pending'} onPress={() => setStatusFilter('Pending')} />
              <Chip title="Onayli" active={statusFilter === 'Approved'} onPress={() => setStatusFilter('Approved')} />
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Odeme kaydi yok.</Text> : null}
        ListFooterComponent={visibleCount < filteredItems.length ? <Text style={styles.more}>Daha fazla yuklemek icin asagi kaydir</Text> : <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 20 },
  header: { fontSize: 22, fontWeight: '900', color: theme.colors.text.primary, marginBottom: 12 },
  primaryCta: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  primaryCtaTitle: { color: theme.colors.text.onPrimary, fontSize: 18, fontWeight: '900' },
  primaryCtaSubtitle: { marginTop: 4, color: theme.colors.text.onPrimary, opacity: 0.9 },
  primaryCtaArrow: { color: theme.colors.text.onPrimary, fontSize: 28, fontWeight: '900' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.neutral[100],
  },
  chipActive: { backgroundColor: theme.colors.primary[600] },
  chipText: { color: theme.colors.text.primary, fontWeight: '700' },
  chipTextActive: { color: theme.colors.text.onPrimary },
  card: {
    borderLeftWidth: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  title: { fontWeight: '900', color: theme.colors.text.primary },
  sub: { color: theme.colors.text.secondary, marginTop: 4 },
  note: { color: theme.colors.text.primary, marginTop: 8 },
  meta: { color: theme.colors.text.secondary, marginTop: 6 },
  amount: { fontWeight: '900', marginTop: 8 },
  empty: { textAlign: 'center', padding: 24, color: theme.colors.text.secondary },
  more: { textAlign: 'center', paddingVertical: 12, color: theme.colors.text.secondary },
});
