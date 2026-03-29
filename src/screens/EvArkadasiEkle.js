import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { houseApi } from '../services/api';

const AddHousemateScreen = ({ navigation, route }) => {
  const { houseId, houseName } = route.params || {};
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddHousemate = async () => {
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen email adresini girin.');
      return;
    }

    if (!houseId) {
      Alert.alert('Hata', 'Ev bilgisi eksik.');
      return;
    }

    setLoading(true);
    try {
      const response = await houseApi.sendInvitation(houseId, email.trim());
      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          'Başarılı',
          'Davet gönderildi! Kullanıcı email adresine davet linki alacak.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setEmail('');
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Davet gönderme hatası:', error);
      Alert.alert('Hata', 'Davet gönderilemedi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={CommonStyles.container}>
      <ScrollView style={CommonStyles.content}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Ev Arkadaşı Ekle</Text>
          <Text style={CommonStyles.subtitle}>
            {houseName || 'Ev'} grubuna yeni üye davet edin
          </Text>
        </View>

        <View style={CommonStyles.card}>
          <View style={CommonStyles.inputContainer}>
            <Text style={CommonStyles.label}>Email Adresi</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, padding: 12, backgroundColor: theme.colors.background, fontSize: 16, color: theme.colors.text.primary }}
              placeholder="arkadas@email.com"
              placeholderTextColor={theme.colors.text.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.infoText}>
            📧 Davet gönderilecek kişinin email adresini girin. 
            Kullanıcı email adresine davet linki alacak ve ev grubuna katılabilecek.
          </Text>
        </View>

        <TouchableOpacity 
          style={[
            CommonStyles.menuButton,
            (!email.trim() || loading) && { opacity: 0.5 }
          ]}
          onPress={handleAddHousemate}
          disabled={!email.trim() || loading}
          activeOpacity={0.8}
        >
          <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background }]}>
            <Text style={CommonStyles.buttonIcon}>👥</Text>
            <Text style={CommonStyles.buttonText}>
              {loading ? "Gönderiliyor..." : "Davet Gönder"}
            </Text>
            <Text style={CommonStyles.buttonSubtext}>Ev arkadaşını davet et</Text>
          </View>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    infoText: { fontSize: 14, color: theme.colors.text.secondary, lineHeight: 20, marginTop: 16, padding: 12, backgroundColor: theme.colors.neutral[50], borderRadius: 8, borderLeftWidth: 4, borderLeftColor: theme.colors.primary[300] },
    loadingOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.7)'
    },
  });
}

export default AddHousemateScreen;
