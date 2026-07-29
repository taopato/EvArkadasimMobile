import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import BrandMark from '../components/BrandMark';

const notificationDefaults = {
  payment: true,
  bill: true,
  house: true,
};

const LEGAL_LAST_UPDATED = '28.07.2026';
const SUPPORT_EMAIL = 'info.ev.arkadasim@gmail.com';

const legalCopy = {
  privacy: {
    title: 'Gizlilik Politikası',
    sections: [
      ['Topladığımız bilgiler', 'Hesabınızı ve ortak ev kayıtlarını çalıştırmak için ad, e-posta, telefon, profil fotoğrafı ve uygulamaya eklediğiniz finansal kayıtları işleriz.'],
      ['Bilgilerin kullanımı', 'Veriler yalnızca Roomora özelliklerini sunmak, hesabınızı korumak ve kullanıcı desteği sağlamak amacıyla kullanılır.'],
      ['Paylaşım ve saklama', 'Ev içi kayıtlar yalnızca aynı eve davet edilen üyelerle paylaşılır. Kişisel verileriniz yasal zorunluluk dışında üçüncü taraflara satılmaz. Hesap ve profil verileri hesabınız aktif olduğu sürece saklanır.'],
      ['Silme ve kayıt bütünlüğü', 'Hesabınızı Ayarlar ekranından silebilirsiniz. Profil ve iletişim bilgileriniz kaldırılır. Daha önce paylaşılan finansal kayıtlar, diğer ev üyelerinin bakiye ve kayıt bütünlüğünü korumak için anonimleştirilmiş kullanıcıyla ilişkilendirilebilir.'],
      ['Haklarınız ve iletişim', `Verilerinize erişme, düzeltme veya silme talepleriniz için ${SUPPORT_EMAIL} adresinden bize ulaşabilirsiniz.`],
    ],
  },
  terms: {
    title: 'Kullanım Koşulları',
    sections: [
      ['Hizmetin kapsamı', 'Roomora, ortak yaşam giderlerinin kaydı ve üyeler arasında takibi için yardımcı bir araçtır; banka veya ödeme kuruluşu değildir.'],
      ['Kullanıcı sorumluluğu', 'Eklediğiniz kayıtların doğruluğundan ve ev grubunuza davet ettiğiniz kişilerden siz sorumlusunuz.'],
      ['Ödeme bildirimleri', 'Uygulamadaki ödeme durumları kullanıcı beyanı ve karşı taraf onayına dayanır. Gerçek para transferi Roomora üzerinden yapılmaz.'],
      ['Hesap güvenliği', 'Giriş bilgilerinizi korumalı ve yetkisiz kullanım şüphesinde şifrenizi yenilemelisiniz.'],
      ['İletişim', `Hizmet ve hesap talepleriniz için ${SUPPORT_EMAIL} adresinden bize ulaşabilirsiniz.`],
    ],
  },
};

function ScreenShell({ navigation, title, children }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Geri" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.back} />
      </View>
      {children(styles, theme)}
    </View>
  );
}

export function NotificationSettingsScreen({ navigation }) {
  const [values, setValues] = useState(notificationDefaults);

  useEffect(() => {
    AsyncStorage.getItem('notification_preferences')
      .then((raw) => raw && setValues({ ...notificationDefaults, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const change = (key, value) => {
    const next = { ...values, [key]: value };
    setValues(next);
    AsyncStorage.setItem('notification_preferences', JSON.stringify(next)).catch(() => {});
  };

  const items = [
    ['payment', 'Ödeme bildirimleri', 'Yeni ödeme ve onay sonuçları'],
    ['bill', 'Fatura hatırlatmaları', 'Yaklaşan ve geciken faturalar'],
    ['house', 'Ev hareketleri', 'Davetler, üyeler ve ev notları'],
  ];

  return (
    <ScreenShell navigation={navigation} title="Bildirim Ayarları">
      {(styles, theme) => (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>Sadece sana yardımcı olacak bildirimleri seç.</Text>
          <View style={styles.card}>
            {items.map(([key, title, desc], index) => (
              <View key={key} style={[styles.settingRow, index > 0 && styles.divider]}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  <Text style={styles.rowDesc}>{desc}</Text>
                </View>
                <Switch
                  value={values[key]}
                  onValueChange={(value) => change(key, value)}
                  trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[200] }}
                  thumbColor={values[key] ? theme.colors.primary[600] : theme.colors.surface}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

export function SecuritySettingsScreen({ navigation }) {
  return (
    <ScreenShell navigation={navigation} title="Güvenlik">
      {(styles, theme) => (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.iconTitle}>
              <View style={styles.iconWrap}>
                <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary[600]} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>Hesap güvenliği</Text>
                <Text style={styles.rowDesc}>Oturumun güvenli token ile korunuyor.</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.outlineButton} onPress={() => navigation.navigate('HesabiSil')}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error[700]} />
            <Text style={styles.dangerText}>Hesabımı sil</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

export function LegalDocumentScreen({ navigation, route }) {
  const document = legalCopy[route?.params?.type] || legalCopy.privacy;
  return (
    <ScreenShell navigation={navigation} title={document.title}>
      {(styles) => (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.legalUpdated}>Son güncelleme: {LEGAL_LAST_UPDATED}</Text>
          {document.sections.map(([title, body]) => (
            <View key={title} style={styles.legalSection}>
              <Text style={styles.legalTitle}>{title}</Text>
              <Text style={styles.legalBody}>{body}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

export function AboutScreen({ navigation }) {
  const version = Constants?.expoConfig?.version || '1.0.0';
  return (
    <ScreenShell navigation={navigation} title="Hakkında">
      {(styles) => (
        <ScrollView contentContainerStyle={[styles.content, styles.aboutContent]}>
          <BrandMark variant="logo" size={156} />
          <Text style={styles.brand}>Roomora</Text>
          <Text style={styles.tagline}>Ortak yaşamın kolay hali</Text>
          <Text style={styles.version}>Sürüm {version}</Text>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingTop: insets.top + 8,
    height: insets.top + 60,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.text.primary,
    fontFamily: theme.typography?.bold,
    fontSize: 17,
    letterSpacing: 0,
  },
  content: { padding: 18, paddingBottom: insets.bottom + 28 },
  intro: { color: theme.colors.text.secondary, fontFamily: theme.typography?.regular, fontSize: 14, marginBottom: 16 },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  settingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: theme.colors.neutral[200] },
  rowCopy: { flex: 1 },
  rowTitle: { color: theme.colors.text.primary, fontFamily: theme.typography?.bold, fontSize: 15 },
  rowDesc: { color: theme.colors.text.secondary, fontFamily: theme.typography?.regular, fontSize: 12, marginTop: 3, lineHeight: 17 },
  iconTitle: { minHeight: 84, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50], marginRight: 12 },
  outlineButton: { height: 52, marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.error[200], flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  dangerText: { color: theme.colors.error[700], fontFamily: theme.typography?.bold, fontSize: 15 },
  legalUpdated: { color: theme.colors.text.secondary, fontFamily: theme.typography?.regular, fontSize: 12, marginBottom: 20 },
  legalSection: { marginBottom: 22 },
  legalTitle: { color: theme.colors.text.primary, fontFamily: theme.typography?.bold, fontSize: 17, marginBottom: 8 },
  legalBody: { color: theme.colors.text.secondary, fontFamily: theme.typography?.regular, fontSize: 15, lineHeight: 23 },
  legalNote: { color: theme.colors.warning[700], fontFamily: theme.typography?.medium, fontSize: 12, lineHeight: 18 },
  aboutContent: { alignItems: 'center', paddingTop: 36 },
  brand: { color: theme.colors.text.primary, fontFamily: theme.typography?.extrabold, fontSize: 28, marginTop: 16 },
  tagline: { color: theme.colors.text.secondary, fontFamily: theme.typography?.regular, fontSize: 16, marginTop: 5 },
  version: { color: theme.colors.text.secondary, fontFamily: theme.typography?.medium, fontSize: 13, marginTop: 20 },
});
