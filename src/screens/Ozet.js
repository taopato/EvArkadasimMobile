// src/screens/ReceivablesDebtsSummaryScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { houseApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';

const formatAmount = (n) => `${Number(n || 0).toFixed(2)} TL`;
const sum = (arr, sel) => arr.reduce((s, x) => s + Number(sel(x) || 0), 0);
const pick = (obj, keys) => { for (const k of keys) if (obj && obj[k]) return obj[k]; };

export default function ReceivablesDebtsSummaryScreen({ route, navigation }) {
  const { userId, houseId } = route.params || {};
  const me = Number(userId);
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({
    receivable: 0,
    payable: 0,
    net: 0,
    receivables: [], // size borçlu olanlar
    debts: [],       // sizin borçlu olduğunuz
  });

  useEffect(() => {
    if (!me || !houseId) return;
    fetchUserDetails();
  }, [me, houseId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const res = await houseApi.getUserDebts(me, Number(houseId));
      const body = res?.data?.data ?? res?.data ?? {};
      const pairs = Array.isArray(body.pairs) ? body.pairs : Array.isArray(body.details) ? body.details : [];
      const totals = Array.isArray(body.totals) ? body.totals : [];

      // İsim alanı yoksa members'tan tamamla
      const hasNames = pairs.some(p =>
        p.counterpartyName ||
        pick(p, ['fromUserName', 'fromFullName', 'fromName']) ||
        pick(p, ['toUserName', 'toFullName', 'toName'])
      );

      let nameById = new Map();
      if (!hasNames) {
        const memRes = await houseApi.getMembers(Number(houseId));
        const raw = memRes?.data?.data ?? memRes?.data ?? [];
        nameById = new Map(
          raw
            .map(m => ({
              id: Number(m.userId ?? m.user?.id ?? m.id),
              name: m.fullName ?? m.name ?? m.user?.fullName ?? `Kullanıcı #${m.userId ?? m.id ?? '?'}`
            }))
            .filter(x => Number.isFinite(x.id))
            .map(x => [x.id, x.name])
        );
      }

      const nameFor = (id, side, p) => {
        if (side === 'from') {
          return (
            p.fromUserName || p.fromFullName || p.fromName ||
            nameById.get(Number(id)) || `Kullanıcı #${id}`
          );
        }
        return (
          p.toUserName || p.toFullName || p.toName ||
          nameById.get(Number(id)) || `Kullanıcı #${id}`
        );
      };

      // Size borçlu olanlar: to = me, netAmount > 0
      const receivables = pairs
        .filter(p => Number(p.toUserId) === me && Number(p.netAmount) > 0)
        .map(p => ({
          otherUserId: Number(p.fromUserId),
          otherName: nameFor(p.fromUserId, 'from', p),
          amount: Number(p.netAmount)
        }));

      // Borçlu olduğunuz: from = me, netAmount > 0
      const debts = pairs
        .filter(p => Number(p.fromUserId) === me && Number(p.netAmount) > 0)
        .map(p => ({
          otherUserId: Number(p.toUserId),
          otherName: nameFor(p.toUserId, 'to', p),
          amount: Number(p.netAmount)
        }));

      const myTotals = totals.find(t => Number(t.userId) === me) || {};
      const receivable = Number(myTotals.receivable) || sum(receivables, r => r.amount);
      const payable    = Number(myTotals.payable)    || sum(debts, d => d.amount);
      const net        = Number(myTotals.net)        || (receivable - payable);

      setState({ receivable, payable, net, receivables, debts });
    } catch (error) {
      console.error('🔍 ReceivablesDebtsSummaryScreen - getUserDebts hatası:', error);
      Alert.alert('Hata', 'Kullanıcı borç/alacak bilgileri alınamadı.');
      setState({ receivable: 0, payable: 0, net: 0, receivables: [], debts: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
          <Text style={CommonStyles.loadingText}>Borç/Alacak bilgileri yükleniyor…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Receivables & Debts Summary</Text>
          <Text style={CommonStyles.subtitle}>User's debt and receivable status</Text>
        </View>

        {/* Toplamlar */}
        <View style={CommonStyles.card}>
          <View style={styles.amountContainer}>
            <View style={[styles.amountItem, { backgroundColor: theme.colors.success?.[50] }]}>
              <Text style={styles.amountLabel}>Total Receivables</Text>
              <Text style={styles.alacak}>{formatAmount(state.receivable)}</Text>
            </View>
            <View style={[styles.amountItem, { backgroundColor: theme.colors.error?.[50] }]}>
              <Text style={styles.amountLabel}>Total Debts</Text>
              <Text style={styles.borc}>{formatAmount(state.payable)}</Text>
            </View>
            <View style={[styles.amountItem, { backgroundColor: theme.colors.primary?.[50] }]}>
              <Text style={styles.amountLabel}>Net Status</Text>
              <Text style={[styles.netDurum, { color: state.net >= 0 ? theme.colors.success?.[600] : theme.colors.error?.[600] }]}>
                {formatAmount(state.net)}
              </Text>
            </View>
          </View>
        </View>

        {/* Size borçlu olanlar */}
        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>📗 People who owe you</Text>
          {state.receivables.length > 0 ? (
            state.receivables.map((r, i) => (
              <View key={String(r.otherUserId ?? i)} style={CommonStyles.listItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{r.otherName?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={CommonStyles.listItemContent}>
                  <Text style={CommonStyles.listItemTitle}>{r.otherName}</Text>
                  <Text style={CommonStyles.listItemSubtitle}>Owes you</Text>
                </View>
                <Text style={[styles.amountText, { color: theme.colors.success?.[600] }]}>
                  {formatAmount(r.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No records</Text>
          )}
        </View>

        {/* Borçlu olduğunuz kişiler */}
        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>📕 People you owe</Text>
          {state.debts.length > 0 ? (
            state.debts.map((d, i) => (
              <View key={String(d.otherUserId ?? i)} style={CommonStyles.listItem}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.warning?.[200] }]}>
                  <Text style={[styles.avatarTxt, { color: theme.colors.text.primary }]}>
                    {d.otherName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={CommonStyles.listItemContent}>
                  <Text style={CommonStyles.listItemTitle}>{d.otherName}</Text>
                  <Text style={CommonStyles.listItemSubtitle}>You owe this person</Text>
                </View>
                <Text style={[styles.amountText, { color: theme.colors.error?.[600] }]}>
                  {formatAmount(d.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No records</Text>
          )}
        </View>

        {/* Geri / başka ekrana geçiş isterseniz: */}
        {/* <TouchableOpacity onPress={() => navigation.goBack()} style={CommonStyles.menuButton}>…</TouchableOpacity> */}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    amountContainer: { gap: 12 },
    amountItem: { padding: 16, borderRadius: 8, alignItems: 'center' },
    amountLabel: { fontSize: 14, marginBottom: 4, color: theme.colors.text.secondary },
    alacak:   { fontSize: 18, fontWeight: 'bold', color: theme.colors.success?.[600] },
    borc:     { fontSize: 18, fontWeight: 'bold', color: theme.colors.error?.[600] },
    netDurum: { fontSize: 18, fontWeight: 'bold' },

    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: theme.colors.text.primary },
    amountText: { fontSize: 16, fontWeight: '700' },
    muted: { paddingVertical: 8, color: theme.colors.text.secondary },

    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: theme.colors.primary?.[500] },
    avatarTxt: { fontWeight: '800', fontSize: 16, color: theme.colors.text.onPrimary }
  });
}
