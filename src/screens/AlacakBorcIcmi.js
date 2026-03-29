import React, { useEffect, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';

export default function AlacakBorcIcmiScreen({ route, navigation }) {
  const { userId, houseId, userName } = route.params;
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const meId = Number(user?.id);
      const otherId = Number(userId);
      let view = { toplamAlacak: 0, toplamBorc: 0, netDurum: 0, detaylar: [] };

      // Önce ikili borç endpoint'i
      try {
        const resBetween = await houseApi.getUserDebtBetween(Number(houseId), meId, otherId);
        const body = resBetween?.data?.data ?? resBetween?.data ?? {};
        // Olası alanlar: netForUserId, netAmount + from/to, receivable/payable
        let netForMe = 0;
        const nfuId = Number(body.netForUserId ?? body.userId ?? NaN);
        if (Number.isFinite(nfuId) && nfuId === meId && body.net != null) {
          netForMe = Number(body.net) || 0;
        } else {
          const fromId = Number(body.fromUserId ?? body.userAId ?? NaN);
          const toId = Number(body.toUserId ?? body.userBId ?? NaN);
          const netAmount = Number(body.netAmount ?? body.amount ?? body.net ?? 0);
          if (Number.isFinite(fromId) && Number.isFinite(toId) && netAmount) {
            if (toId === meId) netForMe = Math.abs(netAmount);
            else if (fromId === meId) netForMe = -Math.abs(netAmount);
          }
        }
        if (Number.isFinite(netForMe)) {
          view.netDurum = netForMe;
          if (netForMe > 0) view.toplamAlacak = netForMe; else view.toplamBorc = Math.abs(netForMe);
        }
      } catch {}

      // Fallback: genel borç-liste uçları
      if ((view.toplamAlacak || view.toplamBorc || view.netDurum) === 0) {
        try {
          const res = await houseApi.getUserDebts(meId, Number(houseId));
          const body = res?.data?.data ?? res?.data ?? {};
          if (Array.isArray(body.pairs)) {
            const pair = body.pairs.find(p =>
              (Number(p.fromUserId) === meId && Number(p.toUserId) === otherId) ||
              (Number(p.toUserId) === meId && Number(p.fromUserId) === otherId)
            );
            if (pair && Number(pair.netAmount) > 0) {
              const amt = Number(pair.netAmount);
              const netForMe = Number(pair.toUserId) === meId ? amt : -amt;
              view.netDurum = netForMe;
              if (netForMe > 0) view.toplamAlacak = netForMe; else view.toplamBorc = Math.abs(netForMe);
            }
          } else if (Array.isArray(body.kullaniciBazliDurumlar)) {
            const row = body.kullaniciBazliDurumlar.find(r => Number(r.userId) === otherId);
            if (row && row.amount != null) {
              const a = Number(row.amount) || 0; // >0 ben borçlu, <0 karşı taraf borçlu
              const netForMe = -a;
              view.netDurum = netForMe;
              if (netForMe > 0) view.toplamAlacak = netForMe; else view.toplamBorc = Math.abs(netForMe);
            }
          } else {
            // eski toplam alan adları
            const recv = Number(body.toplamAlacak) || 0;
            const pay = Number(body.toplamBorc) || 0;
            view.toplamAlacak = recv; view.toplamBorc = pay; view.netDurum = recv - pay;
          }
        } catch {}
      }

      setData({ data: view });
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        {loading ? (
          <View style={CommonStyles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
            <Text style={CommonStyles.loadingText}>Borç/Alacak bilgileri yükleniyor...</Text>
          </View>
        ) : (
          <>
            <View style={CommonStyles.header}>
              <Text style={CommonStyles.title}>Borç/Alacak Detayı</Text>
              <Text style={CommonStyles.subtitle}>{userName || 'Kullanıcı'} - Borç ve alacak durumu</Text>
            </View>

            <View style={CommonStyles.card}>
              <View style={styles.amountContainer}>
                <View style={[styles.amountItem, { backgroundColor: theme.colors.success?.[50] }]}> 
                  <Text style={[styles.amountLabel, { color: theme.colors.text.secondary }]}>Toplam Alacak</Text>
                  <Text style={[styles.alacak, { color: theme.colors.success?.[600] }]}>{data?.data?.toplamAlacak || 0} TL</Text>
                </View>
                <View style={[styles.amountItem, { backgroundColor: theme.colors.error?.[50] }]}>
                  <Text style={[styles.amountLabel, { color: theme.colors.text.secondary }]}>Toplam Borç</Text>
                  <Text style={[styles.borc, { color: theme.colors.error?.[600] }]}>{data?.data?.toplamBorc || 0} TL</Text>
                </View>
                <View style={[styles.amountItem, { backgroundColor: theme.colors.primary?.[50] }]}>
                  <Text style={[styles.amountLabel, { color: theme.colors.text.secondary }]}>Net Durum</Text>
                  <Text style={[styles.netDurum, { color: theme.colors.primary?.[600] }]}>{data?.data?.netDurum || 0} TL</Text>
                </View>
              </View>
            </View>

            <View style={CommonStyles.listContainer}>
              {(data?.data?.detaylar || []).map((item, index) => (
                <View key={index} style={CommonStyles.listItem}>
                  <View style={CommonStyles.listItemContent}>
                    <Text style={CommonStyles.listItemTitle}>{item.tur}</Text>
                    <View style={styles.amounts}>
                      <Text style={styles.alacak}>Tutar: {item.tutar} TL</Text>
                      <Text style={styles.borc}>Paylaşım: {item.paylasimTutari} TL</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  amountContainer: { gap: 12 },
  amountItem: { padding: 16, borderRadius: 8, alignItems: 'center' },
  amountLabel: { fontSize: 14, marginBottom: 4 },
  alacak: { fontSize: 18, fontWeight: 'bold' },
  borc: { fontSize: 18, fontWeight: 'bold' },
  netDurum: { fontSize: 18, fontWeight: 'bold' },
  amounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});


