import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, LogBox, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/shared/theme/ThemeProvider';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import MainTabBar from './src/shared/ui/MainTabBar';

import GirisYap from './src/screens/GirisYap';
import KayitOl from './src/screens/KayitOl';
import SifremiUnuttum from './src/screens/SifremiUnuttum';
import AnaSayfa from './src/screens/AnaSayfa';
import TumHarcamalar from './src/screens/TumHarcamalar';
import BorcAlacakOzeti from './src/screens/BorcAlacakOzeti';
import SifreSifirla from './src/screens/SifreSifirla';
import Dogrulama from './src/screens/Dogrulama';
import EvUyeleri from './src/screens/EvUyeleri';
import HarcamaEkle from './src/screens/HarcamaEkle';
import GrupListesi from './src/screens/GrupListesi';
import YeniEvGrubu from './src/screens/YeniEvGrubu';
import Borclar from './src/screens/Borclar';
import Alacaklarim from './src/screens/Alacaklarim';
import HarcamaDetayi from './src/screens/HarcamaDetayi';
import DavetEt from './src/screens/DavetEt';
import DavetiyeKabul from './src/screens/DavetiyeKabul';
import OdemeEkle from './src/screens/OdemeEkle';
import Faturalar from './src/screens/Faturalar';
import FaturaEkle from './src/screens/FaturaEkle';
import KisiDetayi from './src/screens/KisiDetayi';
import Odemeler from './src/screens/Odemeler';
import BekleyenOdemeler from './src/screens/BekleyenOdemeler';
import FaturaDetayi from './src/screens/FaturaDetayi';
import AlacakBorcIcmi from './src/screens/AlacakBorcIcmi';
import DuzenliGiderEkle from './src/screens/DuzenliGiderEkle';
import Ayarlar from './src/screens/Ayarlar';
import TemaAyarlari from './src/screens/TemaAyarlari';
import ProfilDuzenle from './src/screens/ProfilDuzenle';
import HarcamaOzeti from './src/screens/HarcamaOzeti';
import FisDetayi from './src/screens/FisDetayi';
import FisGecmisi from './src/screens/FisGecmisi';
import DilAyarlari from './src/screens/DilAyarlari';
import EvNotlari from './src/screens/EvNotlari';
import Bildirimler from './src/screens/Bildirimler';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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

const linking = {
  prefixes: ['roomora://', 'evarkadasim://', 'https://evarkadasim.co', 'https://www.evarkadasim.co'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          TumHarcamalar: 'tum-harcamalar',
          Faturalar: 'faturalar',
          Odemeler: 'odemeler',
          Ayarlar: 'ayarlar',
        },
      },
      Login: 'login',
      Register: 'register',
      SignupScreen: 'signup',
      ForgotPasswordScreen: 'forgot-password',
      ResetPasswordScreen: 'reset-password',
      VerificationScreen: 'verify',
      DavetiyeKabul: {
        path: 'davetiye-kabul',
        parse: {
          token: (token) => token,
          houseId: (id) => Number(id),
          email: (email) => decodeURIComponent(email),
        },
      },
      DavetEt: 'davet-et',
      GrupListesi: 'grup-listesi',
      EvUyeleri: 'ev-uyeleri',
      HarcamaEkle: 'harcama-ekle',
      HarcamaDetayi: 'harcama-detayi',
      FaturaDetayi: 'fatura-detayi',
      BekleyenOdemeler: 'bekleyen-odemeler',
      DebtSummaryScreen: 'debt-summary',
      ThemeSettingsScreen: 'theme-settings',
      DilAyarlari: 'dil-ayarlari',
      EvNotlari: 'ev-notlari',
      Bildirimler: 'bildirimler',
    },
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <MainTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={AnaSayfa} />
      <Tab.Screen name="TumHarcamalar" component={TumHarcamalar} />
      <Tab.Screen name="Faturalar" component={Faturalar} />
      <Tab.Screen name="Odemeler" component={Odemeler} />
      <Tab.Screen name="Ayarlar" component={Ayarlar} />
    </Tab.Navigator>
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
      linking={linking}
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
        initialRouteName={user ? 'MainTabs' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text.primary },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: 220,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
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
            <Stack.Screen name="DavetiyeKabul" component={DavetiyeKabul} options={{ title: 'Davet Kabul Et', headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false, title: 'Ana Sayfa', gestureEnabled: false }} />
            <Stack.Screen name="PaymentsScreen" component={Odemeler} options={{ title: '' }} />
            <Stack.Screen name="PendingPaymentsScreen" component={BekleyenOdemeler} options={{ title: 'Bekleyen Ödemeler' }} />
            <Stack.Screen name="BekleyenOdemeler" component={BekleyenOdemeler} options={{ title: 'Bekleyen Ödemeler' }} />
            <Stack.Screen name="NewRecurringChargeScreen" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="ExpenseDetail" component={HarcamaDetayi} options={{ title: 'Harcama Detayı' }} />
            <Stack.Screen name="ProfilDuzenle" component={ProfilDuzenle} options={{ title: 'Profili Düzenle', headerShown: false }} />
            <Stack.Screen name="ThemeSettingsScreen" component={TemaAyarlari} options={{ title: 'Tema', headerShown: false }} />
            <Stack.Screen name="HarcamaListesi" component={TumHarcamalar} options={{ title: '' }} />
            <Stack.Screen name="ExpenseListScreen" component={TumHarcamalar} options={{ title: '' }} />
            <Stack.Screen name="DebtSummaryScreen" component={BorcAlacakOzeti} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="GrupListesi" component={GrupListesi} options={{ title: 'Ev Gruplarım' }} />
            <Stack.Screen name="EvUyeleri" component={EvUyeleri} options={{ title: 'Ev Arkadaşları' }} />
            <Stack.Screen name="Borclar" component={Borclar} options={{ title: 'Borçlarım' }} />
            <Stack.Screen name="Alacaklarim" component={Alacaklarim} options={{ title: 'Alacaklarım' }} />
            <Stack.Screen name="HarcamaDetayi" component={HarcamaDetayi} options={{ title: '' }} />
            <Stack.Screen name="HarcamaEkle" component={HarcamaEkle} options={{ title: '' }} />
            <Stack.Screen name="FisDetayi" component={FisDetayi} options={{ title: '' }} />
            <Stack.Screen name="FisGecmisi" component={FisGecmisi} options={{ title: 'Fiş Geçmişi' }} />
            <Stack.Screen name="YeniEvGrubu" component={YeniEvGrubu} options={{ title: 'Yeni Grup Oluştur' }} />
            <Stack.Screen name="DavetEt" component={DavetEt} options={{ title: 'Arkadaş Davet Et', headerShown: false }} />
            <Stack.Screen name="DavetiyeKabul" component={DavetiyeKabul} options={{ title: 'Davet Kabul Et', headerShown: false }} />
            <Stack.Screen
              name="FaturaEkle"
              component={FaturaEkle}
              options={({ route }) => ({ title: route.params?.isEditing ? 'Faturayı Düzenle' : 'Yeni Fatura' })}
            />
            <Stack.Screen name="FaturaDetayi" component={FaturaDetayi} options={{ title: 'Fatura Detayı' }} />
            <Stack.Screen name="BillDetail" component={FaturaDetayi} options={{ title: 'Fatura Detayı' }} />
            <Stack.Screen name="OdemeEkle" component={OdemeEkle} options={{ title: '' }} />
            <Stack.Screen name="DuzenliGiderEkle" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="DuzenliGiderEkleScreen" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="AlacakBorcIcmi" component={AlacakBorcIcmi} options={{ title: 'Borç/Alacak Detayı' }} />
            <Stack.Screen name="KisiDetayi" component={KisiDetayi} options={{ title: 'İkili Borç/Alacak Detayı' }} />
            <Stack.Screen name="BillsOverviewScreen" component={Faturalar} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="UtilityBillCreate" component={DuzenliGiderEkle} options={{ title: '' }} />
            <Stack.Screen name="HarcamaOzeti" component={HarcamaOzeti} options={{ title: 'Harcama Özeti', headerShown: false }} />
            <Stack.Screen name="DilAyarlari" component={DilAyarlari} options={{ title: 'Dil Ayarları' }} />
            <Stack.Screen name="EvNotlari" component={EvNotlari} options={{ title: 'Ev Notları' }} />
            <Stack.Screen name="Bildirimler" component={Bildirimler} options={{ title: 'Bildirimler' }} />
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
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <ThemedStatusBar />
                <ThemedNavigator />
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
