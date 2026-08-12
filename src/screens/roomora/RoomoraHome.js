import React, { useEffect, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { houseApi } from '../../services/api';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { resolveMediaUrl } from '../../shared/config/env';
import useRoomoraDashboard from '../../hooks/useRoomoraDashboard';
import {
  ActionTile,
  BalanceCard,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PageHeader,
  SectionHeader,
} from '../../shared/ui/roomora/CanonicalUI';
import {
  getExpenseDisplayTitle,
  getItemDate,
} from '../../utils/expenseHelpers';
import { getCategoryIconName } from '../../constants/ExpenseEnums';
import BrandMark from '../../components/BrandMark';

const dayLabel = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (value.toDateString() === today.toDateString()) return 'Bugün';
  if (value.toDateString() === yesterday.toDateString()) return 'Dün';
  return value.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function RoomoraHome({ navigation }) {
  const { user, setDefaultHouseId } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useRoomoraDashboard(user);
  const screenError = data.errors?.expenses || data.errors?.debt;
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const firstName = String(user?.fullName || 'Kullanıcı').trim().split(/\s+/)[0];
  const recent = data.expenses.slice(0, 4);
  const upcomingBill = data.expenses.find((item) =>
    ['Electricity', 'Water', 'Gas', 'Internet', 'Rent'].includes(item.key)
  );

  useEffect(() => {
    if (!user?.id || user?.defaultHouseId) return;
    let active = true;
    houseApi.getUserHouses(Number(user.id))
      .then(async (response) => {
        const houses = Array.isArray(response?.data) ? response.data : [];
        if (active && houses[0]) {
          await setDefaultHouseId(houses[0].id, houses[0].name);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [setDefaultHouseId, user?.defaultHouseId, user?.id]);

  const requireHouse = (route, params = {}) => {
    if (!data.houseId) {
      navigation.navigate('GrupListesi', { redirectTo: route });
      return;
    }
    navigation.navigate(route, {
      houseId: data.houseId,
      houseName: data.houseName,
      ...params,
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={data.refresh}
            tintColor={theme.colors.primary[600]}
          />
        )}
      >
        <PageHeader
          title={`Merhaba, ${firstName}`}
          subtitle={data.houseId ? data.houseName : 'Roomora’ya hoş geldin'}
          avatar={resolveMediaUrl(user?.profileImageUrl)}
          avatarName={user?.fullName}
          onAvatarPress={() => navigation.navigate('ProfilDuzenle')}
        />
        <View style={styles.brandStrip}>
          <BrandMark variant="logo" size={40} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Roomora</Text>
            <Text style={styles.brandTagline}>Ortak yaşamın kolay hali</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Bildirimler')}
            accessibilityLabel="Bildirimler"
          >
            <Ionicons name="notifications-outline" size={19} color={theme.colors.primary[700]} />
            {data.pendingPayments.length > 0 ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
        </View>

        {data.loading ? (
          <LoadingState label="Ev özeti hazırlanıyor..." />
        ) : screenError ? (
          <ErrorState description={screenError} onRetry={data.retry} />
        ) : !data.houseId ? (
          <EmptyState
            icon="home-outline"
            title="Önce bir ev seçelim"
            description="Harcamalarını, faturalarını ve bakiyeni görebilmek için bir ev oluştur veya mevcut evini seç."
            action="Evlerimi Aç"
            onAction={() => navigation.navigate('GrupListesi')}
          />
        ) : (
          <>
            <BalanceCard
              balance={data.balance}
              payable={data.payable}
              receivable={data.receivable}
              pendingCount={data.pendingPayments.length}
              onPress={() => requireHouse('DebtSummaryScreen')}
            />

            <View style={styles.actionGrid}>
              <ActionTile
                icon="add-circle-outline"
                label="Harcama Ekle"
                onPress={() => requireHouse('HarcamaEkle')}
              />
              <ActionTile
                icon="card-outline"
                label="Ödeme Yap"
                onPress={() => requireHouse('OdemeEkle')}
                tone="green"
              />
            </View>

            {!!upcomingBill && (
              <>
                <SectionHeader
                  title="Yaklaşan Faturalar"
                  action="Tümünü Gör"
                  onAction={() => navigation.navigate('MainTabs', { screen: 'Faturalar' })}
                />
                <ListRow
                  icon={getCategoryIconName(upcomingBill.key)}
                  title={getExpenseDisplayTitle(upcomingBill)}
                  subtitle={`${dayLabel(getItemDate(upcomingBill))} tarihli`}
                  amount={upcomingBill.amount}
                  badge="BEKLİYOR"
                  badgeTone="warning"
                  onPress={() => requireHouse('BillDetail', { billId: upcomingBill.id })}
                />
              </>
            )}

            <SectionHeader
              title="Son İşlemler"
              action="Tümünü Gör"
              onAction={() => navigation.navigate('MainTabs', { screen: 'TumHarcamalar' })}
            />
            {recent.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Henüz hareket yok"
                description="İlk ortak harcamanı birkaç saniye içinde ekleyebilirsin."
                action="Harcama Ekle"
                onAction={() => requireHouse('HarcamaEkle')}
              />
            ) : recent.map((item) => (
              <ListRow
                key={String(item.id)}
                icon={getCategoryIconName(item.key)}
                title={getExpenseDisplayTitle(item)}
                subtitle={`${dayLabel(getItemDate(item))}${item.payerName ? ` · Ödeyen: ${item.payerName}` : ''}`}
                amount={item.amount}
                onPress={() => requireHouse('HarcamaDetayi', { expenseId: item.id })}
              />
            ))}

            <TouchableOpacity style={styles.houseFooter} onPress={() => navigation.navigate('GrupListesi')}>
              <Ionicons name="location-outline" size={15} color={theme.colors.text.secondary} />
              <Text style={styles.houseFooterText}>{data.houseName}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    paddingTop: insets.top + 6,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  brandStrip: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  brandCopy: { flex: 1 },
  brandName: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 15 },
  brandTagline: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 11, marginTop: 1 },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
  },
  notificationDot: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.error[600],
  },
  houseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 18,
  },
  houseFooterText: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.medium,
    fontSize: 12,
  },
});
