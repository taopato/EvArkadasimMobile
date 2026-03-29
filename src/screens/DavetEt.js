// src/screens/InviteFriendScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { houseApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';

const InviteFriendScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const activeHouseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const activeHouseName = route?.params?.houseName || user?.defaultHouseName || 'Aktif Ev';
  const [email, setEmail] = useState('');
  const { theme } = useTheme();
  const CommonStyles = useCommonStyles();
  const ColorThemes = makeColorThemes(theme);

  const sendInvite = async () => {
    if (!activeHouseId || !email.trim()) {
      Alert.alert('Hata', 'Ev ve e-posta zorunludur.');
      return;
    }
    try {
      await houseApi.sendInvitation(activeHouseId, email.trim());
      Alert.alert('Başarılı', 'Davet gönderildi.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Hata', e?.response?.data?.message || e?.message || 'Davet gönderilemedi');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[CommonStyles.container, { backgroundColor: theme.colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={[CommonStyles.content, { backgroundColor: theme.colors.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={CommonStyles.header}>
          <Text style={[CommonStyles.title, { color: theme.colors.text.primary }]}>Arkadaş Davet Et</Text>
          <Text style={[CommonStyles.subtitle, { color: theme.colors.text.secondary }]}>{activeHouseName} • E-posta ile davet</Text>
        </View>

        <View style={[CommonStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral?.[200] }]}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>E-posta</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.neutral?.[300], backgroundColor: theme.colors.background, color: theme.colors.text.primary }]}
            placeholder="ornek@email.com"
            placeholderTextColor={theme.colors.neutral?.[500]}
            selectionColor={theme.colors.primary?.[500]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={CommonStyles.menuButton} onPress={sendInvite} activeOpacity={0.8}>
            <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.primary.background }]}>
              <Text style={CommonStyles.buttonIcon}>📧</Text>
              <Text style={CommonStyles.buttonText}>Davet Gönder</Text>
              <Text style={CommonStyles.buttonSubtext}>Eve katılmaları için bağlantı gönder</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={CommonStyles.menuButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <View style={[CommonStyles.buttonContent, { backgroundColor: ColorThemes.neutral.background }]}>
              <Text style={CommonStyles.buttonIcon}>🔙</Text>
              <Text style={CommonStyles.buttonText}>Geri Dön</Text>
              <Text style={CommonStyles.buttonSubtext}>Önceki sayfa</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 16,
  },
});

export default InviteFriendScreen;
