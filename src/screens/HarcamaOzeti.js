import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import useRoomoraDashboard from '../hooks/useRoomoraDashboard';
import { getCategoryDisplayName, getCategoryIconName } from '../constants/ExpenseEnums';
import { useTheme } from '../shared/theme/ThemeProvider';
import {
  EmptyState,
  ListRow,
  LoadingState,
  PageHeader,
  Pill,
  SectionHeader,
  money,
} from '../shared/ui/roomora/CanonicalUI';

const periods = [
  { key: 'month', label: 'Bu ay' },
  { key: 'three', label: 'Son 3 ay' },
  { key: 'all', label: 'Tümü' },
];

export default function HarcamaOzeti({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const data = useRoomoraDashboard(user);
  const [period, setPeriod] = useState('month');

  const filtered = useMemo(() => {
    const now = new Date();
    const start = period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : period === 'three'
        ? new Date(now.getFullYear(), now.getMonth() - 2, 1)
        : null;
    return data.expenses.filter((item) => !start || new Date(item.date || item.createdAt || 0) >= start);
  }, [data.expenses, period]);

  const breakdown = useMemo(() => {
    const map = new Map();
    filtered.forEach((item) => {
      const key = item.key || 'Other';
      const current = map.get(key) || { key, amount: 0, count: 0 };
      current.amount += Number(item.amount || 0);
      current.count += 1;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [filtered]);
  const total = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={theme.colors.primary[600]} />}
      >
        <PageHeader title="Harcama Özeti" subtitle={data.houseName} onBack={() => navigation.goBack()} />
        <View style={styles.pills}>
          {periods.map((item) => <Pill key={item.key} label={item.label} active={period === item.key} onPress={() => setPeriod(item.key)} />)}
        </View>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Toplam harcama</Text>
          <Text style={styles.heroValue}>{money(total)}</Text>
          <Text style={styles.heroMeta}>{filtered.length} işlem</Text>
        </View>
        <SectionHeader title="Kategoriler" />
        {data.loading ? <LoadingState label="Özet hazırlanıyor..." /> : breakdown.map((item) => (
          <ListRow
            key={item.key}
            icon={getCategoryIconName(item.key)}
            title={getCategoryDisplayName(item.key)}
            subtitle={`${item.count} işlem · toplamın %${total ? Math.round(item.amount * 100 / total) : 0}'i`}
            amount={item.amount}
          />
        ))}
        {!data.loading && !breakdown.length && <EmptyState icon="pie-chart-outline" title="Özetlenecek harcama yok" description="Seçilen dönemde kayıtlı bir harcama bulunmuyor." />}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  hero: { borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], padding: 22, alignItems: 'center' },
  heroLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 14 },
  heroValue: { color: theme.colors.text.primary, fontFamily: theme.typography.extrabold, fontSize: 32, marginTop: 8 },
  heroMeta: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 13, marginTop: 7 },
});
