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
  TextInput,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { expensesApi, houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { BILL_KEYS, normalizeExpense } from '../utils/expenseClassifier';
import { HeroHeader } from '../shared/ui/premium/HeroHeader';
import { useFocusEffect } from '@react-navigation/native';
import eventBus from '../shared/events/bus';
import BrandMark from '../components/BrandMark';
import PrimaryActionCard from '../shared/ui/PrimaryActionCard';
import {
  compareByRecentDate,
  formatCurrency,
  formatDate,
  getExpenseDisplayTitle,
  getItemDate,
  getItemNote,
  getPlanType,
  getSortDate,
  deduplicateMonthlyPlans,
  sortByDateDesc,
  getCategoryIconName,
  calculateTotals
} from '../utils/expenseHelpers';

const categoryOptions = [
  { key: 'Rent', label: 'Kira', icon: 'home-outline' },
  { key: 'Internet', label: 'İnternet', icon: 'wifi-outline' },
  { key: 'Electricity', label: 'Elektrik', icon: 'flash-outline' },
  { key: 'Water', label: 'Su', icon: 'water-outline' },
  { key: 'Gas', label: 'Doğalgaz', icon: 'flame-outline' },
  { key: 'Market', label: 'Market', icon: 'cart-outline' },
  { key: 'Food', label: 'Yemek', icon: 'restaurant-outline' },
  { key: 'Other', label: 'Diğer', icon: 'document-text-outline' }
];

const TumHarcamalarScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { houseId: routeHouseId, houseName } = route.params || {};
  const houseId = routeHouseId || user?.defaultHouseId;
  const { width } = useWindowDimensions();
  const isCompact = width < 520;
  useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme, isCompact), [theme, isCompact]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersMap, setMembersMap] = useState({});

  // Filtreler
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedPlanTypes, setSelectedPlanTypes] = useState(['all']);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const listRef = useRef(null);

  const periodOptions = [
    { key: 'current', label: 'Bu Ay (30 Gün)' },
    { key: 'last3', label: 'Son 3 Ay' },
    { key: 'last6', label: 'Son 6 Ay' },
    { key: 'year', label: 'Bu Yıl' },
    { key: 'all', label: 'Tümü' }
  ];

  const planTypeOptions = [
    { key: 'all', label: 'Hepsi' },
    { key: 'recurring', label: 'Düzenli' },
    { key: 'installment', label: 'Taksitli' },
    { key: 'irregular', label: 'Düzensiz' }
  ];

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

  const loadData = async () => {
    if (!houseId) return;

    setLoading(true);
    try {
      const res = await expensesApi.getByHouse(houseId);
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data) ? data.map(normalizeExpense) : [];

      const deduplicated = deduplicateMonthlyPlans(list);
      const sorted = sortByDateDesc(deduplicated);

      setItems(sorted);

      const membersRes = await houseApi.getMembers(houseId);
      const membersData = membersRes?.data?.data ?? membersRes?.data ?? [];
      const membersList = Array.isArray(membersData) ? membersData : [];

      setMembers(membersList);

      const map = {};
      membersList.forEach(member => {
        map[member.userId ?? member.UserId] = member.fullName ?? member.FullName ?? 'Bilinmeyen';
      });
      setMembersMap(map);

    } catch (error) {
      console.error('Harcamalar yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [houseId]);

  useEffect(() => {
    const onUpdated = ({ houseId: changedId }) => {
      if (Number(changedId) === Number(houseId)) {
        loadData();
      }
    };

    eventBus.on('expenses:updated', onUpdated);
    return () => {
      eventBus.off('expenses:updated', onUpdated);
    };
  }, [houseId]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [houseId])
  );

  const getDateRange = () => {
    const now = new Date();

    switch (selectedPeriod) {
      case 'current': {
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const start = new Date(end);
        start.setDate(start.getDate() - 30);
        return { monthStart: start, monthEnd: end };
      }
      case 'last3': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { monthStart: threeMonthsAgo, monthEnd: now };
      }
      case 'last6': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return { monthStart: sixMonthsAgo, monthEnd: now };
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
        return { monthStart: yearStart, monthEnd: yearEnd };
      }
      default:
        return null; // Tümü
    }
  };

  const filteredItems = useMemo(() => {
    let filtered = [...items];

    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter(item => {
        const date = getItemDate(item);
        return date >= dateRange.monthStart && date < dateRange.monthEnd;
      });
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => selectedCategories.includes(item.key));
    }

    if (selectedMembers.length > 0) {
      filtered = filtered.filter(item => {
        const raw = item._raw || {};
        const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
        return selectedMembers.includes(String(payerId));
      });
    }

    if (!selectedPlanTypes.includes('all')) {
      filtered = filtered.filter(item => {
        const planType = getPlanType(item);
        return selectedPlanTypes.includes(planType);
      });
    }

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const title = item.title?.toLowerCase() || '';
        const note = getItemNote(item).toLowerCase();
        return title.includes(searchLower) || note.includes(searchLower);
      });
    }

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
        case 'payer': {
          const payerA = membersMap[a._raw?.odeyenUserId ?? a._raw?.OdeyenUserId] || '';
          const payerB = membersMap[b._raw?.odeyenUserId ?? b._raw?.OdeyenUserId] || '';
          comparison = payerA.localeCompare(payerB);
          break;
        }
        default:
          comparison = 0;
      }

      if (sortOrder === 'asc') comparison = -comparison;

      if (comparison === 0) {
        comparison = (b.id ?? 0) - (a.id ?? 0);
      }

      return comparison;
    });

    return filtered;
  }, [items, selectedPeriod, selectedCategories, selectedMembers, selectedPlanTypes, searchText, sortBy, sortOrder, membersMap]);

  const summary = useMemo(() => {
    const { total, count } = calculateTotals(filteredItems);
    return { total, count };
  }, [filteredItems]);

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
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name={getCategoryIconName(item.key)} size={20} color={theme.colors.primary[600]} />
          </View>
          <View style={styles.cardTitle}>
            <Text style={styles.cardTitleText} numberOfLines={1}>{getExpenseDisplayTitle(item)}</Text>
            <Text style={styles.cardSubtitle}>
              {formatDate(date)} • Ödeyen: {payerName}
            </Text>
          </View>
          <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
        </View>

        {note !== '—' && (
          <Text style={styles.cardNote} numberOfLines={1}>
            {note}
          </Text>
        )}

        {planType !== 'irregular' && (
          <View style={styles.cardFooter}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary?.[50] ?? theme.colors.neutral?.[100] }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary[700] }]}>
                {planType === 'recurring' ? 'Düzenli' : 'Taksitli'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Arama</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Başlık veya açıklamada ara..."
              placeholderTextColor={theme.colors.text.secondary}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

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
                <View style={styles.filterOptionRow}>
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={selectedCategories.includes(option.key) ? theme.colors.primary[700] : theme.colors.text.secondary}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedCategories.includes(option.key) && styles.filterOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

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
        title="Giderler"
        subtitle={`${houseName || ''} • ${summary.count} harcama`}
        amount={formatCurrency(summary.total)}
      />

      <View style={styles.actionRow}>
        <PrimaryActionCard
          icon="add"
          title="Yeni Harcama Ekle"
          subtitle="Tek seferlik veya paylaşımlı bir gider oluştur"
          onPress={() => navigation.navigate('HarcamaEkle', { houseId, houseName })}
        />
        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="options-outline" size={16} color={theme.colors.text.primary} />
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
          <View style={[styles.emptyContainer, styles.emptyState]}>
            <BrandMark variant="logo" size={180} subtle style={styles.emptyWatermark} />
            <Text style={styles.emptyTitle}>Harcama bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Filtreleri değiştirerek daha fazla sonuç görebilirsiniz
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {renderFilterModal()}
    </View>
  );
};

function makeStyles(theme, isCompact) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.text.secondary },
    actionRow: {
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      backgroundColor: theme.colors.background,
    },
    secondaryActionButton: {
      alignSelf: 'flex-end',
      minWidth: 108,
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    secondaryActionText: {
      color: theme.colors.text.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    quickFiltersWrap: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
      paddingTop: 6,
    },
    listContainer: {
      padding: 16,
      paddingBottom: 100,
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
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      alignSelf: 'flex-start',
      marginRight: 8,
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
    card: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardTitle: {
      flex: 1,
    },
    cardTitleText: { fontSize: 15, fontWeight: '800', color: theme.colors.text.primary },
    cardAmount: { fontSize: 15, fontWeight: '800', color: theme.colors.text.primary, marginLeft: 8 },
    cardSubtitle: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 },
    cardNote: { fontSize: 13, color: theme.colors.text.secondary, fontStyle: 'italic', marginTop: 8 },
    cardFooter: {
      marginTop: 10,
      flexDirection: 'row',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },

    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 48
    },
    emptyState: { position: 'relative', overflow: 'hidden', minHeight: 190 },
    emptyWatermark: {
      position: 'absolute',
      opacity: 0.08,
      right: -18,
      bottom: -16,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 20 },

    modalContainer: { flex: 1, backgroundColor: theme.colors.surface },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
    modalClose: { fontSize: 16, color: theme.colors.primary[600], fontWeight: '600' },
    modalContent: {
      flex: 1,
      padding: 16
    },
    filterSection: {
      marginBottom: 24
    },
    filterSectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 12 },
    searchInput: { borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 14, padding: 12, fontSize: 16, backgroundColor: theme.colors.background, color: theme.colors.text.primary },
    filterOption: { padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    filterOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterOptionActive: { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[500] },
    filterOptionText: { fontSize: 14, color: theme.colors.text.primary },
    filterOptionTextActive: { color: theme.colors.primary[700], fontWeight: '600' }
  });
}

export default TumHarcamalarScreen;
