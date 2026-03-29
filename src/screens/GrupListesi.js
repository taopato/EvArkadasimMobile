import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Platform, ScrollView } from 'react-native';
import useScrollRestore from '../hooks/useScrollRestore';
import { useAuth } from '../context/AuthContext';
import { houseApi } from '../services/api';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';

export default function GroupListScreen({ navigation, route }) {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, setDefaultHouseId } = useAuth();
  const { listRef, handleScroll } = useScrollRestore('GroupListScreen');
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);

  useEffect(() => {
    if (!user || !user.id) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    fetchHouses();
  }, [user]);

  const fetchHouses = async () => {
    setLoading(true);
    try {
      const response = await houseApi.getUserHouses(user.id);
      
      if (response.data && Array.isArray(response.data)) {
        setHouses(response.data);
        if (!user?.defaultHouseId && response.data.length > 0) {
          await setDefaultHouseId(response.data[0].id, response.data[0].name);
        }
      } else {
        console.error('Gelen veri array değil:', typeof response.data);
        setHouses([]);
      }
    } catch (error) {
      console.error('Ev grupları alınamadı:', error);
      setHouses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHouse = () => {
    navigation.navigate('YeniEvGrubu');
  };

  const handleHousePress = async (house) => {
    await setDefaultHouseId(house.id, house.name);
    const redirectTo = route?.params?.redirectTo;
    
    // Yeni harcama ekranları
    if (redirectTo === 'PlanliOdemeler') {
      navigation.navigate('PlanliOdemeler', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'BillsOverviewScreen') {
      navigation.navigate('BillsOverviewScreen', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'TumHarcamalar') {
      navigation.navigate('TumHarcamalar', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'HarcamaOzeti') {
      navigation.navigate('HarcamaOzeti', { houseId: house.id, houseName: house.name });
      return;
    }
    
    // Mevcut ekranlar
    if (redirectTo === 'ExpensesScreen' || redirectTo === 'Harcamalar') {
      navigation.replace('Harcamalar', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'BillsOverviewScreen' || redirectTo === 'Faturalar') {
      navigation.replace('Faturalar', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'NewRecurringChargeScreen' || redirectTo === 'DuzenliGiderEkle') {
      navigation.replace('DuzenliGiderEkle', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'UtilityBillCreate' || redirectTo === 'FaturaOlustur') {
      navigation.replace('FaturaOlustur', { houseId: house.id, houseName: house.name, isEditing: false });
      return;
    }
    if (redirectTo === 'CreatePaymentScreen' || redirectTo === 'OdemeEkle') {
      navigation.replace('OdemeEkle', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'DebtSummaryScreen') {
      navigation.navigate('DebtSummaryScreen', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'HarcamaEkle') {
      navigation.navigate('HarcamaEkle', { houseId: house.id, houseName: house.name });
      return;
    }
    if (redirectTo === 'DuzenliGiderEkle') {
      navigation.navigate('DuzenliGiderEkle', { houseId: house.id, houseName: house.name });
      return;
    }
    
    // Varsayılan: Ev üyeleri ekranına git
    navigation.navigate('EvUyeleri', {
      houseId: house.id,
      houseName: house.name
    });
  };

  const safeFormatDate = (v) => {
    const raw = v || v === 0 ? v : (typeof v === 'string' ? v : undefined);
    const d = raw ? new Date(raw) : null;
    if (!d || isNaN(d.getTime())) return '—';
    try { return d.toLocaleDateString('tr-TR'); } catch { return '—'; }
  };

  const renderHouseItem = ({ item }) => (
    <TouchableOpacity
      style={[CommonStyles.menuButton]}
      onPress={() => handleHousePress(item)}
      activeOpacity={0.8}
    >
      <View style={[CommonStyles.buttonContent, { backgroundColor: Number(user?.defaultHouseId) === Number(item.id) ? ColorThemes.success.background : ColorThemes.primary.background }]}>
        <Text style={CommonStyles.buttonIcon}>🏠</Text>
        <Text style={CommonStyles.buttonText}>{item.name}</Text>
        <Text style={CommonStyles.buttonSubtext}>
          Oluşturulma: {safeFormatDate(item.createdAt || item.created_date || item.createdDate)}
        </Text>
        {Number(user?.defaultHouseId) === Number(item.id) && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Aktif ev</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[CommonStyles.container, { backgroundColor: theme.colors.surface }]}>
      <ScrollView style={[CommonStyles.content, { backgroundColor: theme.colors.surface }]} ref={listRef} onScroll={handleScroll} scrollEventThrottle={16}>
        <View style={CommonStyles.header}>
          <Text style={[CommonStyles.title, { color: theme.colors.text.primary }]}>Ev Gruplarım</Text>
          <Text style={[CommonStyles.subtitle, { color: theme.colors.text.secondary }]}>Ev gruplarınızı görüntüleyin ve yönetin</Text>
        </View>

        {!!user?.defaultHouseId && (
          <View style={styles.activeInfoCard}>
            <Text style={styles.activeInfoEyebrow}>Şu anda aktif</Text>
            <Text style={styles.activeInfoTitle}>{user?.defaultHouseName || `Ev #${user.defaultHouseId}`}</Text>
            <Text style={styles.activeInfoText}>Diğer tüm işlemler bu ev grubu üzerinden devam eder.</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[CommonStyles.menuButton]}
          onPress={handleCreateHouse}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.success.background }]}>
            <Text style={CommonStyles.buttonIcon}>➕</Text>
            <Text style={CommonStyles.buttonText}>Yeni Ev Grubu Oluştur</Text>
            <Text style={CommonStyles.buttonSubtext}>Yeni bir ev grubu oluşturun</Text>
          </View>
        </TouchableOpacity>
        
        {loading ? (
          <View style={CommonStyles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={CommonStyles.loadingText}>Ev grupları yükleniyor...</Text>
          </View>
        ) : houses.length > 0 ? (
          <View style={CommonStyles.listContainer}>
            {houses.map((item) => (
              <View key={item.id.toString()}>
                {renderHouseItem({ item })}
              </View>
            ))}
          </View>
        ) : (
          <View style={CommonStyles.emptyContainer}>
            <Text style={CommonStyles.emptyIcon}>🏠</Text>
            <Text style={CommonStyles.emptyText}>Henüz bir ev grubunuz bulunmamaktadır.</Text>
            <Text style={CommonStyles.emptyText}>İlk ev grubunuzu oluşturmak için yukarıdaki butona tıklayın.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activeInfoCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#EEF8F2',
    borderWidth: 1,
    borderColor: '#B8E3C6',
  },
  activeInfoEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
    color: '#1E7A42',
  },
  activeInfoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  activeInfoText: {
    marginTop: 6,
    color: '#35506B',
    lineHeight: 19,
  },
  activeBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});


