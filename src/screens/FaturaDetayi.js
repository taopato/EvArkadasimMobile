// src/screens/BillDetailScreen.js
import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { expensesApi } from '../services/api';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import Toast from '../components/Toast';

// basit TR tarih
const formatDate = (dateString) => {
  if (!dateString) return 'Tarih yok';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('tr-TR');
  } catch { return 'Geçersiz tarih'; }
};

// ₺ format
const formatAmount = (amount) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount || 0));

// tur metninden kategori tahmini
const textToKey = (text = '') => {
  const t = String(text).toLowerCase();
  if (/(elektrik|electric)/.test(t)) return 'Electricity';
  if (/(su|water)/.test(t)) return 'Water';
  if (/(doğalgaz|dogalgaz|gaz|gas)/.test(t)) return 'Gas';
  if (/(internet)/.test(t)) return 'Internet';
  if (/(kira|rent)/.test(t)) return 'Rent';
  return 'Other';
};

const getUtilityTypeName = (key) => ({
  'Rent': 'Kira',
  'Electricity': 'Elektrik',
  'Water': 'Su',
  'Gas': 'Doğalgaz',
  'Internet': 'İnternet',
  'Market': 'Market',
  'Food': 'Yemek',
  'Other': 'Diğer'
}[key] || 'Diğer');

const getUtilityIcon = (key) => ({
  'Rent': 'home-outline',
  'Electricity': 'flash-outline',
  'Water': 'water-outline',
  'Gas': 'flame-outline',
  'Internet': 'wifi-outline',
  'Market': 'cart-outline',
  'Food': 'restaurant-outline',
  'Other': 'document-text-outline'
}[key] || 'document-text-outline');

const BillDetailScreen = ({ route, navigation }) => {
  const { billId, houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    if (!billId) {
      showToast('Fatura ID bulunamadı', 'error');
      navigation.goBack();
      return;
    }
    fetchBillDetails();
  }, [billId]);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      const response = await expensesApi.getById(billId);
      // BE: { isSuccess, data }
      const data = response?.data?.data ?? response?.data ?? null;
      if (data) setBill(data);
      else showToast('Fatura detayları alınamadı', 'error');
    } catch (error) {
      console.error('Fatura detayları hatası:', error);
      showToast('Fatura detayları yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Görsel/isim için key çıkar
  const key = bill ? textToKey(bill.tur || bill.category || '') : 'Other';
  const icon = getUtilityIcon(key);
  const displayName = getUtilityTypeName(key);

  // Dönem: kayitTarihi → YYYY-MM
  const period = bill?.kayitTarihi
    ? `${new Date(bill.kayitTarihi).getFullYear()}-${String(new Date(bill.kayitTarihi).getMonth()+1).padStart(2,'0')}`
    : '';

  // Taksit/Recurring bilgisi
  const idx = bill?.installmentIndex || bill?.InstallmentIndex || null;
  const cnt = bill?.installmentCount || bill?.InstallmentCount || null;
  const dueDay = bill?.dueDay || bill?.DueDay || null;

  const handleDeleteBill = () => {
    Alert.alert(
      'Faturayı Sil',
      'Bu faturayı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesApi.remove(billId);
              showToast('Fatura başarıyla silindi', 'success');
              navigation.goBack();
            } catch (error) {
              console.error('Fatura silme hatası:', error);
              showToast('Fatura silinirken bir hata oluştu', 'error');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={CommonStyles.loadingText}>Fatura detayları yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.colors.text.secondary} style={{ marginBottom: 8 }} />
          <Text style={CommonStyles.emptyText}>Fatura bulunamadı</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Fatura Detayı</Text>
          <Text style={CommonStyles.subtitle}>
            {houseName} • {displayName}
          </Text>
        </View>

        {/* Bilgiler */}
        <View style={styles.billInfoContainer}>
          <View style={styles.billHeader}>
            <View style={styles.billIconContainer}>
              <Ionicons name={icon} size={28} color={theme.colors.primary[600]} />
            </View>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billTitle}>
                {bill.tur || `${displayName} Faturası`}
              </Text>
              {!!idx && !!cnt && (
                <Text style={[styles.statusText, { color: (theme.colors.primary?.[600] ?? theme.colors.text.secondary) }]}>
                  {`Taksit ${idx}/${cnt}`}
                </Text>
              )}
              {!idx && !!dueDay && (
                <Text style={[styles.statusText, { color: (theme.colors.primary?.[600] ?? theme.colors.text.secondary) }]}>
                  {`Vade günü: ${dueDay}`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tutar:</Text>
            <Text style={styles.detailValue}>{formatAmount(bill.amount ?? bill.tutar)}</Text>
          </View>

          {!!bill.kayitTarihi && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kayıt Tarihi:</Text>
              <Text style={styles.detailValue}>{formatDate(bill.kayitTarihi)}</Text>
            </View>
          )}

          {!!period && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dönem:</Text>
              <Text style={styles.detailValue}>{period}</Text>
            </View>
          )}

          {!!dueDay && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vade Günü:</Text>
              <Text style={styles.detailValue}>{dueDay}</Text>
            </View>
          )}

          {!!bill.planStartMonth && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan Başlangıcı:</Text>
              <Text style={styles.detailValue}>{formatDate(bill.planStartMonth)}</Text>
            </View>
          )}

          {!!bill.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Not:</Text>
              <Text style={styles.detailValue}>{bill.description}</Text>
            </View>
          )}
        </View>

        {/* İşlem Butonları */}
        <View style={styles.actionButtons}>
          {/* Düzenle ekranı sende farklıysa route adını değiştir */}
          <TouchableOpacity
            style={[CommonStyles.menuButton, { flex: 1, marginRight: 8 }]}
            onPress={() => {
              navigation.navigate('FaturaEkle', {
                billId,
                houseId,
                houseName,
                isEditing: true
              });
            }}
            activeOpacity={0.8}
          >
            <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background }]}>
              <Ionicons name="create-outline" size={22} color={ColorThemes.primary.foreground} style={{ marginBottom: 4 }} />
              <Text style={CommonStyles.buttonText}>Düzenle</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[CommonStyles.menuButton, { flex: 1, marginLeft: 8 }]}
            onPress={handleDeleteBill}
            activeOpacity={0.8}
          >
            <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.error.background }]}>
              <Ionicons name="trash-outline" size={22} color={ColorThemes.error.foreground} style={{ marginBottom: 4 }} />
              <Text style={CommonStyles.buttonText}>Sil</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    billInfoContainer: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
    billHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    billIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.primary[100], justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    billIcon: { fontSize: 28 },
    billTitleContainer: { flex: 1 },
    billTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 4 },
    statusText: { fontSize: 14, fontWeight: '600' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100] },
    detailLabel: { fontSize: 14, color: theme.colors.text.secondary, fontWeight: '500' },
    detailValue: { fontSize: 14, color: theme.colors.text.primary, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 },
    actionButtons: {
      flexDirection: 'row',
      marginBottom: 16,
    },
  });
}

export default BillDetailScreen;
