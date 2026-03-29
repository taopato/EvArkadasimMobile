// Harcama Listesi — "tam hareket dökümü"
// Evdeki tüm harcama satırlarını (düzenli/taksitli çocuklar + düzensiz tekil kalemler) tarih akışında gösterir

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
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { expensesApi, houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { normalizeExpense } from '../utils/expenseClassifier';
import { getCategoryDisplayName, getCategoryIcon, getCategoryColor } from '../constants/ExpenseEnums';
import {
  getUTCMonthWindow,
  formatCurrency,
  formatDate,
  getItemDate,
  getItemNote,
  getPlanType,
  isChildExpense,
  isParentExpense,
  deduplicateMonthlyPlans,
  sortByDateDesc,
  calculateTotals
} from '../utils/expenseHelpers';

const HarcamaListesiScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { houseId: routeHouseId } = route.params || {};
  const houseId = routeHouseId || user?.defaultHouseId;
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersMap, setMembersMap] = useState({});

  // Filtreler
  const [selectedPeriod, setSelectedPeriod] = useState('current'); // current, last3, last6, year, custom
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPayer, setSelectedPayer] = useState('all');
  const [selectedPlanType, setSelectedPlanType] = useState('all'); // all, recurring, installment, irregular
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dönem seçenekleri
  const periodOptions = [
    { key: 'current', label: 'Bu Ay' },
    { key: 'last3', label: 'Son 3 Ay' },
    { key: 'last6', label: 'Son 6 Ay' },
    { key: 'year', label: 'Bu Yıl' },
    { key: 'all', label: 'Tümü' }
  ];

  // Plan türü seçenekleri
  const planTypeOptions = [
    { key: 'all', label: 'Hepsi' },
    { key: 'recurring', label: 'Düzenli' },
    { key: 'installment', label: 'Taksitli' },
    { key: 'irregular', label: 'Düzensiz' }
  ];

  // Veri yükleme
  const loadData = async () => {
    if (!houseId) return;
    
    setLoading(true);
    try {
      // Harcamalar
      const res = await expensesApi.getByHouse(houseId);
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data) ? data.map(normalizeExpense) : [];

      // Deduplikasyon: Ayda plan başına tek çocuk
      const deduplicated = deduplicateMonthlyPlans(list);

      // Sıralama
      const sorted = sortByDateDesc(deduplicated);

      setItems(sorted);

      // Üyeler
      const membersRes = await houseApi.getMembers(houseId);
      const membersData = membersRes?.data?.data ?? membersRes?.data ?? [];
      const membersList = Array.isArray(membersData) ? membersData : [];
      
      setMembers(membersList);
      
      // Üye map'i oluştur
      const map = {};
      membersList.forEach(member => {
        map[member.userId ?? member.UserId] = member.fullName ?? member.FullName ?? 'Bilinmeyen';
      });
      setMembersMap(map);

    } catch (error) {
      console.error('❌ Harcama listesi yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [houseId]);

  // Dönem filtresi
  const getDateRange = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'current':
        return getUTCMonthWindow(now);
      case 'last3':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { monthStart: threeMonthsAgo, monthEnd: now };
      case 'last6':
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return { monthStart: sixMonthsAgo, monthEnd: now };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
        return { monthStart: yearStart, monthEnd: yearEnd };
      default:
        return null; // Tümü
    }
  };

  // Filtrelenmiş veriler
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Dönem filtresi
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter(item => {
        const date = getItemDate(item);
        return date >= dateRange.monthStart && date < dateRange.monthEnd;
      });
    }

    // Kategori filtresi
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.key === selectedCategory);
    }

    // Ödeyen filtresi
    if (selectedPayer !== 'all') {
      const raw = filtered[0]?._raw || {};
      filtered = filtered.filter(item => {
        const raw = item._raw || {};
        const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
        return String(payerId) === String(selectedPayer);
      });
    }

    // Plan türü filtresi
    if (selectedPlanType !== 'all') {
      filtered = filtered.filter(item => getPlanType(item) === selectedPlanType);
    }

    // Arama filtresi
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const title = getCategoryDisplayName(item.key).toLowerCase();
        const note = getItemNote(item).toLowerCase();
        return title.includes(search) || note.includes(search);
      });
    }

    return filtered;
  }, [items, selectedPeriod, selectedCategory, selectedPayer, selectedPlanType, searchText]);

  // Özet hesaplamaları
  const summary = useMemo(() => {
    const { total, count } = calculateTotals(filteredItems);
    
    // Kullanıcı bazlı hesaplamalar
    const userExpenses = filteredItems.filter(item => {
      const raw = item._raw || {};
      const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
      return String(payerId) === String(user?.id);
    });
    const userTotal = calculateTotals(userExpenses).total;

    return { total, count, userTotal };
  }, [filteredItems, user?.id]);

  // Kart render
  const renderItem = ({ item }) => {
    const raw = item._raw || {};
    const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
    const payerName = membersMap[payerId] || `Kullanıcı ${payerId}`;
    const date = getItemDate(item);
    const note = getItemNote(item);
    const planType = getPlanType(item);
    const icon = getCategoryIcon(item.key);
    const color = getCategoryColor(item.key);

    // Plan etiketi
    const getPlanLabel = () => {
      if (planType === 'installment') {
        const installmentNumber = raw.installmentNumber ?? raw.InstallmentNumber ?? 0;
        const installmentCount = raw.installmentCount ?? raw.InstallmentCount ?? 0;
        return `Taksit ${installmentNumber}/${installmentCount}`;
      }
      if (planType === 'recurring') return 'Düzenli';
      return 'Düzensiz';
    };

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: color }]}
        onPress={() => navigation.navigate('HarcamaDetayi', { 
          expenseId: item.id, 
          houseId 
        })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.cardIcon}>{icon}</Text>
            <View style={styles.cardTitleText}>
              <Text style={styles.cardTitleMain}>{getCategoryDisplayName(item.key)}</Text>
              <Text style={styles.cardSubtitle}>
                {formatDate(date)} • Ödeyen: {payerName}
              </Text>
            </View>
          </View>
          <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
        </View>

        {note !== '—' && (
          <Text style={styles.cardNote} numberOfLines={2}>
            {note}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={[styles.planBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.planBadgeText, { color }]}>
              {getPlanLabel()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filtre modal render
  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filtreler</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Text style={styles.modalClose}>Kapat</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Dönem */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Dönem</Text>
            {periodOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  selectedPeriod === option.key && styles.filterOptionActive
                ]}
                onPress={() => setSelectedPeriod(option.key)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPeriod === option.key && styles.filterOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Plan Türü */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Plan Türü</Text>
            {planTypeOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  selectedPlanType === option.key && styles.filterOptionActive
                ]}
                onPress={() => setSelectedPlanType(option.key)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPlanType === option.key && styles.filterOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ödeyen */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Ödeyen</Text>
            <TouchableOpacity
              style={[
                styles.filterOption,
                selectedPayer === 'all' && styles.filterOptionActive
              ]}
              onPress={() => setSelectedPayer('all')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedPayer === 'all' && styles.filterOptionTextActive
              ]}>
                Hepsi
              </Text>
            </TouchableOpacity>
            {members.map(member => (
              <TouchableOpacity
                key={member.userId ?? member.UserId}
                style={[
                  styles.filterOption,
                  selectedPayer === String(member.userId ?? member.UserId) && styles.filterOptionActive
                ]}
                onPress={() => setSelectedPayer(String(member.userId ?? member.UserId))}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPayer === String(member.userId ?? member.UserId) && styles.filterOptionTextActive
                ]}>
                  {member.fullName ?? member.FullName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
        <Text style={styles.loadingText}>Harcamalar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Özet */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Toplam</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.total)}</Text>
          <Text style={styles.summaryCount}>{summary.count} kalem</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Senin Ödediklerin</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.userTotal)}</Text>
          <Text style={styles.summaryCount}>
            {filteredItems.filter(item => {
              const raw = item._raw || {};
              const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
              return String(payerId) === String(user?.id);
            }).length} kalem
          </Text>
        </View>
      </View>

      {/* Arama ve Filtreler */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Harcama ara..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={theme.colors.text.secondary}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>Filtre</Text>
        </TouchableOpacity>
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
            <Text style={styles.emptyTitle}>Harcama bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Seçilen filtreler için harcama kaydı bulunmuyor
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Filtre Modal */}
      {renderFilterModal()}
    </View>
  );
};

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.text.secondary },
  
  // Özet
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  summaryCard: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neutral[200] },
  summaryLabel: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 2 },
  summaryCount: { fontSize: 11, color: theme.colors.text.secondary },

  // Arama
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12
  },
  searchInput: { flex: 1, borderRadius: 8, padding: 12, borderWidth: 1 },
  filterButton: { backgroundColor: theme.colors.primary[500], paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' },
  filterButtonText: { color: theme.colors.text.onPrimary, fontWeight: '600' },

  // Liste
  listContainer: {
    padding: 16,
    paddingTop: 0
  },
  card: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2
  },
  cardTitleText: {
    flex: 1
  },
  cardTitleMain: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: theme.colors.text.secondary },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
  cardNote: { fontSize: 13, color: theme.colors.text.secondary, fontStyle: 'italic', marginBottom: 8, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: theme.colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
  modalClose: { fontSize: 16, color: theme.colors.primary[500], fontWeight: '600' },
  modalContent: {
    flex: 1,
    padding: 16
  },
  filterSection: {
    marginBottom: 24
  },
  filterSectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 12 },
  filterOption: { padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
  filterOptionActive: { backgroundColor: theme.colors.primary[100], borderColor: theme.colors.primary[500] },
  filterOptionText: { fontSize: 14, color: theme.colors.text.primary },
  filterOptionTextActive: { color: theme.colors.primary[700], fontWeight: '600' },

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

export default HarcamaListesiScreen;
