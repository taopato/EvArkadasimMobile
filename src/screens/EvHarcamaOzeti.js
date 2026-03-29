import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { houseApi, expensesApi } from '../services/api';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { getCategoryDisplayName, getCategoryIcon, formatAmount, formatDate } from '../constants/ExpenseEnums';
import { getCategoryColorUI } from '../constants/ExpenseUI';

// Helper functions
const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const getMonthEnd = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
};

const HouseSpendingOverviewScreen = ({ navigation, route }) => {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]); // not used; tutuyoruz (geri uyumluluk)

  useEffect(() => {
    if (!houseId) {
      Alert.alert('Hata', 'Ev bilgisi eksik.');
      navigation.goBack();
      return;
    }
    fetchOverview();
  }, [houseId]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      // “Özet” ekranda hem günlük hem planlılar birlikte olsun
      const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const [membersRes, expensesRes] = await Promise.all([
        houseApi.getMembers(houseId),
        expensesApi.getExpenses(houseId, currentMonth)
      ]);

      let expensesData = [];
      if (expensesRes.data && expensesRes.data.isSuccess && Array.isArray(expensesRes.data.data)) {
        expensesData = expensesRes.data.data;
      } else if (Array.isArray(expensesRes.data)) {
        expensesData = expensesRes.data;
      } else if (expensesRes.data && Array.isArray(expensesRes.data.data)) {
        expensesData = expensesRes.data.data;
      } else {
        expensesData = [];
      }

      setMembers(membersRes.data || []);
      setExpenses(expensesData);
      setBills([]); // tüm veri expenses içinden okunuyor

      const totalExpenses = expensesData.reduce((sum, exp) => sum + Number(exp.tutar || 0), 0);
      const billCategories = ['Water', 'Electricity', 'Rent', 'Gas', 'Other', 'Internet'];
      const totalBills = expensesData.reduce((sum, exp) => {
        const category = exp.category || exp.tur;
        return billCategories.includes(category) ? sum + Number(exp.tutar || 0) : sum;
      }, 0);

      setOverview({
        totalSpending: totalExpenses,
        totalExpenses,
        totalBills,
        memberCount: (membersRes.data || []).length,
        expenseCount: expensesData.length,
        billCount: 0
      });

    } catch (error) {
      Alert.alert('Hata', 'Harcama özeti alınırken bir sorun oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getExpenseCategories = () => {
    const categories = {};
    if (Array.isArray(expenses)) {
      expenses.forEach(exp => {
        const category = exp.category || 'Other';
        const displayName = getCategoryDisplayName(category);
        if (!categories[displayName]) {
          categories[displayName] = { total: 0, count: 0 };
        }
        categories[displayName].total += Number(exp.tutar || 0);
        categories[displayName].count += 1;
      });
    }

    const preferredOrder = ['Kira', 'İnternet', 'Elektrik', 'Su', 'Doğalgaz', 'Market', 'Yemek', 'Diğer'];
    preferredOrder.forEach((name) => {
      if (!categories[name]) {
        categories[name] = { total: 0, count: 0 };
      }
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      percentage: overview ? (data.total / overview.totalExpenses * 100) : 0
    }))
    .sort((a, b) => {
      const ai = preferredOrder.indexOf(a.name);
      const bi = preferredOrder.indexOf(b.name);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return b.total - a.total;
    });
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={CommonStyles.loadingText}>Harcama özeti yükleniyor...</Text>
        </View>
      </View>
    );
  }

  const categories = getExpenseCategories();

  const BILL_TYPE_BY_NAME = { 'Kira': 1, 'İnternet': 5, 'Elektrik': 2, 'Su': 3, 'Doğalgaz': 4 };
  const onCategoryPress = (name) => {
    const t = BILL_TYPE_BY_NAME[name];
    if (t) {
      navigation.navigate('FaturaListesi', { houseId, houseName, utilityType: t, categoryName: name });
    } else {
      navigation.navigate('HarcamaListesi', { houseId, houseName });
    }
  };

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Harcama Özeti</Text>
          <Text style={CommonStyles.subtitle}>
            {houseName || 'Ev'} • Genel bakış
          </Text>
        </View>

        {/* Genel İstatistikler */}
        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>📊 Genel İstatistikler</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatAmount(overview?.totalSpending)}</Text>
              <Text style={styles.statLabel}>Toplam Harcama</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overview?.memberCount || 0}</Text>
              <Text style={styles.statLabel}>Üye Sayısı</Text>
            </View>
          </View>
        </View>

        {/* Tüm Harcamalar (günlük + planlı) */}
        {expenses.length > 0 && (
          <View style={CommonStyles.card}>
            <Text style={styles.sectionTitle}>💰 Tüm Harcamalar</Text>
            <View style={CommonStyles.listContainer}>
              {expenses
                .slice()
                .sort((a,b) => new Date(b.postDate||b.createdAt||b.kayitTarihi||0) - new Date(a.postDate||a.createdAt||a.kayitTarihi||0))
                .map((expense, idx) => {
                const category = expense.category || expense.tur || 'Other';
                const displayName = getCategoryDisplayName(category);
                const spenderName = expense.odeyenKullaniciAdi || expense.odeyenUser?.fullName || 'Bilinmeyen';
                const date = expense.postDate || expense.createdAt || expense.kayitTarihi;

                return (
                  <View key={String(expense.id ?? idx)} style={CommonStyles.listItem}>
                    <View style={[styles.expenseIcon, { backgroundColor: (getCategoryColorUI(category) || theme.colors.primary[500]) + '20' }]}>
                      <Text style={styles.expenseIconText}>{getCategoryIcon(category)}</Text>
                    </View>
                    <View style={CommonStyles.listItemContent}>
                      <Text style={CommonStyles.listItemTitle}>{displayName}</Text>
                      <Text style={CommonStyles.listItemSubtitle}>
                        {spenderName} • {formatDate(date)}
                      </Text>
                    </View>
                    <View style={styles.expenseAmount}>
                      <Text style={[styles.amountText, { color: getCategoryColorUI(category) || theme.colors.primary[500] }]}>
                        {formatAmount(expense.tutar)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Aksiyon Butonları */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={CommonStyles.menuButton}
            onPress={() => navigation.navigate('HarcamaEkle', { houseId, houseName })}
            activeOpacity={0.8}
          >
            <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.success.background }]}>
              <Text style={CommonStyles.buttonIcon}>➕</Text>
              <Text style={CommonStyles.buttonText}>Harcama Ekle</Text>
              <Text style={CommonStyles.buttonSubtext}>Yeni harcama kaydı</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={CommonStyles.menuButton}
            onPress={() => navigation.navigate('HarcamaListesi', { houseId, houseName })}
            activeOpacity={0.8}
          >
            <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background }]}>
              <Text style={CommonStyles.buttonIcon}>📋</Text>
              <Text style={CommonStyles.buttonText}>Tüm Harcamalar</Text>
              <Text style={CommonStyles.buttonSubtext}>Detaylı liste görüntüle</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={CommonStyles.menuButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.neutral.background }]}>
            <Text style={CommonStyles.buttonIcon}>🔙</Text>
            <Text style={CommonStyles.buttonText}>Geri Dön</Text>
            <Text style={CommonStyles.buttonSubtext}>Önceki sayfaya dön</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default HouseSpendingOverviewScreen;

function makeStyles(theme) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    statItem: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 16, backgroundColor: theme.colors.primary[50], borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary[200] },
    statValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary[700], marginBottom: 4 },
    statLabel: { fontSize: 14, color: theme.colors.text.secondary, textAlign: 'center' },
    expenseIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    expenseIconText: { fontSize: 20 },
    expenseAmount: { alignItems: 'flex-end' },
    amountText: { fontSize: 16, fontWeight: 'bold' },
    actionButtons: { gap: 12, marginBottom: 20 },
  });
}
