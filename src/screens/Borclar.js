import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { houseApi, scheduledChargesApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { formatAmount } from '../constants/ExpenseEnums';
import eventBus from '../shared/events/bus';

const pick = (obj, keys) => { for (const k of keys) if (obj && obj[k]) return obj[k]; return undefined; };
const sum = (arr, sel) => arr.reduce((s, x) => s + Number(sel(x) || 0), 0);

export default function Borclar({ navigation, route }) {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [scheduledRows, setScheduledRows] = useState([]);
  const [searchText, setSearchText] = useState('');

  const fetchDebts = useCallback(async () => {
    if (!houseId || !user?.id) return;
    setLoading(true);
    try {
      const me = Number(user.id);
      const res = await houseApi.getUserDebts(me, Number(houseId));
      const body = res?.data?.data ?? res?.data ?? {};
      const pairs = Array.isArray(body.pairs) ? body.pairs : [];

      let nameById = new Map();
      const memRes = await houseApi.getMembers(Number(houseId));
      const rawMembers = memRes?.data?.data ?? memRes?.data ?? [];
      nameById = new Map(
        rawMembers.map((m) => ({
          id: Number(m.userId ?? m.id ?? m.user?.id),
          name: m.fullName ?? m.name ?? m.user?.fullName ?? 'Kullanıcı',
        })).filter((x) => Number.isFinite(x.id)).map((x) => [x.id, x.name]),
      );

      const myPerspective = pairs.map((p) => {
        const fromId = Number(p.fromUserId);
        const toId = Number(p.toUserId);
        const amt = Number(p.netAmount);
        const mine = fromId === me ? amt : (toId === me ? -amt : 0);
        if (!Number.isFinite(mine) || mine <= 0) return null;

        const otherId = fromId === me ? toId : fromId;
        const otherName = p.counterpartyName ||
          (fromId === me
            ? pick(p, ['toUserName', 'toFullName', 'toName'])
            : pick(p, ['fromUserName', 'fromFullName', 'fromName'])) ||
          nameById.get(otherId) ||
          `Kullanıcı #${otherId}`;

        return { counterpartyUserId: otherId, counterpartyName: otherName, amount: mine };
      }).filter(Boolean);

      setRows(myPerspective);

      setTotalDebt(sum(myPerspective, (d) => d.amount));
      try {
        const scheduledResponse = await scheduledChargesApi.getMyDue(Number(houseId));
        const scheduledBody = scheduledResponse?.data?.data ?? scheduledResponse?.data ?? {};
        setScheduledRows(Array.isArray(scheduledBody.items) ? scheduledBody.items : []);
      } catch {
        setScheduledRows([]);
      }
    } catch {
      setRows([]);
      setTotalDebt(0);
      setScheduledRows([]);
    } finally {
      setLoading(false);
    }
  }, [houseId, user?.id]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', fetchDebts);
    const offBus = eventBus.on('payments:updated', (payload) => {
      if (!payload?.houseId || Number(payload.houseId) === Number(houseId)) fetchDebts();
    });
    const offScheduled = eventBus.on('scheduled-charges:updated', (payload) => {
      if (!payload?.houseId || Number(payload.houseId) === Number(houseId)) fetchDebts();
    });
    return () => { unsubFocus(); offBus(); offScheduled(); };
  }, [navigation, fetchDebts, houseId]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLocaleLowerCase('tr-TR');
    if (!q) return rows;
    return rows.filter((item) => String(item.counterpartyName || '').toLocaleLowerCase('tr-TR').includes(q));
  }, [rows, searchText]);

  const scheduledDebt = useMemo(() => sum(scheduledRows, (item) => item.amount), [scheduledRows]);
  const payableNow = totalDebt + scheduledDebt;

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={CommonStyles.loadingText}>Borç bilgileri yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Borçlarım</Text>
          <Text style={CommonStyles.subtitle}>{houseName} için toplam borcunuz</Text>
        </View>

        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>Toplam Borç</Text>
          <View style={styles.netStatusContainer}>
            <Text style={[styles.netAmount, { color: theme.colors.error[600] }]}>{formatAmount(payableNow)}</Text>
            <Text style={styles.netLabel}>Şu anki toplam borcunuz</Text>
            {scheduledDebt > 0 && (
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Normal ortak hesap</Text>
                  <Text style={styles.breakdownValue}>{formatAmount(totalDebt)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Dönemsel ödemeler</Text>
                  <Text style={[styles.breakdownValue, { color: theme.colors.warning[700] }]}>{formatAmount(scheduledDebt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {scheduledRows.length > 0 && (
          <View style={CommonStyles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Dönemsel Ödemeler</Text>
                <Text style={styles.sectionHint}>Normal ortak hesaptan ayrı takip edilir.</Text>
              </View>
              <TouchableOpacity
                style={styles.billsLink}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Faturalar', params: { houseId, houseName } })}
              >
                <Text style={styles.billsLinkText}>Faturalar</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.primary[700]} />
              </TouchableOpacity>
            </View>
            {scheduledRows.map((item) => (
              <View key={`${item.cycleId}-${item.planId}`} style={styles.scheduledRow}>
                <View style={styles.scheduledIcon}>
                  <Ionicons name={item.type === 'Rent' ? 'home-outline' : 'calendar-outline'} size={20} color={theme.colors.warning[700]} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.title}</Text>
                  <Text style={styles.sub}>{item.payerName} kişisine • Ayın {item.dueDay}. günü</Text>
                </View>
                <View style={styles.amountWrap}>
                  <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                  <Text style={[styles.subError, item.status === 'Overdue' && { color: theme.colors.error[700] }]}>
                    {item.status === 'Overdue' ? 'Gecikti' : 'Ödenmedi'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>Borçlu olduğunuz kişiler</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Kişi ara..."
            placeholderTextColor={theme.colors.text.secondary}
          />

          {filteredRows.length === 0 ? (
            <Text style={styles.emptyText}>Bu ev için aktif bir borcunuz görünmüyor.</Text>
          ) : (
            filteredRows.map((item) => (
              <View key={String(item.counterpartyUserId)} style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('KisiDetayi', {
                    houseId,
                    userAId: Number(user.id),
                    userBId: item.counterpartyUserId,
                    userAName: user.fullName || user.name || `Kullanıcı #${user.id}`,
                    userBName: item.counterpartyName,
                  })}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{String(item.counterpartyName || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{item.counterpartyName}</Text>
                    <Text style={styles.sub}>Bu kişiye borçlusunuz</Text>
                  </View>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                    <Text style={styles.subError}>Borçlu</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => navigation.navigate('OdemeEkle', {
                    houseId,
                    houseName,
                    alacakliUserId: item.counterpartyUserId,
                    suggestedAmount: Number(item.amount),
                  })}
                >
                  <Text style={styles.payBtnText}>Öde</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 12 },
  netStatusContainer: { alignItems: 'center', paddingVertical: 8 },
  netAmount: { fontSize: 28, fontWeight: '900' },
  netLabel: { marginTop: 6, color: theme.colors.text.secondary },
  breakdown: { width: '100%', marginTop: 14, borderTopWidth: 1, borderTopColor: theme.colors.neutral[200], paddingTop: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  breakdownLabel: { color: theme.colors.text.secondary, fontSize: 12 },
  breakdownValue: { color: theme.colors.text.primary, fontSize: 12, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHint: { color: theme.colors.text.secondary, fontSize: 11, marginTop: -7 },
  billsLink: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8, paddingLeft: 8 },
  billsLinkText: { color: theme.colors.primary[700], fontSize: 12, fontWeight: '800' },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.neutral[100] },
  scheduledIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.warning[50], marginRight: 11 },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  emptyText: { color: theme.colors.text.secondary, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error[100],
    marginRight: 12,
  },
  avatarText: { color: theme.colors.error[700], fontWeight: '800' },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: theme.colors.text.primary },
  sub: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 },
  amountWrap: { alignItems: 'flex-end', marginLeft: 12 },
  amount: { fontSize: 14, fontWeight: '900', color: theme.colors.error[700] },
  subError: { fontSize: 11, color: theme.colors.error[600], marginTop: 2 },
  payBtn: {
    marginLeft: 10,
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  payBtnText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
});
