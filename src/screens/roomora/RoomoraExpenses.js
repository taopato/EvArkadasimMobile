import React, { useMemo, useState } from 'react';
import {
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
import { useTheme } from '../../shared/theme/ThemeProvider';
import useRoomoraDashboard from '../../hooks/useRoomoraDashboard';
import {
  EmptyState,
  ListRow,
  LoadingState,
  PageHeader,
  Pill,
  PrimaryButton,
  SectionHeader,
  money,
} from '../../shared/ui/roomora/CanonicalUI';
import { getCategoryIconName } from '../../constants/ExpenseEnums';
import { getExpenseDisplayTitle, getItemDate } from '../../utils/expenseHelpers';

const filters = [
  { key: 'all', label: 'Tümü' },
  { key: 'Market', label: 'Market' },
  { key: 'bill', label: 'Faturalar' },
  { key: 'Rent', label: 'Kira' },
];

export default function RoomoraExpenses({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useRoomoraDashboard(user);
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const items = useMemo(() => data.expenses.filter((item) => {
    const matchesFilter = filter === 'all'
      || item.key === filter
      || (filter === 'bill' && item.kind === 'bill');
    const date = getItemDate(item);
    const now = new Date();
    const matchesPeriod = period === 'all'
      || (period === 'month'
        && date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth())
      || (period === '30days' && date >= new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)));
    const haystack = `${getExpenseDisplayTitle(item)} ${item.payerName || ''}`.toLocaleLowerCase('tr-TR');
    return matchesFilter
      && matchesPeriod
      && haystack.includes(search.trim().toLocaleLowerCase('tr-TR'));
  }), [data.expenses, filter, period, search]);
  const visibleItems = items.slice(0, visibleCount);

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const openCreate = () => {
    if (!data.houseId) {
      navigation.navigate('GrupListesi', { redirectTo: 'HarcamaEkle' });
      return;
    }
    navigation.navigate('HarcamaEkle', { houseId: data.houseId, houseName: data.houseName });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Giderler" subtitle={data.houseName} />

        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={theme.colors.text.secondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Harcamalarda ara"
            placeholderTextColor={theme.colors.neutral[400]}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filters.map((item) => (
            <Pill
              key={item.key}
              label={item.label}
              active={filter === item.key}
              onPress={() => setFilter(item.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.periodRow}>
          <Pill label="Bu Ay" active={period === 'month'} onPress={() => { setPeriod('month'); setVisibleCount(10); }} />
          <Pill label="Son 30 Gün" active={period === '30days'} onPress={() => { setPeriod('30days'); setVisibleCount(10); }} />
          <Pill label="Tüm Zamanlar" active={period === 'all'} onPress={() => { setPeriod('all'); setVisibleCount(10); }} />
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Bu ay görüntülenen gider</Text>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalValue}>{money(total)}</Text>
              <Text style={styles.totalSub}>{items.length} işlem</Text>
            </View>
            <View style={styles.totalIcon}>
              <Ionicons name="wallet-outline" size={28} color={theme.colors.primary[700]} />
            </View>
          </View>
        </View>

        <PrimaryButton label="Yeni Harcama Ekle" icon="add" onPress={openCreate} />
        <SectionHeader
          title="Harcama Geçmişi"
          action={items.length > visibleCount ? 'Daha Fazla' : undefined}
          onAction={() => setVisibleCount((count) => count + 10)}
        />

        {data.loading ? (
          <LoadingState label="Giderler yükleniyor..." />
        ) : items.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title={search || filter !== 'all' ? 'Eşleşen harcama yok' : 'Henüz gider yok'}
            description="İlk ortak harcamayı eklediğinde burada görünecek."
            action="Harcama Ekle"
            onAction={openCreate}
          />
        ) : visibleItems.map((item) => (
          <ListRow
            key={String(item.id)}
            icon={getCategoryIconName(item.key)}
            title={getExpenseDisplayTitle(item)}
            subtitle={`${getItemDate(item).toLocaleDateString('tr-TR')}${item.payerName ? ` · ${item.payerName} ödedi` : ''}`}
            amount={item.amount}
            onPress={() => navigation.navigate('HarcamaDetayi', {
              expenseId: item.id,
              houseId: data.houseId,
              houseName: data.houseName,
            })}
          />
        ))}
        {items.length > 10 && items.length <= visibleCount ? (
          <TouchableOpacity style={styles.collapseButton} onPress={() => setVisibleCount(10)}>
            <Text style={styles.collapseText}>İlk 10 kaydı göster</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 32 },
  search: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.regular,
    fontSize: 15,
    outlineStyle: 'none',
  },
  filters: { gap: 8, paddingVertical: 14 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  collapseButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  collapseText: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 13 },
  totalCard: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    marginBottom: 12,
  },
  totalLabel: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.medium,
    fontSize: 13,
    padding: 0,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  totalValue: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.extrabold,
    fontSize: 28,
    padding: 0,
  },
  totalSub: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    padding: 0,
    marginTop: 3,
  },
  totalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
