import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { expensesApi } from '../services/api';

const ChargesListScreen = ({ navigation, route }) => {
  const { houseId, houseName } = route.params || {};
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchCharges = async (isRefresh = false) => {
    if (!houseId) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await expensesApi.getByHouse(houseId);
      
      // Expenses'den planlı giderleri filtrele
      const rawExp = response?.data?.data || response?.data || [];
      const arrExp = Array.isArray(rawExp) ? rawExp : [];
      
      // Planlı giderleri filtrele (parentExpenseId olan veya kind='bill' olan)
      const chargesData = arrExp.filter((expense) => {
        const hasParent = expense.parentExpenseId || expense.ParentExpenseId;
        const isBill = expense.kind === 'bill' || expense.type === 'Regular' || expense.type === 'Installment';
        return hasParent || isBill;
      });
      
      setCharges(chargesData);
      
    } catch (error) {
      Alert.alert('Hata', 'Planlı giderler alınırken bir hata oluştu');
      setCharges([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [houseId, currentPeriod]);

  const onRefresh = () => {
    fetchCharges(true);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getChargeIcon = (type) => {
    switch (type) {
      case 'Regular': return '📅';
      case 'Installment': return '💳';
      default: return '💰';
    }
  };

  const getChargeStatusColor = (isMatured) => {
    return isMatured ? theme.colors.text.primary : theme.colors.text.secondary;
  };

  const getChargeStatusText = (isMatured) => {
    return isMatured ? 'Vadesi Geçti' : 'Beklemede';
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Planlı Giderler</Text>
          <Text style={CommonStyles.subtitle}>{houseName || ''}</Text>
        </View>
        <View style={[CommonStyles.card, { alignItems: 'center', padding: 40 }]}>
          <Text style={{ color: theme.colors.text.secondary }}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView 
        style={CommonStyles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Planlı Giderler</Text>
          <Text style={CommonStyles.subtitle}>{houseName || ''}</Text>
          <Text style={[CommonStyles.subtitle, { fontSize: 14, marginTop: 4 }]}>
            Dönem: {currentPeriod}
          </Text>
        </View>

        {charges.length === 0 ? (
          <View style={CommonStyles.card}>
            <Text style={styles.sectionTitle}>📄 Planlı Gider Bulunamadı</Text>
            <Text style={{ color: theme.colors.text.secondary }}>
              Bu dönem için planlı gider bulunmuyor. Yeni planlı gider eklemek için 
              "Yeni Planlı Gider" butonunu kullanabilirsiniz.
            </Text>
          </View>
        ) : (
          charges.map((charge, index) => (
            <TouchableOpacity 
              key={charge.expenseId || index} 
              style={CommonStyles.card}
              onPress={() => {}}
            >
              <View style={styles.chargeHeader}>
                <View style={styles.chargeTitleRow}>
                  <Text style={styles.chargeIcon}>{getChargeIcon(charge.type)}</Text>
                  <View style={styles.chargeTitleContainer}>
                    <Text style={styles.chargeTitle}>{charge.title}</Text>
                    <Text style={styles.chargePlanTitle}>{charge.planTitle}</Text>
                  </View>
                </View>
                <Text style={[styles.chargeAmount, { color: getChargeStatusColor(charge.isMatured) }]}>
                  {formatAmount(charge.tutar)}
                </Text>
              </View>
              
              <View style={styles.chargeDetails}>
                <Text style={styles.chargeDetail}>
                  📅 Vade: {formatDate(charge.postDate)}
                </Text>
                {charge.type === 'Installment' && (
                  <Text style={styles.chargeDetail}>
                    💳 Taksit: {charge.installmentIndex}/{charge.installmentCount}
                  </Text>
                )}
                <Text style={[styles.chargeStatus, { color: getChargeStatusColor(charge.isMatured) }]}>
                  {getChargeStatusText(charge.isMatured)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity 
          style={CommonStyles.menuButton} 
          onPress={() => navigation.navigate('NewRecurringCharge', { houseId, houseName })}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background }]}>
            <Text style={CommonStyles.buttonIcon}>➕</Text>
            <Text style={CommonStyles.buttonText}>Yeni Planlı Gider</Text>
            <Text style={CommonStyles.buttonSubtext}>Kira, internet, taksitli gider ekle</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={CommonStyles.menuButton} 
          onPress={() => navigation.navigate('PaymentApproval', { houseId, houseName })}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.warning.background }]}>
            <Text style={CommonStyles.buttonIcon}>⏳</Text>
            <Text style={CommonStyles.buttonText}>Bekleyen Katkılar</Text>
            <Text style={CommonStyles.buttonSubtext}>Onay bekleyen ödemeleri gör</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
    chargeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    chargeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    chargeIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    chargeTitleContainer: {
      flex: 1,
    },
    chargeTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 2 },
    chargePlanTitle: { fontSize: 14, color: theme.colors.text.secondary },
    chargeAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'right',
    },
    chargeDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    chargeDetail: { fontSize: 12, color: theme.colors.text.secondary, marginRight: 12 },
    chargeStatus: {
      fontSize: 12,
      fontWeight: 'bold',
    },
  });
}

export default ChargesListScreen;


