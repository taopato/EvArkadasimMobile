// Harcamalar (Harcama Listesi) — "tam hareket dökümü"
// Evdeki tüm harcama satırlarını (düzenli/taksitli çocuklar + düzensiz tekil kalemler) tarih akışında göster

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Modal,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { expensesApi, houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { BILL_KEYS, normalizeExpense } from '../utils/expenseClassifier';
import { HeroHeader } from '../shared/ui/premium/HeroHeader';
import {
  compareByRecentDate,
  getUTCMonthWindow,
  formatCurrency,
  formatDate,
  getExpenseDisplayTitle,
  getItemDate,
  getItemNote,
  getPlanType,
  getSortDate,
  isChildExpense,
  isParentExpense,
  deduplicateMonthlyPlans,
  sortByDateDesc,
  getCategoryDisplayName,
  getCategoryIcon,
  getCategoryColor,
  calculateTotals
} from '../utils/expenseHelpers';

const TumHarcamalarScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { houseId: routeHouseId, houseName } = route.params || {};
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
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedPlanTypes, setSelectedPlanTypes] = useState(['all']);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const listRef = useRef(null);

  // Dönem seçenekleri
  const periodOptions = [
    { key: 'current', label: 'Bu Ay' },
    { key: 'last3', label: 'Son 3 Ay' },
    { key: 'last6', label: 'Son 6 Ay' },
    { key: 'year', label: 'Bu Yıl' },
    { key: 'all', label: 'Tümü' }
  ];

  // Kategori seçenekleri
  const categoryOptions = [
    { key: 'Rent', label: 'Kira', icon: '🏠' },
    { key: 'Internet', label: 'İnternet', icon: '🌐' },
    { key: 'Electricity', label: 'Elektrik', icon: '⚡' },
    { key: 'Water', label: 'Su', icon: '💧' },
    { key: 'Gas', label: 'Doğalgaz', icon: '🔥' },
    { key: 'Market', label: 'Market', icon: '🛒' },
    { key: 'Food', label: 'Yemek', icon: '🍽️' },
    { key: 'Other', label: 'Diğer', icon: '📄' }
  ];

  // Plan türü seçenekleri
  const planTypeOptions = [
    { key: 'all', label: 'Hepsi' },
    { key: 'recurring', label: 'Düzenli' },
    { key: 'installment', label: 'Taksitli' },
    { key: 'irregular', label: 'Düzensiz' }
  ];

  // Sıralama seçenekleri
  const sortOptions = [
    { key: 'date', label: 'Tarih' },
    { key: 'amount', label: 'Tutar' },
    { key: 'category', label: 'Kategori' },
    { key: 'payer', label: 'Ödeyen' }
  ];

  const areExactSameSelections = (left, right) => {
    if (left.length !== right.length) return false;
    return [...left].sort().join('|') === [...right].sort().join('|');
  };

  const billCategoryKeys = BILL_KEYS.filter((key) => categoryOptions.some((option) => option.key === key));
  const hasBillQuickFilter = areExactSameSelections(selectedCategories, billCategoryKeys);
  const hasIrregularQuickFilter = selectedPlanTypes.length === 1 && selectedPlanTypes.includes('irregular');
  const hasRecurringQuickFilter = selectedPlanTypes.length === 1 && selectedPlanTypes.includes('recurring');
  const hasRentQuickFilter = selectedCategories.length === 1 && selectedCategories.includes('Rent');
  const hasMarketQuickFilter = selectedCategories.length === 1 && selectedCategories.includes('Market');
  const hasMineQuickFilter = selectedMembers.length === 1 && selectedMembers.includes(String(user?.id));

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
      console.error('❌ Harcamalar yükleme hatası:', error);
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

  // Filtrelenmiş ve sıralanmış veriler
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Dönem filtresi
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter(item => {
        const date = getItemDate(item);
        return date >= dateRange.monthStart && date < dateRange.monthEnd;
      });
    }

    // Kategori filtresi
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => selectedCategories.includes(item.key));
    }

    // Üye filtresi
    if (selectedMembers.length > 0) {
      filtered = filtered.filter(item => {
        const raw = item._raw || {};
        const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
        return selectedMembers.includes(String(payerId));
      });
    }

    // Plan türü filtresi
    if (!selectedPlanTypes.includes('all')) {
      filtered = filtered.filter(item => {
        const planType = getPlanType(item);
        return selectedPlanTypes.includes(planType);
      });
    }

    // Arama filtresi
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const title = item.title?.toLowerCase() || '';
        const note = getItemNote(item).toLowerCase();
        return title.includes(searchLower) || note.includes(searchLower);
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = compareByRecentDate(a, b);
          break;
        case 'amount':
          comparison = b.amount - a.amount;
          break;
        case 'category':
          comparison = a.key.localeCompare(b.key);
          break;
        case 'payer':
          const payerA = membersMap[a._raw?.odeyenUserId ?? a._raw?.OdeyenUserId] || '';
          const payerB = membersMap[b._raw?.odeyenUserId ?? b._raw?.OdeyenUserId] || '';
          comparison = payerA.localeCompare(payerB);
          break;
        default:
          comparison = 0;
      }
      
      if (sortOrder === 'asc') comparison = -comparison;
      
      // Eşitlik durumunda ID'ye göre sırala
      if (comparison === 0) {
        comparison = (b.id ?? 0) - (a.id ?? 0);
      }
      
      return comparison;
    });

    return filtered;
  }, [items, selectedPeriod, selectedCategories, selectedMembers, selectedPlanTypes, searchText, sortBy, sortOrder, membersMap]);

  // Özet hesaplamaları
  const summary = useMemo(() => {
    const { total, count } = calculateTotals(filteredItems);
    return { total, count };
  }, [filteredItems]);

  // Kart render
  const renderItem = ({ item }) => {
    const raw = item._raw || {};
    const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
    const payerName = membersMap[payerId] || `Kullanıcı ${payerId}`;
    const date = getSortDate(item);
    const note = getItemNote(item);
    const planType = getPlanType(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('HarcamaDetayi', { 
          expenseId: item.id, 
          houseId 
        })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.cardIcon}>{getCategoryIcon(item.key)}</Text>
            <Text style={styles.cardTitleText}>{getExpenseDisplayTitle(item)}</Text>
          </View>
          <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.cardSubtitle}>
            {formatDate(date)} • Ödeyen: {payerName}
          </Text>
          {note !== '—' && (
            <Text style={styles.cardNote} numberOfLines={1}>
              {note}
            </Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.badgesContainer}>
            {planType !== 'irregular' && (
              <View style={[
                styles.badge,
                { backgroundColor: (theme.colors.primary?.[100] ?? theme.colors.neutral?.[100]) }
              ]}>
                <Text style={styles.badgeText}>
                  {planType === 'recurring' ? 'Düzenli' : 'Taksitli'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filtre Modal Render
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
          {/* Arama */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Arama</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Başlık veya açıklamada ara..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

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

          {/* Kategoriler */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Kategoriler</Text>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setSelectedCategories([])}
            >
              <Text style={styles.filterOptionText}>Hepsi</Text>
            </TouchableOpacity>
            {categoryOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  selectedCategories.includes(option.key) && styles.filterOptionActive
                ]}
                onPress={() => {
                  if (selectedCategories.includes(option.key)) {
                    setSelectedCategories(prev => prev.filter(c => c !== option.key));
                  } else {
                    setSelectedCategories(prev => [...prev, option.key]);
                  }
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedCategories.includes(option.key) && styles.filterOptionTextActive
                ]}>
                  {option.icon} {option.label}
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
                  selectedPlanTypes.includes(option.key) && styles.filterOptionActive
                ]}
                onPress={() => {
                  if (option.key === 'all') {
                    setSelectedPlanTypes(['all']);
                  } else {
                    const newTypes = selectedPlanTypes.includes(option.key)
                      ? selectedPlanTypes.filter(t => t !== option.key)
                      : [...selectedPlanTypes.filter(t => t !== 'all'), option.key];
                    setSelectedPlanTypes(newTypes.length === 0 ? ['all'] : newTypes);
                  }
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPlanTypes.includes(option.key) && styles.filterOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sıralama */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sıralama</Text>
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  sortBy === option.key && styles.filterOptionActive
                ]}
                onPress={() => {
                  if (sortBy === option.key) {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortBy(option.key);
                    setSortOrder('desc');
                  }
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  sortBy === option.key && styles.filterOptionTextActive
                ]}>
                  {option.label} {sortBy === option.key && (sortOrder === 'desc' ? '↓' : '↑')}
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
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Harcamalar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeroHeader
        title="Harcamalar"
        subtitle={`${houseName || ''} • ${summary.count} harcama`}
        amount={formatCurrency(summary.total)}
        primaryLabel="Harcama Ekle"
        onPrimaryAction={() => navigation.navigate('HarcamaEkle', { houseId, houseName })}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => navigation.navigate('HarcamaEkle', { houseId, houseName })}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryActionText}>+ Harcama Ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryActionText}>Filtreler</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickFiltersWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFilters}
      >
        <TouchableOpacity
          style={[styles.quickChip, selectedPeriod === 'current' && styles.quickChipActive]}
          onPress={() => setSelectedPeriod('current')}
        >
          <Text style={[styles.quickChipText, selectedPeriod === 'current' && styles.quickChipTextActive]}>Bu ay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, hasIrregularQuickFilter && styles.quickChipActive]}
          onPress={() => setSelectedPlanTypes(hasIrregularQuickFilter ? ['all'] : ['irregular'])}
        >
          <Text style={[styles.quickChipText, hasIrregularQuickFilter && styles.quickChipTextActive]}>Düzensiz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, hasRecurringQuickFilter && styles.quickChipActive]}
          onPress={() => setSelectedPlanTypes(hasRecurringQuickFilter ? ['all'] : ['recurring'])}
        >
          <Text style={[styles.quickChipText, hasRecurringQuickFilter && styles.quickChipTextActive]}>Düzenli</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, hasBillQuickFilter && styles.quickChipActive]}
          onPress={() => setSelectedCategories(hasBillQuickFilter ? [] : billCategoryKeys)}
        >
          <Text style={[styles.quickChipText, hasBillQuickFilter && styles.quickChipTextActive]}>Faturalar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, hasRentQuickFilter && styles.quickChipActive]}
          onPress={() => setSelectedCategories(hasRentQuickFilter ? [] : ['Rent'])}
        >
          <Text style={[styles.quickChipText, hasRentQuickFilter && styles.quickChipTextActive]}>Kira</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, hasMarketQuickFilter && styles.quickChipActive]}
          onPress={() => setSelectedCategories(hasMarketQuickFilter ? [] : ['Market'])}
        >
          <Text style={[styles.quickChipText, hasMarketQuickFilter && styles.quickChipTextActive]}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, hasMineQuickFilter && styles.quickChipActive]}
          onPress={() => setSelectedMembers(hasMineQuickFilter ? [] : [String(user?.id)])}
        >
          <Text style={[styles.quickChipText, hasMineQuickFilter && styles.quickChipTextActive]}>Ben ödedim</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => {
            setSelectedPeriod('all');
            setSelectedCategories([]);
            setSelectedMembers([]);
            setSelectedPlanTypes(['all']);
            setSearchText('');
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
            });
          }}
        >
          <Text style={styles.quickChipText}>Temizle</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>

      {/* Liste */}
      <FlatList
        ref={listRef}
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
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>Harcama bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Filtreleri değiştirerek daha fazla sonuç görebilirsiniz
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

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.surface },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
    loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.text.secondary },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      backgroundColor: theme.colors.surface,
    },
    primaryActionButton: {
      flex: 1,
      backgroundColor: theme.colors.primary[600],
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary[700],
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    primaryActionText: {
      color: theme.colors.text.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    secondaryActionButton: {
      minWidth: 108,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryActionText: {
      color: theme.colors.text.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.colors.background, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.primary },
    headerSubtitle: { fontSize: 14, color: theme.colors.text.secondary, marginTop: 2 },
    filterButton: { backgroundColor: theme.colors.primary[500], paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    filterButtonText: { color: theme.colors.text.onPrimary, fontWeight: '600' },
    quickFiltersWrap: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
      paddingTop: 6,
    },

    // Liste
    listContainer: {
      padding: 16
    },
    quickFilters: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 8,
    },
    quickChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      alignSelf: 'flex-start',
    },
    quickChipActive: {
      backgroundColor: theme.colors.primary[600],
      borderColor: theme.colors.primary[600],
    },
    quickChipText: {
      color: theme.colors.text.primary,
      fontWeight: '700',
    },
    quickChipTextActive: {
      color: theme.colors.text.onPrimary,
    },
    card: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8
    },
    cardTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1
    },
    cardIcon: {
      fontSize: 20,
      marginRight: 8
    },
    cardTitleText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary, flex: 1 },
    cardAmount: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    cardDetails: {
      marginBottom: 8
    },
    cardSubtitle: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 4 },
    cardNote: { fontSize: 13, color: theme.colors.text.secondary, fontStyle: 'italic' },
    cardFooter: {
      marginTop: 8
    },
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
    searchInput: { borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: theme.colors.background },
    filterOption: { padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    filterOptionActive: { backgroundColor: theme.colors.primary[100], borderColor: theme.colors.primary[500] },
    filterOptionText: { fontSize: 14, color: theme.colors.text.primary },
    filterOptionTextActive: { color: theme.colors.primary[700], fontWeight: '600' }
  });
}

export default TumHarcamalarScreen;
