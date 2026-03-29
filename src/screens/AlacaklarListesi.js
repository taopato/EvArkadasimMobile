// src/screens/ReceivablesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { formatAmount } from '../constants/ExpenseEnums';

const ReceivablesScreen = ({ navigation, route }) => {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState([]);
  const [netBalance, setNetBalance] = useState(0);

  useEffect(() => {
    if (houseId && user?.id) fetchReceivables();
  }, [houseId, user?.id]);

  const pick = (obj, keys) => { for (const k of keys) if (obj && obj[k]) return obj[k]; };

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const me = Number(user.id);
      const res = await houseApi.getUserDebts(me, Number(houseId));
      const body = res?.data || {};
      const pairs = Array.isArray(body.pairs) ? body.pairs : [];
      const totals = Array.isArray(body.totals) ? body.totals : [];

      const hasNames = pairs.some(p =>
        pick(p, ['fromUserName', 'fromFullName', 'fromName']) ||
        pick(p, ['toUserName', 'toFullName', 'toName']) ||
        p.counterpartyName
      );

      let nameById = new Map();
      if (!hasNames) {
        const memRes = await houseApi.getMembers(Number(houseId));
        const rawMembers = memRes?.data?.data ?? memRes?.data ?? [];
        nameById = new Map(
          rawMembers
            .map(m => ({
              id: Number(m.userId ?? m.user?.id ?? m.id),
              name: m.fullName ?? m.name ?? m.user?.fullName ?? `Kullanıcı #${m.userId ?? m.id ?? '?'}`,
            }))
            .filter(x => Number.isFinite(x.id))
            .map(x => [x.id, x.name])
        );
      }

      const rows = pairs
        .filter(p => Number(p.toUserId) === me && Number(p.netAmount) > 0)
        .map(p => {
          const otherId = Number(p.fromUserId);
          const nameFromApi =
            p.counterpartyName ||
            pick(p, ['fromUserName', 'fromFullName', 'fromName']);
          const counterpartyName =
            nameFromApi || nameById.get(otherId) || `Kullanıcı #${otherId}`;
          return { counterpartyUserId: otherId, counterpartyName, amount: Number(p.netAmount) };
        });

      setReceivables(rows);

      const meTotal = totals.find(t => Number(t.userId) === me);
      const net = Number(meTotal?.net ?? rows.reduce((s, r) => s + r.amount, 0));
      setNetBalance(net);
    } catch (error) {
      setReceivables([]);
      setNetBalance(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
          <Text style={CommonStyles.loadingText}>Alacaklar yükleniyor…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Alacaklarım</Text>
          <Text style={CommonStyles.subtitle}>{houseName || 'Ev'} • Toplam</Text>
        </View>

        <View style={CommonStyles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>💰 Toplam Alacak</Text>
          <View style={styles.netStatusContainer}>
            <Text style={[styles.netAmount, { color: theme.colors.success?.[600] }]}>{formatAmount(netBalance)}</Text>
            <Text style={[styles.netLabel, { color: theme.colors.text.secondary }]}>Toplam Alacağınız</Text>
          </View>
        </View>

        {receivables.length > 0 ? (
          <View style={CommonStyles.card}>
            <Text style={styles.sectionTitle}>👥 Ev Arkadaşları</Text>
            <View style={CommonStyles.listContainer}>
              {receivables.map((item, idx) => (
                <TouchableOpacity
                  key={idx.toString()}
                  style={CommonStyles.listItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('TwoPersonDebtDetail', {
                      houseId,
                      currentUserId: Number(user.id),
                      selectedUserId: item.counterpartyUserId,
                      selectedUserName: item.counterpartyName,
                    })
                  }
                >
                  <View style={[styles.userAvatar, { backgroundColor: theme.colors.primary?.[500] }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.background }]}>
                      {item.counterpartyName ? item.counterpartyName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={CommonStyles.listItemContent}>
                    <Text style={CommonStyles.listItemTitle}>{item.counterpartyName}</Text>
                    <Text style={CommonStyles.listItemSubtitle}>Size borçlu</Text>
                  </View>
                  <View style={styles.amountContainer}>
                    <Text style={[styles.amountText, { color: theme.colors.success?.[600] }]}>{formatAmount(item.amount)}</Text>
                    <Text style={[styles.statusText, { color: theme.colors.success?.[600] }]}>Alacaklı</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={CommonStyles.emptyContainer}>
            <Text style={CommonStyles.emptyIcon}>💚</Text>
            <Text style={CommonStyles.emptyText}>Henüz alacak bilginiz yok.</Text>
            <Text style={CommonStyles.emptyText}>Harcama ekledikçe burada görünecek.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  netStatusContainer: { alignItems: 'center', paddingVertical: 20 },
  netAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  netLabel: { fontSize: 16 },
  userAvatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  amountContainer: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
});

export default ReceivablesScreen;
