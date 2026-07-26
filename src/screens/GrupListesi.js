import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import {
  EmptyState,
  LoadingState,
  PageHeader,
  PrimaryButton,
} from '../shared/ui/roomora/CanonicalUI';
import { shadow } from '../shared/ui/shadow';
import { resolveMediaUrl } from '../shared/config/env';

export default function GroupListScreen({ navigation, route }) {
  const { user, setDefaultHouseId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!user?.id) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await houseApi.getUserHouses(Number(user.id));
      const list = Array.isArray(response?.data) ? response.data : [];
      setHouses(list);
      if (!user?.defaultHouseId && list[0]) {
        await setDefaultHouseId(list[0].id, list[0].name);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setDefaultHouseId, user?.defaultHouseId, user?.id]);

  useEffect(() => { load(false); }, [load]);

  const continueTo = (house) => {
    const redirectTo = route?.params?.redirectTo;
    const params = { houseId: house.id, houseName: house.name };
    if (!redirectTo) {
      navigation.navigate('EvUyeleri', params);
      return;
    }
    if (redirectTo === 'TumHarcamalar') {
      navigation.navigate('MainTabs', { screen: 'TumHarcamalar', params });
      return;
    }
    if (redirectTo === 'BillsOverviewScreen' || redirectTo === 'FaturaEkle') {
      navigation.navigate(redirectTo === 'FaturaEkle' ? 'FaturaEkle' : 'MainTabs', redirectTo === 'FaturaEkle'
        ? params
        : { screen: 'Faturalar', params });
      return;
    }
    navigation.navigate(redirectTo, params);
  };

  const selectHouse = async (house) => {
    await setDefaultHouseId(house.id, house.name);
    continueTo(house);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <PageHeader
          title="Evlerim"
          subtitle="Ortak yaşam alanlarını yönet"
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <LoadingState label="Evlerin yükleniyor..." />
        ) : houses.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="Henüz bir evin yok"
            description="Ev arkadaşlarınla harcamaları yönetmek için ilk evini oluştur."
            action="Yeni Ev Oluştur"
            onAction={() => navigation.navigate('YeniEvGrubu')}
          />
        ) : (
          <>
            <View style={styles.list}>
              {houses.map((house) => {
                const active = Number(house.id) === Number(user?.defaultHouseId);
                return (
                  <TouchableOpacity
                    key={String(house.id)}
                    style={[styles.houseCard, active && styles.houseCardActive]}
                    onPress={() => selectHouse(house)}
                    activeOpacity={0.86}
                  >
                    <View style={styles.houseCover}>
                      {house.coverImageUrl ? (
                        <Image source={{ uri: resolveMediaUrl(house.coverImageUrl) }} style={styles.houseImage} />
                      ) : (
                        <Ionicons name="home" size={34} color={theme.colors.primary[700]} />
                      )}
                    </View>
                    <View style={styles.houseBody}>
                      <View style={styles.houseTitleRow}>
                        <Text style={styles.houseName}>{house.name}</Text>
                        {active && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeText}>AKTİF</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.houseSub}>Üyeleri ve ev bilgilerini görüntüle</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[400]} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <PrimaryButton label="Yeni Ev Oluştur" icon="add" onPress={() => navigation.navigate('YeniEvGrubu')} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 32 },
  list: { gap: 12, marginTop: 14, marginBottom: 16 },
  houseCard: {
    minHeight: 104,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  houseCardActive: { borderColor: theme.colors.primary[300], backgroundColor: theme.colors.primary[50] },
  houseCover: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[100],
    overflow: 'hidden',
  },
  houseImage: { width: '100%', height: '100%' },
  houseBody: { flex: 1 },
  houseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  houseName: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 17,
  },
  houseSub: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    marginTop: 5,
  },
  activeBadge: {
    borderRadius: 999,
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  activeText: { color: '#fff', fontFamily: theme.typography.bold, fontSize: 9 },
});
