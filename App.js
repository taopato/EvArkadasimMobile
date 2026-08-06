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
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';
import { ThemeProvider, useTheme } from './src/shared/theme/ThemeProvider';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import MainTabBar from './src/shared/ui/MainTabBar';

import GirisYap from './src/screens/GirisYap';
import KayitOl from './src/screens/KayitOl';
import RoomoraHome from './src/screens/roomora/RoomoraHome';
import RoomoraExpenses from './src/screens/roomora/RoomoraExpenses';
import RoomoraBills from './src/screens/roomora/RoomoraBills';
import RoomoraSettings from './src/screens/roomora/RoomoraSettings';
import {
  ForgotPasswordScreen,
  ResetPasswordScreen,
  VerificationScreen,
} from './src/screens/roomora/RoomoraAuthFlows';
import EvUyeleri from './src/screens/EvUyeleri';
import HarcamaEkle from './src/screens/HarcamaEkle';
import GrupListesi from './src/screens/GrupListesi';
import YeniEvGrubu from './src/screens/YeniEvGrubu';
import HarcamaDetayi from './src/screens/HarcamaDetayi';
import DavetEt from './src/screens/DavetEt';
import DavetiyeKabul from './src/screens/DavetiyeKabul';
import FaturaEkle from './src/screens/FaturaEkle';
import FaturaDetayi from './src/screens/FaturaDetayi';
import {
  DebtSummaryScreen,
  DebtsScreen,
  ReceivablesScreen,
  PaymentsScreen,
  PendingPaymentsScreen,
  PersonDetailScreen,
  PaymentReportScreen,
} from './src/screens/roomora/RoomoraFinance';
import DuzenliGiderEkle from './src/screens/DuzenliGiderEkle';
import TemaAyarlari from './src/screens/TemaAyarlari';
import ProfilDuzenle from './src/screens/ProfilDuzenle';
import HarcamaOzeti from './src/screens/HarcamaOzeti';
import FisDetayi from './src/screens/FisDetayi';
import FisGecmisi from './src/screens/FisGecmisi';
import EvNotlari from './src/screens/EvNotlari';
import Bildirimler from './src/screens/Bildirimler';
import HesabiSil from './src/screens/HesabiSil';
import DilAyarlari from './src/screens/DilAyarlari';
import IbanBilgileri from './src/screens/IbanBilgileri';
import {
  AboutScreen,
  LegalDocumentScreen,
  NotificationSettingsScreen,
  SecuritySettingsScreen,
} from './src/screens/SettingsInfo';

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
  prefixes: [
    'roomora://',
    'https://roomora.takosware.com',
    'evarkadasim://',
    'https://evarkadasim.co',
    'https://www.evarkadasim.co',
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          TumHarcamalar: 'giderler',
          Notlar: 'notlar',
          Faturalar: 'faturalar',
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
      detachInactiveScreens={false}
      backBehavior="history"
    >
      <Tab.Screen name="Home" component={RoomoraHome} />
      <Tab.Screen name="TumHarcamalar" component={RoomoraExpenses} />
      <Tab.Screen name="Notlar" component={EvNotlari} />
      <Tab.Screen name="Faturalar" component={RoomoraBills} />
      <Tab.Screen name="Ayarlar" component={RoomoraSettings} />
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
          animationDuration: 240,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          presentation: 'card',
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={GirisYap} options={{ title: 'Giriş Yap', headerShown: false }} />
            <Stack.Screen name="Register" component={KayitOl} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="SignupScreen" component={KayitOl} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="VerificationScreen" component={VerificationScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="DavetiyeKabul" component={DavetiyeKabul} options={{ title: 'Davet Kabul Et', headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false, title: 'Ana Sayfa', gestureEnabled: false }} />
            <Stack.Screen name="PaymentsScreen" component={PaymentsScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="PendingPaymentsScreen" component={PendingPaymentsScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="BekleyenOdemeler" component={PendingPaymentsScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="NewRecurringChargeScreen" component={DuzenliGiderEkle} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="ExpenseDetail" component={HarcamaDetayi} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="ProfilDuzenle" component={ProfilDuzenle} options={{ title: 'Profili Düzenle', headerShown: false }} />
            <Stack.Screen name="IbanBilgileri" component={IbanBilgileri} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="ThemeSettingsScreen" component={TemaAyarlari} options={{ title: 'Tema', headerShown: false }} />
            <Stack.Screen name="HarcamaListesi" component={RoomoraExpenses} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="ExpenseListScreen" component={RoomoraExpenses} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="DebtSummaryScreen" component={DebtSummaryScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="GrupListesi" component={GrupListesi} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="EvUyeleri" component={EvUyeleri} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="Borclar" component={DebtsScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="Alacaklarim" component={ReceivablesScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="HarcamaDetayi" component={HarcamaDetayi} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="HarcamaEkle" component={HarcamaEkle} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="FisDetayi" component={FisDetayi} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="FisGecmisi" component={FisGecmisi} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="YeniEvGrubu" component={YeniEvGrubu} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="DavetEt" component={DavetEt} options={{ title: 'Arkadaş Davet Et', headerShown: false }} />
            <Stack.Screen name="DavetiyeKabul" component={DavetiyeKabul} options={{ title: 'Davet Kabul Et', headerShown: false }} />
            <Stack.Screen
              name="FaturaEkle"
              component={FaturaEkle}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="FaturaDetayi" component={FaturaDetayi} options={{ headerShown: false }} />
            <Stack.Screen name="BillDetail" component={FaturaDetayi} options={{ headerShown: false }} />
            <Stack.Screen name="OdemeEkle" component={PaymentReportScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="DuzenliGiderEkle" component={DuzenliGiderEkle} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="DuzenliGiderEkleScreen" component={DuzenliGiderEkle} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="AlacakBorcIcmi" component={PersonDetailScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="KisiDetayi" component={PersonDetailScreen} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="BillsOverviewScreen" component={RoomoraBills} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="UtilityBillCreate" component={DuzenliGiderEkle} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="HarcamaOzeti" component={HarcamaOzeti} options={{ title: 'Harcama Özeti', headerShown: false }} />
            <Stack.Screen name="EvNotlari" component={EvNotlari} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="Bildirimler" component={Bildirimler} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LanguageSettings" component={DilAyarlari} options={{ title: '', headerShown: false }} />
            <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} options={{ headerShown: false }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HesabiSil" component={HesabiSil} options={{ headerShown: false }} />
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
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <ThemedStatusBar />
                <ThemedNavigator />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
