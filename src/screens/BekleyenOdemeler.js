// src/screens/PendingPaymentsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { paymentsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';

const PendingPaymentsScreen = ({ route }) => {
  const { user } = useAuth();
  const { userId: routeUserId } = route.params || {};
  const userId = routeUserId || user?.id;
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await paymentsApi.getPendingPayments(userId);
      const data = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      // basit ekran
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const doAction = async (id, type) => {
    try {
      setActionId(id);
      if (type === 'approve') {
        await paymentsApi.approve(id);
        Alert.alert('Onaylandı', 'Ödeme onaylandı.');
      } else {
        await paymentsApi.reject(id);
        Alert.alert('Reddedildi', 'Ödeme reddedildi.');
      }
      await load();
    } catch (e) {
      Alert.alert('Hata', e?.response?.data?.message || e?.message || 'İşlem başarısız');
    } finally { setActionId(null); }
  };

  const renderItem = ({ item }) => {
    const amount = Number(item.tutar ?? item.amount ?? 0);
    const date = item.odemeTarihi || item.date || item.createdAt;
    const fromName = item.borcluUserName || item.payerName || item.borcluKullaniciAdi || '-';
    const toName = item.alacakliUserName || item.toUserName || item.alacakliKullaniciAdi || user?.fullName || 'Siz';
    const id = item.id ?? item.paymentId;

    const isBusy = actionId === id;

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>{fromName} ➜ {toName}</Text>
        <Text style={[styles.sub, { color: theme.colors.text.secondary }]}>{date ? new Date(date).toLocaleString('tr-TR') : '-'}</Text>
        <Text style={[styles.amount, { color: theme.colors.text.primary }]}>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}</Text>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.success?.[600] }]} onPress={() => doAction(id, 'approve')} activeOpacity={0.85} disabled={isBusy}>
            {isBusy ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Onayla</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.error?.[600] }]} onPress={() => doAction(id, 'reject')} activeOpacity={0.85} disabled={isBusy}>
            {isBusy ? <ActivityIndicator color={theme.colors.text.onPrimary} /> : <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Reddet</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(x, i) => String(x.id ?? x.paymentId ?? i)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary?.[600]} colors={[theme.colors.primary?.[600]]} progressBackgroundColor={theme.colors.surface} />}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={<Text style={[styles.header, { color: theme.colors.text.primary }]}>Bekleyen Ödemeler</Text>}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>Bekleyen ödeme yok</Text>
            <Text style={[styles.empty, { color: theme.colors.text.secondary }]}>Onay bekleyen transferler burada görünecek.</Text>
          </View>
        ) : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 20, fontWeight: '900', paddingHorizontal: 12, paddingBottom: 6 },
  card: { borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  title: { fontWeight: '900' },
  sub: { marginTop: 2 },
  amount: { fontWeight: '900', marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnText: { fontWeight: '900' },
  emptyWrap: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  empty: { textAlign: 'center', padding: 24 },
});

export default PendingPaymentsScreen;
