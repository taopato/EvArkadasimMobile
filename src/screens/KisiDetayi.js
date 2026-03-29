// src/screens/TwoPersonDebtDetailScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';
import { houseApi, paymentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Para formatlaması - Türk Lirası standardı
const fmt = (n) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(n || 0));
};

const TwoPersonDebtDetailScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { houseId, userAId, userBId } = route.params || {}; // userAId ↔ userBId arası borç durumu
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const load = async () => {
    if (!houseId || !userAId || !userBId) return;
    setLoading(true);
    try {
      const res = await houseApi.getUserDebtBetween(Number(houseId), Number(userAId), Number(userBId));
      const data = res?.data?.data ?? res?.data ?? null;
      setSummary(data);
    } catch (e) {
      console.error('İki kişi borç detayı hatası:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [houseId, userAId, userBId]);

  const handlePay = async () => {
    if (!summary) return;
    const borcluUserId = Number(summary?.borcluUserId ?? summary?.fromUserId);
    const alacakliUserId = Number(summary?.alacakliUserId ?? summary?.toUserId);
    const tutar = Number(summary?.tutar ?? summary?.amount ?? 0);

    if (!borcluUserId || !alacakliUserId || !tutar) {
      Alert.alert('Hata', 'Ödeme için eksik bilgi.');
      return;
    }

    try {
      const payload = {
        houseId: Number(houseId),
        borcluUserId,
        alacakliUserId,
        tutar,
        paymentMethod: 'Cash',
        note: 'İkili borç kapatma',
      };
      await paymentsApi.create(payload);
      Alert.alert('Başarılı', 'Ödeme kaydı oluşturuldu.');
      navigation.goBack();
    } catch (e) {
      console.error('Ödeme oluşturma hatası:', e);
      Alert.alert('Hata', e?.response?.data?.message || e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: theme.colors.text.secondary }]}>Veri bulunamadı.</Text>
      </View>
    );
  }

  const aName = summary?.userAName || summary?.fromUserName || 'Kişi A';
  const bName = summary?.userBName || summary?.toUserName || 'Kişi B';
  const borclu = summary?.borcluUserName || summary?.fromUserName || aName;
  const alacakli = summary?.alacakliUserName || summary?.toUserName || bName;
  const tutar = summary?.tutar ?? summary?.amount ?? 0;

  const iAmDebtor = Number(summary?.borcluUserId ?? summary?.fromUserId) === Number(user?.id);
  const iAmCreditor = Number(summary?.alacakliUserId ?? summary?.toUserId) === Number(user?.id);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.surface }]} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={[styles.header, { color: theme.colors.text.primary }]}>İkili Borç Detayı</Text>

      <View style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.neutral?.[200] }]}>
        <Text style={[styles.rowText, { color: theme.colors.text.primary }]}><Text style={[styles.badge, { backgroundColor: theme.colors.primary?.[500], color: theme.colors.text.onPrimary }]}>A</Text> {aName}</Text>
        <Text style={[styles.rowText, { color: theme.colors.text.primary }]}><Text style={[styles.badge, { backgroundColor: theme.colors.primary?.[500], color: theme.colors.text.onPrimary }]}>B</Text> {bName}</Text>
        <View style={[styles.divider, { backgroundColor: theme.colors.neutral?.[200] }]} />

        <Text style={[styles.line, { color: theme.colors.text.primary }]}><Text style={styles.bold}>{borclu}</Text> → <Text style={styles.bold}>{alacakli}</Text></Text>
        <Text style={[styles.amount, { color: iAmCreditor ? '#22c55e' : (iAmDebtor ? '#dc2626' : theme.colors.text.primary) }]}>
          {iAmCreditor ? '+' : iAmDebtor ? '-' : ''}{fmt(tutar)}
        </Text>
        <Text style={[styles.muted, { color: theme.colors.text.secondary }]}>Toplam net bakiye</Text>

        {iAmDebtor && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary?.[600] }]} onPress={handlePay} activeOpacity={0.85}>
            <Text style={[styles.btnText, { color: theme.colors.text.onPrimary }]}>Bu Borcu Öde</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={[styles.btn, { borderWidth: 1, borderColor: theme.colors.primary?.[600], backgroundColor: 'transparent' }]} onPress={load} activeOpacity={0.85}>
        <Text style={[styles.btnText, { color: theme.colors.primary?.[600] }]}>Yenile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: {},

  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  rowText: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', marginRight: 6 },
  divider: { height: 1, marginVertical: 10 },
  line: { marginBottom: 6 },
  bold: { fontWeight: '800' },
  amount: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  btn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  btnText: { fontWeight: '700' },
});

export default TwoPersonDebtDetailScreen;
