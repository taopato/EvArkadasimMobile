import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expensesApi } from '../services/api';
import {
  getCategoryDisplayName,
  getCategoryIconName,
  normalizeExpenseCategoryKey,
} from '../constants/ExpenseEnums';
import { useTheme } from '../shared/theme/ThemeProvider';
import { shadow } from '../shared/ui/shadow';
import Toast from '../components/Toast';

const formatAmount = (amount) => new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
}).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return 'Belirtilmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belirtilmedi';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const inferCategory = (bill) => {
  const mapped = normalizeExpenseCategoryKey(bill?.category);
  if (mapped && mapped !== 'Other') return mapped;
  const text = `${bill?.tur || ''} ${bill?.description || ''}`.toLocaleLowerCase('tr-TR');
  if (text.includes('elektrik')) return 'Electricity';
  if (/(doğalgaz|dogalgaz|gaz)/.test(text)) return 'Gas';
  if (text.includes('internet')) return 'Internet';
  if (text.includes('kira')) return 'Rent';
  if (/(^|\s)su(\s|$)/.test(text)) return 'Water';
  return mapped || 'Other';
};

const DetailRow = ({ icon, label, value, styles, theme, last }) => (
  <View style={[styles.detailRow, last && styles.detailRowLast]}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={18} color={theme.colors.primary[600]} />
    </View>
    <View style={styles.detailBody}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

export default function FaturaDetayi({ route, navigation }) {
  const { billId, houseId, houseName } = route?.params || {};
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const load = useCallback(async (silent = false) => {
    if (!billId) {
      setToast({ visible: true, message: 'Fatura bilgisi bulunamadı.', type: 'error' });
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const response = await expensesApi.getById(billId);
      const data = response?.data?.data ?? response?.data;
      setBill(data || null);
    } catch (error) {
      setToast({
        visible: true,
        message: error?.response?.data?.message || 'Fatura detayları yüklenemedi.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [billId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = () => Alert.alert(
    'Faturayı sil',
    'Bu fatura ve ona bağlı borç dağılımı silinecek. Bu işlem geri alınamaz.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await expensesApi.remove(billId);
            try {
              const bus = (await import('../shared/events/bus')).default;
              bus.emit('expenses:updated', { houseId });
            } catch {}
            navigation.goBack();
          } catch (error) {
            setToast({
              visible: true,
              message: error?.response?.data?.message || 'Fatura silinemedi.',
              type: 'error',
            });
          } finally {
            setDeleting(false);
          }
        },
      },
    ]
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Geri" style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={25} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fatura Detayı</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Text style={styles.loadingText}>Fatura yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Geri" style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={25} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fatura Detayı</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="document-text-outline" size={42} color={theme.colors.text.disabled} />
          <Text style={styles.emptyTitle}>Fatura bulunamadı</Text>
        </View>
      </View>
    );
  }

  const category = inferCategory(bill);
  const title = getCategoryDisplayName(category);
  const icon = getCategoryIconName(category);
  const billDate = bill.dueDate || bill.postDate || bill.kayitTarihi || bill.createdDate;
  const note = bill.note || bill.description;
  const isGenericNote = !note || String(note).trim() === String(bill.tur || '').trim();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Geri" style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={25} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fatura Detayı</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            colors={[theme.colors.primary[600]]}
          />
        )}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name={icon} size={24} color={theme.colors.text.onPrimary} />
            </View>
            <View style={styles.heroIdentity}>
              <Text style={styles.heroTitle}>{title} Faturası</Text>
              <Text style={styles.heroSubtitle} numberOfLines={1}>{houseName || 'Aktif ev'}</Text>
            </View>
          </View>
          <Text style={styles.amount}>{formatAmount(bill.tutar ?? bill.amount)}</Text>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={15} color={theme.colors.primary[100]} />
            <Text style={styles.datePillText}>{formatDate(billDate)}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Fatura bilgileri</Text>
          <DetailRow icon="receipt-outline" label="Fatura türü" value={title} styles={styles} theme={theme} />
          <DetailRow icon="person-outline" label="Ödemeyi yapan" value={bill.odeyenKullaniciAdi || 'Belirtilmedi'} styles={styles} theme={theme} />
          <DetailRow icon="create-outline" label="Kaydı oluşturan" value={bill.kaydedenKullaniciAdi || 'Belirtilmedi'} styles={styles} theme={theme} />
          <DetailRow icon="calendar-number-outline" label="Kayıt tarihi" value={formatDate(bill.kayitTarihi || bill.createdDate)} styles={styles} theme={theme} last />
        </View>

        {!isGenericNote && (
          <View style={styles.noteCard}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.colors.success[600]} />
            <View style={styles.noteBody}>
              <Text style={styles.noteLabel}>Not</Text>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('FaturaEkle', {
              billId,
              houseId: houseId || bill.houseId,
              houseName,
              isEditing: true,
            })}
            activeOpacity={0.88}
          >
            <Ionicons name="create-outline" size={19} color={theme.colors.text.onPrimary} />
            <Text style={styles.editButtonText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={remove}
            disabled={deleting}
            activeOpacity={0.88}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={theme.colors.error[700]} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={19} color={theme.colors.error[700]} />
                <Text style={styles.deleteButtonText}>Sil</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    minHeight: 56 + insets.top,
    paddingTop: insets.top,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text.primary, fontSize: 19, fontWeight: '800' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: theme.colors.text.secondary, marginTop: 12 },
  emptyTitle: { color: theme.colors.text.primary, fontSize: 17, fontWeight: '700', marginTop: 12 },
  content: { padding: 18, paddingBottom: insets.bottom + 36 },
  heroCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.primary[900],
    padding: 18,
    marginBottom: 14,
    ...shadow(2, 'rgba(10,29,45,0.22)'),
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  heroIdentity: { flex: 1, marginLeft: 12 },
  heroTitle: { color: theme.colors.text.onPrimary, fontSize: 17, fontWeight: '800' },
  heroSubtitle: { color: theme.colors.primary[200], fontSize: 13, marginTop: 2 },
  amount: { color: theme.colors.text.onPrimary, fontSize: 34, fontWeight: '800', marginTop: 22 },
  datePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  datePillText: { color: theme.colors.primary[100], fontSize: 13, fontWeight: '600' },
  detailCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  sectionTitle: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  detailRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100] },
  detailRowLast: { borderBottomWidth: 0 },
  detailIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50] },
  detailBody: { flex: 1, marginLeft: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  detailLabel: { color: theme.colors.text.secondary, fontSize: 13 },
  detailValue: { flex: 1, color: theme.colors.text.primary, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    backgroundColor: theme.colors.success[50],
    borderWidth: 1,
    borderColor: theme.colors.success[100],
    padding: 14,
    marginBottom: 12,
  },
  noteBody: { flex: 1, marginLeft: 10 },
  noteLabel: { color: theme.colors.success[700], fontSize: 12, fontWeight: '800' },
  noteText: { color: theme.colors.text.primary, fontSize: 14, lineHeight: 20, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[900],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  editButtonText: { color: theme.colors.text.onPrimary, fontSize: 14, fontWeight: '800' },
  deleteButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.error[50],
    borderWidth: 1,
    borderColor: theme.colors.error[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteButtonText: { color: theme.colors.error[700], fontSize: 14, fontWeight: '800' },
});
