import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { BILL_KEYS } from '../../utils/expenseClassifier';
import { getCategoryIconName } from '../../constants/ExpenseEnums';
import { getExpenseDisplayTitle, getItemDate } from '../../utils/expenseHelpers';

export default function RoomoraBills({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useRoomoraDashboard(user);
  const [filter, setFilter] = useState('all');
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const bills = useMemo(() => data.expenses
    .filter((item) => BILL_KEYS.includes(item.key))
    .filter((item) => filter === 'all' || item.key === filter), [data.expenses, filter]);
  const total = bills.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const openCreate = () => {
    if (!data.houseId) {
      navigation.navigate('GrupListesi', { redirectTo: 'FaturaEkle' });
      return;
    }
    navigation.navigate('FaturaEkle', { houseId: data.houseId, houseName: data.houseName });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Faturalar" subtitle={data.houseName} />

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>TOPLAM FATURA</Text>
          <Text style={styles.summaryValue}>₺{Number(total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={styles.summaryStats}>
            <View>
              <Text style={styles.statLabel}>Aktif</Text>
              <Text style={styles.statValue}>{bills.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statLabel}>Planlı gider</Text>
              <Text style={styles.statValue}>{data.scheduled.length}</Text>
            </View>
          </View>
        </View>

        <PrimaryButton label="Yeni Fatura Ekle" icon="add" onPress={openCreate} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Pill label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Pill label="Elektrik" active={filter === 'Electricity'} onPress={() => setFilter('Electricity')} />
          <Pill label="Su" active={filter === 'Water'} onPress={() => setFilter('Water')} />
          <Pill label="İnternet" active={filter === 'Internet'} onPress={() => setFilter('Internet')} />
          <Pill label="Kira" active={filter === 'Rent'} onPress={() => setFilter('Rent')} />
        </ScrollView>

        {!!data.scheduled.length && (
          <>
            <SectionHeader
              title="Planlı Ödemeler"
              action="Düzenle"
              onAction={() => navigation.navigate('DuzenliGiderEkle', {
                houseId: data.houseId,
                houseName: data.houseName,
              })}
            />
            {data.scheduled.slice(0, 2).map((plan, index) => (
              <ListRow
                key={String(plan.id ?? index)}
                icon="calendar-outline"
                title={plan.name || plan.title || plan.description || 'Düzenli gider'}
                subtitle={`Her ay ${plan.dueDay || plan.collectionStartDay || '-'} tarihinde`}
                amount={plan.amount || plan.fixedAmount}
                badge="PLANLI"
                badgeTone="info"
              />
            ))}
          </>
        )}

        <SectionHeader title="Güncel Faturalar" />
        {data.loading ? (
          <LoadingState label="Faturalar yükleniyor..." />
        ) : bills.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Henüz fatura yok"
            description="Elektrik, su, internet veya kira kaydını buradan ekleyebilirsin."
            action="Fatura Ekle"
            onAction={openCreate}
          />
        ) : bills.map((item) => (
          <ListRow
            key={String(item.id)}
            icon={getCategoryIconName(item.key)}
            title={getExpenseDisplayTitle(item)}
            subtitle={`Tarih: ${getItemDate(item).toLocaleDateString('tr-TR')}`}
            amount={item.amount}
            badge="BEKLİYOR"
            badgeTone="warning"
            onPress={() => navigation.navigate('BillDetail', {
              billId: item.id,
              houseId: data.houseId,
              houseName: data.houseName,
            })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 32 },
  summary: {
    borderRadius: 8,
    backgroundColor: theme.colors.primary[900],
    padding: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#d8e0e8',
    fontFamily: theme.typography.semibold,
    fontSize: 13,
  },
  summaryValue: {
    color: '#fff',
    fontFamily: theme.typography.extrabold,
    fontSize: 34,
    marginTop: 8,
  },
  summaryStats: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 18 },
  statLabel: { color: '#d8e0e8', fontFamily: theme.typography.regular, fontSize: 12 },
  statValue: { color: '#fff', fontFamily: theme.typography.bold, fontSize: 18, marginTop: 2 },
  statDivider: { width: 1, height: 35, backgroundColor: '#496176' },
  filters: { gap: 8, paddingVertical: 14 },
});
