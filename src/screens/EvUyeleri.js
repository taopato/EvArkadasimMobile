import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import useScrollRestore from '../hooks/useScrollRestore';
import { useAuth } from '../context/AuthContext';
import { houseApi, expensesApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import Toast from '../components/Toast';
import { useTheme } from '../shared/theme/ThemeProvider';

const HouseMembersScreen = ({ route, navigation }) => {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const { listRef, handleScroll } = useScrollRestore(`HouseMembersScreen:${houseId ?? 'all'}`);
  const { theme } = useTheme();
  const CommonStyles = useCommonStyles();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  
  // KPI verileri
  const [memberCount, setMemberCount] = useState(0);
  const [monthlyBillsTotal, setMonthlyBillsTotal] = useState(0);
  const [netBalance, setNetBalance] = useState(0);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (!houseId) {
      showToast('Geçerli bir ev ID\'si bulunamadı', 'error');
      navigation.goBack();
      return;
    }
    
    fetchKPIData();
    fetchMembers();
  }, [houseId]);

  // Odaklanınca sessiz, hızlı yenileme (donma hissini azaltmak için loading spinner yok)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchKPIData();
      // üyeleri sessiz yenile (loading bayrağını değiştirme)
      (async () => {
        try {
          const prev = friends;
          const membersResponse = await houseApi.getMembers(houseId);
          if (membersResponse.data && Array.isArray(membersResponse.data)) {
            const members = membersResponse.data;
            const membersWithDebts = await Promise.all(
              members.map(async (member) => {
                try {
                  const userId = member.userId || member.id;
                  const debtResponse = await houseApi.getUserDebts(userId, houseId);
                  const debtData = debtResponse.data;
                  const netBalance = debtData.netBalance || 0;
                  const pairwise = debtData.pairwise || [];
                  let debtStatus = 'Nötr';
                  if (netBalance > 0) debtStatus = 'Alacaklı';
                  else if (netBalance < 0) debtStatus = 'Borçlu';
                  return { id: userId, fullName: member.name || member.fullName || 'İsimsiz Kullanıcı', email: member.email, debtStatus, balance: netBalance, pairwise };
                } catch {
                  return { id: member.userId || member.id, fullName: member.name || member.fullName || 'İsimsiz Kullanıcı', email: member.email, debtStatus: 'Nötr', balance: 0, pairwise: [] };
                }
              })
            );
            // yalnız içerik farklıysa setState yap (gereksiz yeniden çizim/yüklenme hissini azaltır)
            const prevKey = JSON.stringify(prev);
            const nextKey = JSON.stringify(membersWithDebts);
            if (prevKey !== nextKey) setFriends(membersWithDebts);
          }
        } catch {}
      })();
    });

    return unsubscribe;
  }, [navigation, houseId, friends]);

  const fetchKPIData = async () => {
    try {
      const membersResponse = await houseApi.getMembers(houseId);
      const members = membersResponse.data || [];
      setMemberCount(members.length);
      
      const expensesResponse = await expensesApi.getByHouse(houseId);
      const expenses = expensesResponse.data?.data || expensesResponse.data || [];
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      const monthlyBills = expenses.filter(expense => {
        const expenseDate = new Date(expense.kayitTarihi || expense.postDate || expense.date || expense.createdDate);
        const isChild = expense.parentExpenseId || expense.ParentExpenseId;
        const hasPlanSignals = expense.installmentCount > 1 || expense.dueDay || expense.planStartMonth;
        
        return isChild && 
               expenseDate >= monthStart && 
               expenseDate < monthEnd && 
               expenseDate <= now;
      });
      
      const billsTotal = monthlyBills.reduce((sum, bill) => sum + (Number(bill.tutar) || Number(bill.amount) || 0), 0);
      setMonthlyBillsTotal(billsTotal);
      
      if (user?.id) {
        const debtResponse = await houseApi.getUserDebts(user.id, houseId);
        const debtData = debtResponse.data?.data || debtResponse.data || {};
        if (debtData.totals && Array.isArray(debtData.totals)) {
          const myTotal = debtData.totals.find(t => Number(t.userId) === Number(user.id));
          setNetBalance(Number(myTotal?.net) || 0);
        } else {
          setNetBalance(Number(debtData.netDurum) || 0);
        }
      }
      
    } catch (error) {
      console.error('KPI verileri yüklenirken hata:', error);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const membersResponse = await houseApi.getMembers(houseId);
      
      if (membersResponse.data && Array.isArray(membersResponse.data)) {
        const members = membersResponse.data;
        
        const membersWithDebts = await Promise.all(
          members.map(async (member) => {
            try {
              const userId = member.userId || member.id;
              const debtResponse = await houseApi.getUserDebts(userId, houseId);
              
              const debtData = debtResponse.data;
              const netBalance = debtData.netBalance || 0;
              const pairwise = debtData.pairwise || [];
              
              let debtStatus = 'Nötr';
              if (netBalance > 0) {
                debtStatus = 'Alacaklı';
              } else if (netBalance < 0) {
                debtStatus = 'Borçlu';
              }
              
              return {
                id: userId,
                fullName: member.name || member.fullName || 'İsimsiz Kullanıcı',
                email: member.email,
                debtStatus: debtStatus,
                balance: netBalance,
                pairwise: pairwise
              };
            } catch (error) {
              console.error(`${member.name} için borç/alacak bilgisi alınamadı:`, error);
              return {
                id: member.userId || member.id,
                fullName: member.name || member.fullName || 'İsimsiz Kullanıcı',
                email: member.email,
                debtStatus: 'Nötr',
                balance: 0,
                pairwise: []
              };
            }
          })
        );
        
        setFriends(membersWithDebts);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('API Hatası:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (balance) => {
    if (balance > 0) {
      return `Alacağı: ${balance.toFixed(0)} ₺`;
    } else if (balance < 0) {
      return `Borcu: ${Math.abs(balance).toFixed(0)} ₺`;
    } else {
      return '';
    }
  };

  const getStatusColor = (balance) => {
    if (balance > 0) return theme.colors.success?.[600];
    if (balance < 0) return theme.colors.error?.[600];
    return theme.colors.neutral?.[600];
  };

  const handleCategoryPress = (utilityType, categoryName) => {
    navigation.navigate('FaturaListesi', {
      houseId: houseId,
      houseName: houseName,
      utilityType: utilityType,
      categoryName: categoryName
    });
  };

  const handleAddExpense = () => {
    navigation.navigate('HarcamaEkle', {
      houseId: houseId,
      houseName: houseName
    });
  };

  const handleMemberPress = (member) => {
    if (user && user.id === member.id) {
      showToast('Kendi hesabınızı görüntüleyemezsiniz', 'info');
      return;
    }
    navigation.navigate('AlacakBorcIcmi', { 
      houseId, 
      userId: member.id,
      userName: member.fullName
    });
  };

  if (loading) {
    return (
      <View style={[CommonStyles.container, { backgroundColor: theme.colors.background }]}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
          <Text style={[CommonStyles.loadingText, { color: theme.colors.text.secondary }]}>Ev arkadaşları yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[CommonStyles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={[CommonStyles.content, { backgroundColor: theme.colors.background }]} ref={listRef} onScroll={handleScroll} scrollEventThrottle={16}>
        <View style={CommonStyles.header}>
          <Text style={[CommonStyles.title, { color: theme.colors.text.primary }]}>{houseName || 'Ev'}</Text>
        </View>

        {/* KPI Özet Bloğu */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
              <Text style={[styles.kpiLabel, { color: theme.colors.text.secondary }]}>Üye Sayısı</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text.primary }]}>{memberCount}</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
              <Text style={[styles.kpiLabel, { color: theme.colors.text.secondary }]}>Bu Ay Faturalar</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.info?.[600] || theme.colors.text.primary }]}>{monthlyBillsTotal.toFixed(0)} ₺</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
              <Text style={[styles.kpiLabel, { color: theme.colors.text.secondary }]}>Net Denge</Text>
              <Text style={[styles.kpiValue, { color: netBalance >= 0 ? theme.colors.success?.[600] : theme.colors.error?.[600] }]}>
                {netBalance.toFixed(0)} ₺
              </Text>
            </View>
          </View>
        </View>

        {/* Ev Arkadaşları Listesi */}
        <View style={[CommonStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 10, color: theme.colors.text.primary }]}>👥 Ev Arkadaşları</Text>
          <View style={CommonStyles.listContainer}>
            {friends.map((item) => {
              const isCurrentUser = user && user.id === item.id;
              const statusColor = getStatusColor(item.balance);
              const statusText = getStatusText(item.balance);

              return (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={[
                    CommonStyles.listItem,
                    isCurrentUser && [styles.currentUserCard, { borderColor: theme.colors.primary?.[300] }]
                  ]}
                  onPress={() => handleMemberPress(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatarContainer, { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: theme.colors.primary?.[500] }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.text.onPrimary }]}>
                      {item.fullName ? item.fullName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={CommonStyles.listItemContent}>
                    <Text style={[CommonStyles.listItemTitle, { fontSize: 14, color: theme.colors.text.primary }]}>
                      {item.fullName} {isCurrentUser && '(Siz)'}
                    </Text>
                    <Text style={[CommonStyles.listItemSubtitle, { fontSize: 11, color: theme.colors.text.secondary }]} numberOfLines={1}>{item.email || 'E-posta yok'}</Text>
                  </View>
                  {statusText ? (
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.balanceText, { color: statusColor, fontSize: 12 }]}>
                        {statusText}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ev Detayı Grid */}
        <View style={[CommonStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>🏠 Ev Detayı</Text>
          <View style={[styles.categoriesGrid, { gap: 10 }]}>
            <TouchableOpacity 
              style={[CommonStyles.menuButton, { flex: 1, minWidth: '48%' }]}
              onPress={() => navigation.navigate('BillsOverviewScreen', { houseId, houseName })}
              activeOpacity={0.8}
            >
              <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.pastel?.blue?.bg || theme.colors.surface, borderWidth: 1, borderColor: 'transparent', padding: 12 }]}>
                <Text style={CommonStyles.buttonIcon}>📄</Text>
                <Text style={[CommonStyles.buttonText, { fontSize: 14, color: theme.colors.pastel?.blue?.fg || theme.colors.text.primary }]}>Faturalar (Planlı)</Text>
                <Text style={[CommonStyles.buttonSubtext, { fontSize: 11, color: theme.colors.pastel?.blue?.fg || theme.colors.text.secondary, opacity: 0.85 }]}>Bu ay ödenecekler</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[CommonStyles.menuButton, { flex: 1, minWidth: '48%' }]}
              onPress={() => navigation.navigate('TumHarcamalar', { houseId, houseName })}
              activeOpacity={0.8}
            >
              <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.pastel?.green?.bg || theme.colors.surface, borderWidth: 1, borderColor: 'transparent', padding: 12 }]}>
                <Text style={CommonStyles.buttonIcon}>📋</Text>
                <Text style={[CommonStyles.buttonText, { fontSize: 14, color: theme.colors.pastel?.green?.fg || theme.colors.text.primary }]}>Harcamalar (Serbest)</Text>
                <Text style={[CommonStyles.buttonSubtext, { fontSize: 11, color: theme.colors.pastel?.green?.fg || theme.colors.text.secondary, opacity: 0.85 }]}>Tam hareket dökümü</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[CommonStyles.menuButton, { flex: 1, minWidth: '48%' }]}
              onPress={() => navigation.navigate('BekleyenOdemeler', { houseId, houseName })}
              activeOpacity={0.8}
            >
              <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.pastel?.orange?.bg || theme.colors.surface, borderWidth: 1, borderColor: 'transparent', padding: 12 }]}>
                <Text style={CommonStyles.buttonIcon}>⏳</Text>
                <Text style={[CommonStyles.buttonText, { fontSize: 14, color: theme.colors.pastel?.orange?.fg || theme.colors.text.primary }]}>Bekleyen İşlemler</Text>
                <Text style={[CommonStyles.buttonSubtext, { fontSize: 11, color: theme.colors.pastel?.orange?.fg || theme.colors.text.secondary, opacity: 0.85 }]}>Onay bekleyenler</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[CommonStyles.menuButton, { flex: 1, minWidth: '48%' }]}
              onPress={() => navigation.navigate('DebtSummaryScreen', { houseId, houseName })}
              activeOpacity={0.8}
            >
              <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.pastel?.pink?.bg || theme.colors.surface, borderWidth: 1, borderColor: 'transparent', padding: 12 }]}>
                <Text style={CommonStyles.buttonIcon}>💰</Text>
                <Text style={[CommonStyles.buttonText, { fontSize: 14, color: theme.colors.pastel?.pink?.fg || theme.colors.text.primary }]}>Borç–Alacak</Text>
                <Text style={[CommonStyles.buttonSubtext, { fontSize: 11, color: theme.colors.pastel?.pink?.fg || theme.colors.text.secondary, opacity: 0.85 }]}>Net bakiyeler</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[CommonStyles.menuButton, { flex: 1, minWidth: '48%' }]}
              onPress={() => navigation.navigate('HarcamaOzeti', { houseId, houseName })}
              activeOpacity={0.8}
            >
              <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.pastel?.purple?.bg || theme.colors.surface, borderWidth: 1, borderColor: 'transparent', padding: 12 }]}>
                <Text style={CommonStyles.buttonIcon}>📊</Text>
                <Text style={[CommonStyles.buttonText, { fontSize: 14, color: theme.colors.pastel?.purple?.fg || theme.colors.text.primary }]}>Analitik</Text>
                <Text style={[CommonStyles.buttonSubtext, { fontSize: 11, color: theme.colors.pastel?.purple?.fg || theme.colors.text.secondary, opacity: 0.85 }]}>Grafikler & özetler</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hızlı Ekleme Butonları */}
        <View style={styles.footerButtons}>
          <TouchableOpacity 
            style={CommonStyles.menuButton}
            onPress={() => navigation.navigate('UtilityBillCreate', { houseId, houseName })}
            activeOpacity={0.8}
          >
            <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral?.[200] }]}> 
              <Text style={[CommonStyles.buttonIcon, { color: theme.colors.text.primary }]}>➕</Text>
              <Text style={[CommonStyles.buttonText, { color: theme.colors.text.primary }]}>Düzenli Gider Ekle</Text>
              <Text style={[CommonStyles.buttonSubtext, { color: theme.colors.text.secondary }]}>Kira/abonelik ekle</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={CommonStyles.menuButton}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <View style={[CommonStyles.buttonContent, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral?.[200] }]}> 
              <Text style={[CommonStyles.buttonIcon, { color: theme.colors.text.primary }]}>🧾</Text>
              <Text style={[CommonStyles.buttonText, { color: theme.colors.text.primary }]}>Harcama Ekle</Text>
              <Text style={[CommonStyles.buttonSubtext, { color: theme.colors.text.secondary }]}>Market/Yemek vb.</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  kpiContainer: {
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  currentUserCard: {
    borderWidth: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceInfo: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
});

export default HouseMembersScreen;
