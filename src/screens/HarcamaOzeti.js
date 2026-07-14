// Harcama Özeti — "analitik & denge" ekranı
// Seçilen dönem için kümülatif bakış: kim ne kadar harcadı, kategoriler, trendler, net denge

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { expensesApi, houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { normalizeExpense } from '../utils/expenseClassifier';
import { getCategoryDisplayName, getCategoryIconName, getCategoryColor } from '../constants/ExpenseEnums';
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

const { width } = Dimensions.get('window');

const HarcamaOzetiScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { houseId: routeHouseId } = route.params || {};
  const houseId = routeHouseId || user?.defaultHouseId;
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersMap, setMembersMap] = useState({});

  // Filtreler
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [includePlans, setIncludePlans] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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
    { key: 'Rent', label: 'Kira', icon: 'home-outline' },
    { key: 'Internet', label: 'İnternet', icon: 'wifi-outline' },
    { key: 'Electricity', label: 'Elektrik', icon: 'flash-outline' },
    { key: 'Water', label: 'Su', icon: 'water-outline' },
    { key: 'Gas', label: 'Doğalgaz', icon: 'flame-outline' },
    { key: 'Market', label: 'Market', icon: 'cart-outline' },
    { key: 'Food', label: 'Yemek', icon: 'restaurant-outline' },
    { key: 'Other', label: 'Diğer', icon: 'document-text-outline' }
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
      console.error('❌ Harcama özeti yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
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
    if (!includePlans) {
      filtered = filtered.filter(item => getPlanType(item) === 'irregular');
    }

    return filtered;
  }, [items, selectedPeriod, selectedCategories, selectedMembers, includePlans]);

  // KPI Hesaplamaları
  const kpis = useMemo(() => {
    const { total, count } = calculateTotals(filteredItems);
    const participantCount = members.length;
    const averagePerPerson = participantCount > 0 ? total / participantCount : 0;
    
    // Kullanıcı bazlı hesaplamalar
    const userExpenses = filteredItems.filter(item => {
      const raw = item._raw || {};
      const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
      return String(payerId) === String(user?.id);
    });
    const userTotal = calculateTotals(userExpenses).total;

    // En büyük kalem
    const largestItem = filteredItems.reduce((max, item) => 
      item.amount > max.amount ? item : max, 
      { amount: 0, key: 'Other' }
    );

    return {
      total,
      count,
      averagePerPerson,
      userTotal,
      largestItem,
      participantCount
    };
  }, [filteredItems, members.length, user?.id]);

  // Kategori dağılımı
  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    
    filteredItems.forEach(item => {
      const category = item.key;
      if (!breakdown[category]) {
        breakdown[category] = { total: 0, count: 0 };
      }
      breakdown[category].total += item.amount;
      breakdown[category].count += 1;
    });

    return Object.entries(breakdown)
      .map(([key, data]) => ({
        key,
        label: getCategoryDisplayName(key),
        icon: getCategoryIconName(key),
        color: getCategoryColor(key),
        ...data
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  // Kişi bazlı özet
  const memberBreakdown = useMemo(() => {
    const breakdown = {};
    
    filteredItems.forEach(item => {
      const raw = item._raw || {};
      const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
      const payerName = membersMap[payerId] || `Kullanıcı ${payerId}`;
      
      if (!breakdown[payerId]) {
        breakdown[payerId] = {
          name: payerName,
          paid: 0,
          count: 0
        };
      }
      breakdown[payerId].paid += item.amount;
      breakdown[payerId].count += 1;
    });

    return Object.entries(breakdown)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.paid - a.paid);
  }, [filteredItems, membersMap]);

  // KPI Kartları Render
  const renderKPICards = () => (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>Toplam Gider</Text>
        <Text style={styles.kpiValue}>{formatCurrency(kpis.total)}</Text>
        <Text style={styles.kpiSubtext}>{kpis.count} kalem</Text>
      </View>
      
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>Kişi Başı Ortalama</Text>
        <Text style={styles.kpiValue}>{formatCurrency(kpis.averagePerPerson)}</Text>
        <Text style={styles.kpiSubtext}>{kpis.participantCount} kişi</Text>
      </View>
      
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>Senin Ödediklerin</Text>
        <Text style={styles.kpiValue}>{formatCurrency(kpis.userTotal)}</Text>
        <Text style={styles.kpiSubtext}>
          {filteredItems.filter(item => {
            const raw = item._raw || {};
            const payerId = raw.odeyenUserId ?? raw.OdeyenUserId;
            return String(payerId) === String(user?.id);
          }).length} kalem
        </Text>
      </View>
      
      {kpis.largestItem.amount > 0 && (
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>En Büyük Kalem</Text>
          <Text style={styles.kpiValue}>{formatCurrency(kpis.largestItem.amount)}</Text>
          <Text style={styles.kpiSubtext}>{getCategoryDisplayName(kpis.largestItem.key)}</Text>
        </View>
      )}
    </View>
  );

  // Kategori Dağılımı Render
  const renderCategoryBreakdown = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kategori Dağılımı</Text>
      {categoryBreakdown.map((category, index) => {
        const percentage = kpis.total > 0 ? (category.total / kpis.total) * 100 : 0;
        return (
          <View key={category.key} style={styles.categoryItem}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryInfo}>
                <Ionicons name={category.icon} size={18} color={category.color} style={{ marginRight: 8 }} />
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </View>
              <Text style={styles.categoryAmount}>{formatCurrency(category.total)}</Text>
            </View>
            <View style={styles.categoryBar}>
              <View 
                style={[
                  styles.categoryBarFill, 
                  { 
                    width: `${percentage}%`,
                    backgroundColor: category.color
                  }
                ]} 
              />
            </View>
            <Text style={styles.categoryStats}>
              {category.count} kalem • %{percentage.toFixed(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // Kişi Bazlı Özet Render
  const renderMemberBreakdown = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kişi Bazlı Özet</Text>
      {memberBreakdown.map((member, index) => (
        <View key={member.id} style={styles.memberItem}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberStats}>{member.count} kalem</Text>
          </View>
          <Text style={styles.memberAmount}>{formatCurrency(member.paid)}</Text>
        </View>
      ))}
    </View>
  );

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

          {/* Plan Türü */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Plan Türü</Text>
            <TouchableOpacity
              style={[
                styles.filterOption,
                includePlans && styles.filterOptionActive
              ]}
              onPress={() => setIncludePlans(!includePlans)}
            >
              <Text style={[
                styles.filterOptionText,
                includePlans && styles.filterOptionTextActive
              ]}>
                Düzenli/Taksitli Planları Dahil Et
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
        <Text style={styles.loadingText}>Harcama özeti yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Harcama Özeti</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={16} color={theme.colors.text.onPrimary} />
          <Text style={styles.filterButtonText}>Filtre</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI Kartları */}
        {renderKPICards()}

        {/* Kategori Dağılımı */}
        {renderCategoryBreakdown()}

        {/* Kişi Bazlı Özet */}
        {renderMemberBreakdown()}
      </ScrollView>

      {/* Filtre Modal */}
      {renderFilterModal()}
    </View>
  );
};

export default HarcamaOzetiScreen;

function makeStyles(theme, insets) {
  const { width } = Dimensions.get('window');
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingTop: (insets?.top || 0) + 12, paddingBottom: 12,
      backgroundColor: theme.colors.background, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200]
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: theme.colors.text.primary },
    filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary[600], paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
    filterButtonText: { color: theme.colors.text.onPrimary, fontWeight: '700', fontSize: 13 },
    content: { flex: 1 },
    kpiContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
    kpiCard: {
      width: (width - 44) / 2, backgroundColor: theme.colors.background, borderRadius: 12, padding: 16, alignItems: 'center',
      borderWidth: 1, borderColor: theme.colors.neutral[200]
    },
    kpiLabel: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4, textAlign: 'center' },
    kpiValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 2, textAlign: 'center' },
    kpiSubtext: { fontSize: 11, color: theme.colors.text.secondary, textAlign: 'center' },
    section: { backgroundColor: theme.colors.background, margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 16 },
    categoryItem: { marginBottom: 16 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    categoryInfo: { flexDirection: 'row', alignItems: 'center' },
    categoryIcon: { fontSize: 16, marginRight: 8 },
    categoryLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary },
    categoryAmount: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text.primary },
    categoryBar: { height: 6, backgroundColor: theme.colors.neutral[200], borderRadius: 3, marginBottom: 4 },
    categoryBarFill: { height: '100%', borderRadius: 3 },
    categoryStats: { fontSize: 12, color: theme.colors.text.secondary },
    memberItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100] },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 2 },
    memberStats: { fontSize: 12, color: theme.colors.text.secondary },
    memberAmount: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text.primary },
    modalContainer: { flex: 1, backgroundColor: theme.colors.surface },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
    modalClose: { fontSize: 16, color: theme.colors.primary[500], fontWeight: '600' },
    modalContent: { flex: 1, padding: 16 },
    filterSection: { marginBottom: 24 },
    filterSectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 12 },
    filterOption: { padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    filterOptionActive: { backgroundColor: theme.colors.primary[100], borderColor: theme.colors.primary[500] },
    filterOptionText: { fontSize: 14, color: theme.colors.text.primary },
    filterOptionTextActive: { color: theme.colors.primary[700], fontWeight: '600' },
  });
}
