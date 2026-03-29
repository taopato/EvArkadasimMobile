// Planlı Ödemeler (Faturalar) — "bu ay ödenecekler" görünümü
// Bu ayki düzenli/taksitli faturaların "gününe gelmiş" olan tek kopyasını gösterir

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { expensesApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { normalizeExpense } from '../utils/expenseClassifier';
import {
  getUTCMonthWindow,
  formatCurrency,
  formatDate,
  getItemDate,
  getItemNote,
  getPlanType,
  isChildExpense,
  isParentExpense,
  isUtilityKey,
  deduplicateMonthlyPlans,
  filterCurrentMonthPast,
  sortByDateDesc,
  getStatusBadges,
  getUtilityMeta,
  calculateTotals
} from '../utils/expenseHelpers';

const PlanliOdemelerScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { houseId: routeHouseId } = route.params || {};
  const houseId = routeHouseId || user?.defaultHouseId;
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Kategori filtreleri
  const categories = [
    { key: 'all', label: 'Hepsi', icon: '📋' },
    { key: 'Rent', label: 'Kira', icon: '🏠' },
    { key: 'Internet', label: 'İnternet', icon: '🌐' },
    { key: 'Electricity', label: 'Elektrik', icon: '⚡' },
    { key: 'Water', label: 'Su', icon: '💧' },
    { key: 'Gas', label: 'Doğalgaz', icon: '🔥' },
    { key: 'Other', label: 'Diğer', icon: '📄' }
  ];

  // Durum filtreleri
  const statusFilters = [
    { key: 'all', label: 'Hepsi' },
    { key: 'unpaid', label: 'Ödenmeyen' },
    { key: 'paid', label: 'Ödenen' },
    { key: 'overdue', label: 'Gecikmiş' }
  ];

  // Veri yükleme
  const loadData = async () => {
    if (!houseId) return;
    
    setLoading(true);
    try {
      const res = await expensesApi.getByHouse(houseId);
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data) ? data.map(normalizeExpense) : [];

      // Filtreleme: Sadece utility (fatura) türleri
      const utilityItems = list.filter(item => isUtilityKey(item.key));

      // Deduplikasyon: Ayda plan başına tek çocuk
      const deduplicated = deduplicateMonthlyPlans(utilityItems);

      // Bu ay + bugün/öncesi filtresi
      const currentMonthItems = filterCurrentMonthPast(deduplicated);

      // Sıralama
      const sorted = sortByDateDesc(currentMonthItems);

      setItems(sorted);
    } catch (error) {
      console.error('❌ Planlı ödemeler yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [houseId]);

  // Filtrelenmiş veriler
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Kategori filtresi
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.key === selectedCategory);
    }

    // Durum filtresi
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => {
        const raw = item._raw || {};
        const date = getItemDate(item);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const isPaid = raw.isPaid ?? raw.IsPaid ?? raw.status === 'paid' ?? raw.Status === 'Paid';
        const isOverdue = itemDate < today;
        
        switch (selectedStatus) {
          case 'unpaid':
            return !isPaid;
          case 'paid':
            return isPaid;
          case 'overdue':
            return isOverdue && !isPaid;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [items, selectedCategory, selectedStatus]);

  // Özet hesaplamaları
  const summary = useMemo(() => {
    const { total, count } = calculateTotals(filteredItems);
    const paidCount = filteredItems.filter(item => {
      const raw = item._raw || {};
      return raw.isPaid ?? raw.IsPaid ?? raw.status === 'paid' ?? raw.Status === 'Paid';
    }).length;
    const unpaidCount = count - paidCount;

    return { total, count, paidCount, unpaidCount };
  }, [filteredItems]);

  // Kart render
  const renderItem = ({ item }) => {
    const meta = getUtilityMeta(item.key);
    const badges = getStatusBadges(item);
    const note = getItemNote(item);
    const date = getItemDate(item);

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: meta.color }]}
        onPress={() => navigation.navigate('HarcamaDetayi', { 
          expenseId: item.id, 
          houseId 
        })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.cardIcon}>{meta.icon}</Text>
            <Text style={styles.cardTitleText}>{meta.label}</Text>
          </View>
          <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.cardDate}>{formatDate(date)}</Text>
          {note !== '—' && (
            <Text style={styles.cardNote} numberOfLines={1}>
              {note}
            </Text>
          )}
        </View>

        {badges.length > 0 && (
          <View style={styles.badgesContainer}>
            {badges.map((badge, index) => (
              <View
                key={index}
                style={[
                  styles.badge,
                  { backgroundColor: getBadgeColor(badge.type) }
                ]}
              >
                <Text style={styles.badgeText}>{badge.text}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Badge rengi
  const getBadgeColor = (type) => {
    switch (type) {
      case 'error': return theme.colors.error[100];
      case 'warning': return theme.colors.warning[100];
      case 'success': return theme.colors.success[100];
      case 'info': return theme.colors.primary?.[100] ?? theme.colors.neutral[100];
      default: return theme.colors.neutral[100];
    }
  };

  // Kategori filtresi render
  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
    >
      {categories.map(category => (
        <TouchableOpacity
          key={category.key}
          style={[
            styles.filterChip,
            selectedCategory === category.key && styles.filterChipActive
          ]}
          onPress={() => setSelectedCategory(category.key)}
        >
          <Text style={styles.filterChipIcon}>{category.icon}</Text>
          <Text style={[
            styles.filterChipText,
            selectedCategory === category.key && styles.filterChipTextActive
          ]}>
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Durum filtresi render
  const renderStatusFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
    >
      {statusFilters.map(status => (
        <TouchableOpacity
          key={status.key}
          style={[
            styles.filterChip,
            selectedStatus === status.key && styles.filterChipActive
          ]}
          onPress={() => setSelectedStatus(status.key)}
        >
          <Text style={[
            styles.filterChipText,
            selectedStatus === status.key && styles.filterChipTextActive
          ]}>
            {status.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Özet kutuları render
  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Bu Ay Toplam</Text>
        <Text style={styles.summaryValue}>{formatCurrency(summary.total)}</Text>
        <Text style={styles.summaryCount}>{summary.count} kalem</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Ödenen</Text>
        <Text style={[styles.summaryValue, { color: theme.colors.success[600] }]}>
          {summary.paidCount}
        </Text>
        <Text style={styles.summaryCount}>kalem</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Ödenmeyen</Text>
        <Text style={[styles.summaryValue, { color: theme.colors.warning[600] }]}>
          {summary.unpaidCount}
        </Text>
        <Text style={styles.summaryCount}>kalem</Text>
      </View>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Planlı ödemeler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Özet Kutuları */}
      {renderSummary()}

      {/* Filtreler */}
      <View style={styles.filtersSection}>
        <Text style={styles.filterTitle}>Kategoriler</Text>
        {renderCategoryFilter()}
        
        <Text style={styles.filterTitle}>Durum</Text>
        {renderStatusFilter()}
      </View>

      {/* Liste */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            colors={[theme.colors.primary[500]]}
          />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Planlı ödeme bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Bu ay için ödenecek planlı gider bulunmuyor
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.text.secondary },
  
  // Özet Kutuları
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  summaryCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neutral[200] },
  summaryLabel: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 2 },
  summaryCount: { fontSize: 11, color: theme.colors.text.secondary },

  // Filtreler
  filtersSection: { backgroundColor: theme.colors.background, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
  filterTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 8, marginHorizontal: 16 },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.neutral[300], marginRight: 8, backgroundColor: theme.colors.background },
  filterChipActive: { backgroundColor: theme.colors.primary[100], borderColor: theme.colors.primary[500] },
  filterChipIcon: {
    fontSize: 14,
    marginRight: 4
  },
  filterChipText: { fontSize: 12, color: theme.colors.text.primary },
  filterChipTextActive: { color: theme.colors.primary[700], fontWeight: '600' },

  // Liste
  listContainer: {
    padding: 16
  },
  card: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8
  },
  cardTitleText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
  cardDetails: {
    marginBottom: 8
  },
  cardDate: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 4 },
  cardNote: { fontSize: 13, color: theme.colors.text.secondary, fontStyle: 'italic' },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.text.primary },

  // Boş Durum
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 20 },
});

export default PlanliOdemelerScreen;
