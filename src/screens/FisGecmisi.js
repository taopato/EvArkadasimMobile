import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { EmptyState, ListRow, LoadingState, PageHeader, SectionHeader } from '../shared/ui/roomora/CanonicalUI';

const statusLabel = {
  Uploaded: 'Yüklendi',
  Parsed: 'Kontrol bekliyor',
  Reviewed: 'Düzenlendi',
  Converted: 'Harcamaya dönüştü',
};

export default function FisGecmisi({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const houseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await receiptsApi.getByHouse(houseId);
      const raw = response?.data?.data ?? response?.data ?? [];
      setItems(Array.isArray(raw) ? raw : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [houseId]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary[600]} />}
      >
        <PageHeader title="Fiş Geçmişi" subtitle="Taranan ve kaydedilen fişler" onBack={() => navigation.goBack()} />
        <SectionHeader title="Fişler" />
        {loading ? <LoadingState label="Fişler yükleniyor..." /> : items.map((item) => (
          <ListRow
            key={String(item.id)}
            icon="scan-outline"
            title={item.storeName || 'İsimsiz fiş'}
            subtitle={`${item.receiptDate ? new Date(item.receiptDate).toLocaleDateString('tr-TR') : 'Tarih yok'} · ${item.itemCount || 0} kalem`}
            amount={item.detectedTotalAmount || 0}
            badge={statusLabel[item.status] || String(item.status || 'Taslak')}
            badgeTone={item.status === 'Converted' ? 'success' : 'info'}
            onPress={() => navigation.navigate('FisDetayi', { receiptId: item.id, houseId })}
          />
        ))}
        {!loading && !items.length && <EmptyState icon="scan-outline" title="Henüz fiş yok" description="Harcama eklerken kamerayı kullanarak ilk fişini tarayabilirsin." action="Harcama Ekle" onAction={() => navigation.navigate('HarcamaEkle', { houseId })} />}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
});
