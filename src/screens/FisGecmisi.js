import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import { BASE_URL } from '../shared/config/env';

const STATUS_LABELS = {
  Uploaded: 'Yüklendi',
  Parsed: 'Kalemler çıkarıldı',
  Reviewed: 'Düzenlendi',
  Converted: 'Harcamaya dönüştü',
};

export default function FisGecmisi({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const CommonStyles = useCommonStyles();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const houseId = route?.params?.houseId || user?.defaultHouseId;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!houseId) return;
    setLoading(true);
    try {
      const res = await receiptsApi.getByHouse(houseId);
      const data = Array.isArray(res?.data) ? res.data : [];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [houseId]);

  const renderItem = ({ item }) => {
    const imageUri = item.imageUrl?.startsWith('http')
      ? item.imageUrl
      : `${BASE_URL}${item.imageUrl || ''}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('FisDetayi', { receiptId: item.id, houseId })}
      >
        <Image source={{ uri: imageUri }} style={styles.thumb} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{item.storeName || 'Fiş'}</Text>
          <Text style={styles.sub}>
            {item.receiptDate ? new Date(item.receiptDate).toLocaleDateString('tr-TR') : 'Tarih yok'}
          </Text>
          <Text style={styles.sub}>{item.itemCount || 0} kalem</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>
            {Number(item.detectedTotalAmount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </Text>
          <Text style={styles.status}>{STATUS_LABELS[item.status] || String(item.status)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={CommonStyles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <Text style={styles.headerNote}>
            Buradan eski fişleri açıp kalemleri tekrar düzenleyebilir veya harcamaya dönüştürebilirsin.
          </Text>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Henüz kaydedilmiş fiş yok.</Text> : null}
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  content: { padding: 16 },
  headerNote: { color: theme.colors.text.secondary, marginBottom: 12, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: 10,
  },
  thumb: { width: 62, height: 62, borderRadius: 12, backgroundColor: theme.colors.neutral[100] },
  meta: { flex: 1, marginLeft: 12 },
  title: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 15 },
  sub: { color: theme.colors.text.secondary, marginTop: 2, fontSize: 12 },
  right: { alignItems: 'flex-end', marginLeft: 10 },
  amount: { color: theme.colors.text.primary, fontWeight: '800' },
  status: { color: theme.colors.primary[700], marginTop: 4, fontSize: 12, textAlign: 'right' },
  empty: { textAlign: 'center', paddingVertical: 40, color: theme.colors.text.secondary },
});
