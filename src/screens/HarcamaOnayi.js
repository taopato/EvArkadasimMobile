import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { expensesApi } from '../services/api';

const formatAmount = (n) =>
  `${Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

const formatDate = (iso) => {
  if (!iso) return 'Tarih yok';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'Geçersiz tarih' : d.toLocaleDateString('tr-TR');
};

export default function ExpenseApprovalScreen({ navigation, route }) {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!houseId) {
      Alert.alert('Hata', 'Ev bilgisi eksik.');
      navigation.goBack();
      return;
    }
    fetchExpenses();
  }, [houseId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // ✅ Tek doğru rota: /Expenses/GetExpenses/{houseId}
      const res = await expensesApi.getByHouse(Number(houseId));
      const body = res?.data?.data ?? res?.data ?? [];
      setExpenses(Array.isArray(body) ? body : []);
    } catch (error) {
      console.error('Harcama listesi hatası:', error);
      Alert.alert('Hata', 'Harcamalar alınırken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleExpensePress = (expense) => {
    navigation.navigate('HarcamaDetayi', {
      expenseId: expense.id,
      houseId,
      houseName,
    });
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={CommonStyles.loadingText}>Harcamalar yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Harcama Onayları</Text>
          <Text style={CommonStyles.subtitle}>
            {houseName || 'Ev'} • {expenses.length} harcama
          </Text>
        </View>

        <TouchableOpacity
          style={CommonStyles.menuButton}
          onPress={() => navigation.navigate('HarcamaEkle', { houseId, houseName })}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.success.background }]}>
            <Text style={CommonStyles.buttonIcon}>➕</Text>
            <Text style={CommonStyles.buttonText}>Yeni Harcama Ekle</Text>
            <Text style={CommonStyles.buttonSubtext}>Yeni harcama kaydı oluşturun</Text>
          </View>
        </TouchableOpacity>

        {expenses.length > 0 ? (
          <View style={CommonStyles.listContainer}>
            {expenses.map((expense) => (
              <TouchableOpacity
                key={String(expense.id)}
                style={CommonStyles.listItem}
                onPress={() => handleExpensePress(expense)}
                activeOpacity={0.8}
              >
                <View style={styles.expenseIconContainer}>
                  <Text style={styles.expenseIcon}>💰</Text>
                </View>
                <View style={CommonStyles.listItemContent}>
                  <Text style={CommonStyles.listItemTitle}>{expense.tur || 'Harcama'}</Text>
                  <Text style={CommonStyles.listItemSubtitle}>
                    Ödeyen: {expense.odeyenUser?.fullName || expense.payerName || 'Bilinmeyen'}
                  </Text>
                  <Text style={CommonStyles.listItemSubtitle}>
                    Kaydeden: {expense.kaydedenUser?.fullName || expense.creatorName || 'Bilinmeyen'}
                  </Text>
                  <Text style={CommonStyles.listItemSubtitle}>Tarih: {formatDate(expense.createdAt)}</Text>
                </View>
                <View style={styles.expenseAmount}>
                  <Text style={[styles.amountText, { color: theme.colors.primary[600] }]}>
                    {formatAmount(expense.tutar)}
                  </Text>
                  <View style={styles.statusContainer}>
                    <Text style={[styles.statusText, { color: theme.colors.success[600] }]}>✅ Onaylandı</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={CommonStyles.emptyContainer}>
            <Text style={CommonStyles.emptyIcon}>📋</Text>
            <Text style={CommonStyles.emptyText}>Henüz harcama bulunmamaktadır.</Text>
            <Text style={CommonStyles.emptyText}>
              İlk harcamanızı eklemek için yukarıdaki butona tıklayın.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    expenseIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    expenseIcon: { fontSize: 24 },
    expenseAmount: { alignItems: 'flex-end' },
    amountText: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    statusContainer: { alignItems: 'center' },
    statusText: { fontSize: 12, fontWeight: '600' },
  });
}
