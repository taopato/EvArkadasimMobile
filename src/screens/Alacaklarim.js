// src/screens/MyReceivablesScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { formatAmount } from '../constants/ExpenseEnums';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';

const MyReceivablesScreen = ({ navigation, route }) => {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState([]);
  const [netBalance, setNetBalance] = useState(0);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (houseId && user?.id) fetchReceivables();
  }, [houseId, user?.id]);

  const pick = (obj, keys) => { for (const k of keys) if (obj && obj[k]) return obj[k]; };
  const filteredReceivables = useMemo(() => {
    const q = searchText.trim().toLocaleLowerCase('tr-TR');
    if (!q) return receivables;
    return receivables.filter((item) =>
      String(item.counterpartyName || '').toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [receivables, searchText]);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const me = Number(user.id);
      const res = await houseApi.getUserDebts(me, Number(houseId));
      const body = res?.data || {};
      const pairs = Array.isArray(body.pairs) ? body.pairs : [];

      const hasNames = pairs.some(p =>
        pick(p, ['fromUserName', 'fromFullName', 'fromName']) ||
        pick(p, ['toUserName', 'toFullName', 'toName']) ||
        p.counterpartyName
      );

      let nameById = new Map();
      if (!hasNames) {
        const memRes = await houseApi.getMembers(Number(houseId));
        const raw = memRes?.data?.data ?? memRes?.data ?? [];
        nameById = new Map(
          raw
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
          const nameFromApi = p.counterpartyName || pick(p, ['fromUserName', 'fromFullName', 'fromName']);
          const counterpartyName = nameFromApi || nameById.get(otherId) || `Kullanıcı #${otherId}`;
          return { counterpartyUserId: otherId, counterpartyName, amount: Number(p.netAmount) };
        });

      setReceivables(rows);
      setNetBalance(rows.reduce((s, r) => s + r.amount, 0));
    } catch {
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
          <Text style={CommonStyles.loadingText}>Alacak bilgileri yükleniyor…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Alacaklarım</Text>
          <Text style={CommonStyles.subtitle}>{houseName || 'Ev'} • Toplam alacağınız</Text>
        </View>

        <View style={CommonStyles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Toplam Alacak</Text>
          <View style={styles.netStatusContainer}>
            <Text style={[styles.netAmount, { color: theme.colors.success?.[600] }]}>{formatAmount(netBalance)}</Text>
            <Text style={[styles.netLabel, { color: theme.colors.text.secondary }]}>Toplam Alacağınız</Text>
          </View>
        </View>

        {receivables.length > 0 ? (
          <View style={CommonStyles.card}>
            <Text style={styles.sectionTitle}>Ev Arkadaşları</Text>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Kişi ara..."
              placeholderTextColor={theme.colors.text.secondary}
            />
            <View style={CommonStyles.listContainer}>
              {filteredReceivables.map((item, idx) => (
                <TouchableOpacity
                  key={idx.toString()}
                  style={CommonStyles.listItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('KisiDetayi', {
                      houseId,
                      currentUserId: Number(user.id),
                      selectedUserId: item.counterpartyUserId,
                      selectedUserName: item.counterpartyName,
                    })
                  }
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
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
            <Ionicons name="mail-open-outline" size={40} color={theme.colors.text.secondary} style={{ marginBottom: 8 }} />
            <Text style={CommonStyles.emptyText}>Bekleyen alacak yok</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.colors.text.primary },
    netStatusContainer: { alignItems: 'center', paddingVertical: 20 },
    netAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
    netLabel: { fontSize: 16, color: theme.colors.text.secondary },
    userAvatar: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary[500],
      justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.background },
    amountContainer: { alignItems: 'flex-end' },
    amountText: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    statusText: { fontSize: 12, fontWeight: '600' },
    searchInput: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background,
    },
  });
}

export default MyReceivablesScreen;
