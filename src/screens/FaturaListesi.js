import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { expensesApi } from '../services/api';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import Toast from '../components/Toast';

const CATEGORY_ID_TO_KEY = {
  0: 'Rent',
  1: 'Internet',
  2: 'Electricity',
  3: 'Water',
  4: 'Gas',
  5: 'Other',
  99: 'Other',
};
const BILL_KEYS = ['Water', 'Electricity', 'Rent', 'Gas', 'Internet', 'Other'];

const mapRouteToBillKey = ({ utilityType, categoryName }) => {
  if (typeof utilityType === 'number') {
    const map = { 1: 'Rent', 2: 'Electricity', 3: 'Water', 4: 'Gas', 5: 'Internet' };
    return map[utilityType] || null;
  }
  if (typeof utilityType === 'string') {
    const t = utilityType.toLowerCase();
    if (/rent|kira/.test(t)) return 'Rent';
    if (/elektrik|electricity/.test(t)) return 'Electricity';
    if (/su|water/.test(t)) return 'Water';
    if (/doğalgaz|dogalgaz|gas/.test(t)) return 'Gas';
    if (/internet/.test(t)) return 'Internet';
    if (/diğer|diger|other/.test(t)) return 'Other';
  }
  if (categoryName) {
    const c = String(categoryName).toLowerCase();
    if (c === 'kira' || /rent/.test(c)) return 'Rent';
    if (c === 'elektrik' || /electricity/.test(c)) return 'Electricity';
    if (c === 'su' || /water/.test(c)) return 'Water';
    if (c === 'doğalgaz' || c === 'dogalgaz' || /gas/.test(c)) return 'Gas';
    if (c === 'internet') return 'Internet';
    if (c === 'diğer' || c === 'diger' || /other/.test(c)) return 'Other';
  }
  return null;
};

const detectBillKey = (item) => {
  if (item?.category !== undefined && item?.category !== null) {
    const key = CATEGORY_ID_TO_KEY[Number(item.category)];
    if (key) return key;
  }
  const text = `${item?.tur ?? ''} ${item?.note ?? ''}`.toLowerCase();
  if (/(su|water)/.test(text)) return 'Water';
  if (/(elektrik|electricity)/.test(text)) return 'Electricity';
  if (/(kira|rent)/.test(text)) return 'Rent';
  if (/(doğalgaz|dogalgaz|gas)/.test(text)) return 'Gas';
  if (/(internet)/.test(text)) return 'Internet';
  return 'Other';
};

const billKeyToTitle = (key) =>
  ({ Water: 'Su', Electricity: 'Elektrik', Rent: 'Kira', Gas: 'Doğalgaz', Internet: 'İnternet', Other: 'Diğer' }[key] || 'Fatura');

const billKeyToIcon = (key) =>
  ({ Water: '💧', Electricity: '⚡', Rent: '🏠', Gas: '🔥', Internet: '🌐', Other: '📄' }[key] || '📄');

const formatDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d) ? '—' : d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Para formatlaması - Türk Lirası standardı
const formatAmount = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const BillListScreen = ({ route, navigation }) => {
  const { houseId, houseName, utilityType, categoryName } = route.params || {};
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const wantedKey = useMemo(() => mapRouteToBillKey({ utilityType, categoryName }), [utilityType, categoryName]);
  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast((p) => ({ ...p, visible: false }));

  const getDate = (x) =>
    x?.kayitTarihi || x?.postDate || x?.date || x?.createdDate || x?.createdAt || null;

  const isMatured = (d) => {
    const dt = new Date(d || 0);
    return dt <= new Date();
  };

  const fetchBills = async () => {
    try {
      if (!houseId) throw new Error('houseId eksik');
      setLoading(true);

      const res = await expensesApi.getByHouse(Number(houseId));
      const raw = res?.data?.data || res?.data || [];
      const arr = Array.isArray(raw) ? raw : [];

      const normalized = arr
        .map((x) => {
          const key = detectBillKey(x);
          const date = getDate(x);
          return {
            id: x?.id ?? x?.expenseId,
            title: x?.tur || `${billKeyToTitle(key)} Faturası`,
            amount: Number(x?.tutar ?? x?.amount ?? 0),
            date,
            payerName: x?.odeyenKullaniciAdi,
            billKey: key,
            parentId: x?.parentExpenseId ?? x?.ParentExpenseId ?? null,
            installmentCount: x?.installmentCount ?? x?.InstallmentCount ?? null,
          };
        })
        .filter((it) => BILL_KEYS.includes(it.billKey))
        // plan parent'ları gizle (sadece çocuklar + tek seferlikler)
        .filter((it) => !(it.parentId === null && Number(it.installmentCount || 0) > 1))
        // sadece "bugün ve öncesi"
        .filter((it) => isMatured(it.date))
        // kategori filtresi (varsa)
        .filter((it) => (wantedKey ? it.billKey === wantedKey : true))
        // sıralama: tarih DESC, id DESC
        .sort((a, b) => {
          const da = new Date(a.date || 0).getTime();
          const db = new Date(b.date || 0).getTime();
          if (db !== da) return db - da;
          return (b.id || 0) - (a.id || 0);
        });

      setBills(normalized);
    } catch (err) {
      showToast('Faturalar alınırken bir hata oluştu', 'error');
      setBills([]);
      console.error('❌ BillListScreen GetExpenses HATA:', {
        status: err?.response?.status,
        url: err?.config?.url,
        data: err?.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!houseId) {
      showToast('Geçerli parametreler bulunamadı', 'error');
      navigation.goBack?.();
      return;
    }
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseId, wantedKey]);

  useFocusEffect(
    React.useCallback(() => {
      if (houseId) fetchBills();
    }, [houseId, wantedKey])
  );

  const handleAddBill = () => {
    navigation.navigate('FaturaEkle', { houseId, houseName });
  };
  const handleBillPress = (bill) => {
    navigation.navigate('FaturaDetayi', {
      billId: bill.id,        // detay hem billId hem expenseId’yi destekliyor
      expenseId: bill.id,
      houseId,
      houseName
    });
  };

  const headerTitle = categoryName || billKeyToTitle(wantedKey) || 'Faturalar';

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
          <Text style={CommonStyles.loadingText}>Faturalar yükleniyor…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>{headerTitle} Faturaları</Text>
          <Text style={CommonStyles.subtitle}>
            {houseName} • {bills.length} kalem • (Bugün ve öncesi)
          </Text>
        </View>

        <TouchableOpacity style={CommonStyles.menuButton} onPress={handleAddBill} activeOpacity={0.8}>
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.success.background }]}>
            <Text style={CommonStyles.buttonIcon}>➕</Text>
            <Text style={CommonStyles.buttonText}>Yeni Fatura Ekle</Text>
            <Text style={CommonStyles.buttonSubtext}>Yeni {headerTitle} faturası ekleyin</Text>
          </View>
        </TouchableOpacity>

        {bills.length > 0 ? (
          <View style={CommonStyles.card}>
            {bills.map((bill, idx) => (
              <TouchableOpacity
                key={String(bill.id ?? idx)}
                style={CommonStyles.listItem}
                onPress={() => handleBillPress(bill)}
                activeOpacity={0.8}
              >
                <View style={styles.billIconContainer}>
                  <Text style={styles.billIcon}>{billKeyToIcon(bill.billKey)}</Text>
                </View>

                <View style={CommonStyles.listItemContent}>
                  <Text style={CommonStyles.listItemTitle}>{bill.title}</Text>
                  <Text style={CommonStyles.listItemSubtitle}>
                    Tarih: {formatDate(bill.date)} • Ödeyen: {bill.payerName || '—'}
                  </Text>
                </View>

                <View style={styles.billAmountBox}>
                  <Text style={styles.billAmount}>{formatAmount(bill.amount)}</Text>
                  <Text style={styles.billCat}>{billKeyToTitle(bill.billKey)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={CommonStyles.emptyContainer}>
            <Text style={CommonStyles.emptyIcon}>📄</Text>
            <Text style={CommonStyles.emptyText}>
              {headerTitle} kategorisinde (bugün ve öncesi) kalem bulunmuyor.
            </Text>
          </View>
        )}

        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    billIconContainer: {
      width: 50, height: 50, borderRadius: 25,
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
      backgroundColor: theme.colors.primary?.[100]
    },
    billIcon: { fontSize: 24 },
    billAmountBox: { alignItems: 'flex-end' },
    billAmount: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary },
    billCat: { fontSize: 12, marginTop: 2, color: theme.colors.text.secondary },
  });
}

export default BillListScreen;
