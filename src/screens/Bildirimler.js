import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { paymentsApi } from '../services/api';
import BrandMark from '../components/BrandMark';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function Bildirimler({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(async (opts = { silent: false }) => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!opts.silent) setLoading(true);
    try {
      const res = await paymentsApi.getPendingPayments(Number(user.id));
      const raw = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load({ silent: false });
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary[500]]} />}
      >
        <Text style={styles.title}>Bildirimler</Text>
        <Text style={styles.subtitle}>Onay bekleyen ödemeler ve hatırlatmalar burada listelenir.</Text>

        {items.length === 0 ? (
          <View style={[styles.emptyCard, styles.emptyState]}>
            <BrandMark variant="logo" size={170} subtle style={styles.emptyWatermark} />
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.primary[50] }]}>
              <Ionicons name="notifications-outline" size={30} color={theme.colors.primary[600]} />
            </View>
            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            <Text style={styles.emptyDesc}>Onay bekleyen bir ödeme olduğunda burada göreceksin.</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <TouchableOpacity
              key={item.id ?? index}
              style={styles.row}
              activeOpacity={0.86}
              onPress={() => navigation.navigate('BekleyenOdemeler', { userId: user?.id })}
            >
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.warning[50] }]}>
                <Ionicons name="time-outline" size={20} color={theme.colors.warning[700]} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title || item.description || 'Onay bekleyen ödeme'}
                </Text>
                <Text style={styles.rowDesc} numberOfLines={1}>
                  {formatCurrency(item.amount ?? item.tutar)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral[400]} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingBottom: 100 },
    title: { fontSize: 24, fontWeight: '900', color: theme.colors.text.primary, marginBottom: 6 },
    subtitle: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 20, lineHeight: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
    },
    rowIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 2 },
    rowDesc: { fontSize: 13, color: theme.colors.text.secondary },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      borderRadius: 22,
    },
    emptyState: { position: 'relative', overflow: 'hidden' },
    emptyWatermark: {
      position: 'absolute',
      opacity: 0.06,
      right: -20,
      bottom: -16,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 6 },
    emptyDesc: { fontSize: 13, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 19 },
  });
