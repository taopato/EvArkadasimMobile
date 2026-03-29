// src/screens/PaymentApprovalScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { paymentsApi } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { getScrollPosition, setScrollPosition } from '../shared/state/scrollPositions';

// Para formatlaması - Türk Lirası standardı
const fmt = (n) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(n || 0));
};

const PaymentApprovalScreen = ({ route }) => {
  const { houseId } = route.params || {};
  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingIdSet, setPendingIdSet] = useState(new Set());
  const flatListRef = useRef(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await paymentsApi.getPendingPayments(Number(user.id));
      const arr = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
      const filtered = houseId ? arr.filter(x => Number(x?.houseId) === Number(houseId)) : arr;
      setList(filtered);
    } catch (e) {
      console.error('Pending payments load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    load();
    const key = `PaymentApprovalScreen:${houseId ?? 'all'}`;
    const offset = getScrollPosition(key);
    if (offset && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset?.({ offset, animated: false });
      });
    }
  }, [user?.id, houseId]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  const approve = async (paymentId) => {
    const prevList = list;
    setPendingIdSet(new Set([...pendingIdSet, paymentId]));
    setList((curr) => curr.filter((x) => x?.id !== paymentId));
    try {
      await paymentsApi.approvePayment(paymentId);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      Alert.alert('Onaylandı', 'Ödeme onaylandı.');
    } catch (e) {
      setList(prevList);
      console.error('approve error', e);
      Alert.alert('Hata', e?.response?.data?.message || e.message);
    } finally {
      setPendingIdSet((s) => { const n = new Set(s); n.delete(paymentId); return n; });
    }
  };

  const reject = async (paymentId) => {
    const prevList = list;
    setPendingIdSet(new Set([...pendingIdSet, paymentId]));
    setList((curr) => curr.filter((x) => x?.id !== paymentId));
    try {
      await paymentsApi.rejectPayment(paymentId);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      Alert.alert('Reddedildi', 'Ödeme reddedildi.');
    } catch (e) {
      setList(prevList);
      console.error('reject error', e);
      Alert.alert('Hata', e?.response?.data?.message || e.message);
    } finally {
      setPendingIdSet((s) => { const n = new Set(s); n.delete(paymentId); return n; });
    }
  };

  const renderItem = ({ item }) => {
    const from = item?.payerUserName || item?.borcluUserName || 'Ödeyen';
    const to = item?.toUserName || item?.alacakliUserName || 'Alacaklı';
    const amount = item?.amount ?? item?.tutar ?? 0;
    const isPending = pendingIdSet.has(item?.id);

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.neutral?.[200] }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>{from} → {to}</Text>
          <Text style={[styles.amount, { color: theme.colors.text.primary }]}>{fmt(amount)}</Text>
        </View>
        <Text style={[styles.sub, { color: theme.colors.text.secondary }]}>Ödeme onay bekliyor</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.success?.[600] }, isPending && styles.btnDisabled]} onPress={() => !isPending && approve(item?.id)} activeOpacity={0.85} disabled={isPending}>
            <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Onayla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.error?.[600] }, isPending && styles.btnDisabled]} onPress={() => !isPending && reject(item?.id)} activeOpacity={0.85} disabled={isPending}>
            <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Reddet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.header, { color: theme.colors.text.primary }]}>Ödeme Onayları</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary?.[500]} /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={list}
          keyExtractor={(it, idx) => String(it?.id ?? idx)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onScroll={(e) => {
            const key = `PaymentApprovalScreen:${houseId ?? 'all'}`;
            setScrollPosition(key, e.nativeEvent.contentOffset.y || 0);
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.text.secondary }]}>Bekleyen ödeme bulunamadı.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 24 },

  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { marginTop: 4, fontSize: 12 },
  amount: { fontWeight: '800', marginLeft: 8 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: '700' },
});

export default PaymentApprovalScreen;
