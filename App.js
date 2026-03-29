import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, LogBox, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/shared/theme/ThemeProvider';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import GirisYap from './src/screens/GirisYap';
import KayitOl from './src/screens/KayitOl';
import SifremiUnuttum from './src/screens/SifremiUnuttum';
import AnaSayfa from './src/screens/AnaSayfa';
import EvArkadasiEkle from './src/screens/EvArkadasiEkle';
import TumHarcamalar from './src/screens/TumHarcamalar';
import BorcAlacakOzeti from './src/screens/BorcAlacakOzeti';
import HarcamaOnayi from './src/screens/HarcamaOnayi';
import SifreSifirla from './src/screens/SifreSifirla';
import Dogrulama from './src/screens/Dogrulama';
import EvUyeleri from './src/screens/EvUyeleri';
import Ozet from './src/screens/Ozet';
import HarcamaEkle from './src/screens/HarcamaEkle';
import GrupListesi from './src/screens/GrupListesi';
import YeniEvGrubu from './src/screens/YeniEvGrubu';
import Borclar from './src/screens/Borclar';
import AlacaklarListesi from './src/screens/AlacaklarListesi';
import Alacaklarim from './src/screens/Alacaklarim';
import HarcamaDetayi from './src/screens/HarcamaDetayi';
import DavetEt from './src/screens/DavetEt';
import DavetiyeKabul from './src/screens/DavetiyeKabul';
import OdemeOnayi from './src/screens/OdemeOnayi';
import OdemeEkle from './src/screens/OdemeEkle';
import EvHarcamaOzeti from './src/screens/EvHarcamaOzeti';
import Faturalar from './src/screens/Faturalar';
import FaturaEkle from './src/screens/FaturaEkle';
import FaturaOlustur from './src/screens/FaturaOlustur';
import BekleyenKatkilar from './src/screens/BekleyenKatkilar';
import KisiDetayi from './src/screens/KisiDetayi';
import GunlukHarcamalar from './src/screens/GunlukHarcamalar';
import Odemeler from './src/screens/Odemeler';
import BekleyenOdemeler from './src/screens/BekleyenOdemeler';
import EvGrubuArkadaslarim from './src/screens/EvGrubuArkadaslarim';
import GiderListesi from './src/screens/GiderListesi';
import FaturaListesi from './src/screens/FaturaListesi';
import FaturaDetayi from './src/screens/FaturaDetayi';
import AlacakBorcIcmi from './src/screens/AlacakBorcIcmi';
import DuzenliGiderEkle from './src/screens/DuzenliGiderEkle';
import Ayarlar from './src/screens/Ayarlar';
import TemaAyarlari from './src/screens/TemaAyarlari';
import DefterDetayi from './src/screens/DefterDetayi';
import PlanliOdemeler from './src/screens/PlanliOdemeler';
import HarcamaListesi from './src/screens/HarcamaListesi';
import HarcamaOzeti from './src/screens/HarcamaOzeti';
import FisDetayi from './src/screens/FisDetayi';
import FisGecmisi from './src/screens/FisGecmisi';

const Stack = createNativeStackNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'AsyncStorage has been extracted from react-native core',
  'Require cycle:',
]);

function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary[600]} />
    </View>
  );
}

function ThemedNavigator() {
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const colors = theme.colors;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme.mode !== 'light',
        colors: {
          primary: colors.primary[600],
          background: colors.background,
          card: colors.surface,
          text: colors.text.primary,
          border: colors.neutral[200],
          notification: colors.error[600],
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={user ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text.primary },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: 220,
          fullScreenGestureEnabled: false,
          presentation: 'card',
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={GirisYap} options={{ title: 'Giriş Yap', headerShown: false }} />
            <Stack.Screen name="Register" component={KayitOl} options={{ title: 'Kayıt Ol' }} />
            <Stack.Screen name="SignupScreen" component={KayitOl} options={{ title: 'Kayıt Ol' }} />
            <Stack.Screen name="ForgotPasswordScreen" component={SifremiUnuttum} options={{ title: 'Şifremi Unuttum' }} />
            <Stack.Screen name="ResetPasswordScreen" component={SifreSifirla} options={{ title: 'Şifreyi Sıfırla' }} />
            <Stack.Screen name="VerificationScreen" component={Dogrulama} options={{ title: 'Doğrulama' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={AnaSayfa} options={{ title: 'Ana Menü' }} />
            <Stack.Screen name="ExpensesScreen" component={GunlukHarcamalar} options={{ title: 'Günlük Harcamalar' }} />
            <Stack.Screen name="PaymentsScreen" component={Odemeler} options={{ title: '' }} />
            <Stack.Screen name="PendingPaymentsScreen" component={BekleyenOdemeler} options={{ title: 'Bekleyen Ödemeler' }} />
            <Stack.Screen name="Odemeler" component={Odemeler} options={{ title: '' }} />
            <Stack.Screen name="BekleyenOdemeler" component={BekleyenOdemeler} options={{ title: 'Bekleyen Ödemeler' }} />
            <Stack.Screen name="Harcamalar" component={GunlukHarcamalar} options={{ title: 'Günlük Harcamalar' }} />
            <Stack.Screen name="NewRecurringChargeScreen" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="ExpenseDetail" component={HarcamaDetayi} options={{ title: 'Harcama Detayı' }} />
            <Stack.Screen name="Ayarlar" component={Ayarlar} options={{ title: 'Ayarlar' }} />
            <Stack.Screen name="ThemeSettingsScreen" component={TemaAyarlari} options={{ title: 'Tema' }} />
            <Stack.Screen name="AddHousemate" component={EvArkadasiEkle} options={{ title: 'Ev Arkadaşı Ekle' }} />
            <Stack.Screen name="HarcamaListesi" component={TumHarcamalar} options={{ title: '' }} />
            <Stack.Screen name="ExpenseListScreen" component={TumHarcamalar} options={{ title: '' }} />
            <Stack.Screen name="DebtSummaryScreen" component={BorcAlacakOzeti} options={{ title: '' }} />
            <Stack.Screen name="ExpenseApproval" component={HarcamaOnayi} options={{ title: 'Harcama Onayı' }} />
            <Stack.Screen name="GrupListesi" component={GrupListesi} options={{ title: 'Ev Gruplarım' }} />
            <Stack.Screen name="EvUyeleri" component={EvUyeleri} options={{ title: 'Ev Arkadaşları' }} />
            <Stack.Screen name="Borclar" component={Borclar} options={{ title: 'Borçlarım' }} />
            <Stack.Screen name="AlacaklarListesi" component={AlacaklarListesi} options={{ title: 'Alacaklarım' }} />
            <Stack.Screen name="Alacaklarim" component={Alacaklarim} options={{ title: 'Alacaklarım' }} />
            <Stack.Screen name="HarcamaDetayi" component={HarcamaDetayi} options={{ title: '' }} />
            <Stack.Screen name="HarcamaEkle" component={HarcamaEkle} options={{ title: '' }} />
            <Stack.Screen name="FisDetayi" component={FisDetayi} options={{ title: '' }} />
            <Stack.Screen name="FisGecmisi" component={FisGecmisi} options={{ title: 'Fis Gecmisi' }} />
            <Stack.Screen name="Ozet" component={Ozet} options={{ title: '' }} />
            <Stack.Screen name="YeniEvGrubu" component={YeniEvGrubu} options={{ title: 'Yeni Grup Oluştur' }} />
            <Stack.Screen name="EvGrubuArkadaslarim" component={EvGrubuArkadaslarim} options={{ title: 'Ev Arkadaşlarım' }} />
            <Stack.Screen name="DavetEt" component={DavetEt} options={{ title: 'Arkadaş Davet Et' }} />
            <Stack.Screen name="DavetiyeKabul" component={DavetiyeKabul} options={{ title: 'Davet Kabul Et' }} />
            <Stack.Screen name="OdemeOnayi" component={OdemeOnayi} options={{ title: 'Bekleyen Ödemeler' }} />
            <Stack.Screen name="Faturalar" component={Faturalar} options={{ title: '' }} />
            <Stack.Screen name="FaturaEkle" component={FaturaEkle} options={{ title: 'Yeni Fatura' }} />
            <Stack.Screen name="FaturaListesi" component={FaturaListesi} options={{ title: 'Faturalar' }} />
            <Stack.Screen name="FaturaDetayi" component={FaturaDetayi} options={{ title: 'Fatura Detayı' }} />
            <Stack.Screen name="BillDetail" component={FaturaDetayi} options={{ title: 'Fatura Detayı' }} />
            <Stack.Screen name="FaturaOlustur" component={FaturaOlustur} options={{ title: 'Fatura Oluştur' }} />
            <Stack.Screen name="BekleyenKatkilar" component={BekleyenKatkilar} options={{ title: 'Bekleyen Katkılar' }} />
            <Stack.Screen name="OdemeEkle" component={OdemeEkle} options={{ title: '' }} />
            <Stack.Screen name="GiderListesi" component={GiderListesi} options={{ title: 'Gider Dönemleri' }} />
            <Stack.Screen name="DuzenliGiderEkle" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="DuzenliGiderEkleScreen" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="AlacakBorcIcmi" component={AlacakBorcIcmi} options={{ title: 'Borç/Alacak Detayı' }} />
            <Stack.Screen name="EvHarcamaOzeti" component={EvHarcamaOzeti} options={{ title: 'Harcama Özeti' }} />
            <Stack.Screen name="KisiDetayi" component={KisiDetayi} options={{ title: 'İkili Borç/Alacak Detayı' }} />
            <Stack.Screen name="LedgerDetail" component={DefterDetayi} options={{ title: 'Borç/Alacak Detayları' }} />
            <Stack.Screen name="BillsOverviewScreen" component={Faturalar} options={{ title: '' }} />
            <Stack.Screen name="UtilityBillCreate" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="PendingContributions" component={BekleyenKatkilar} options={{ title: 'Bekleyen Onaylar' }} />
            <Stack.Screen name="PlanliOdemeler" component={PlanliOdemeler} options={{ title: 'Planlı Ödemeler' }} />
            <Stack.Screen name="TumHarcamalar" component={TumHarcamalar} options={{ title: '' }} />
            <Stack.Screen name="HarcamaOzeti" component={HarcamaOzeti} options={{ title: 'Harcama Özeti' }} />
            <Stack.Screen name="HarcamaListesiDetay" component={HarcamaListesi} options={{ title: 'Harcama Listesi' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} backgroundColor={theme.colors.background} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <ThemedNavigator />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
