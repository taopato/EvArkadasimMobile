// src/screens/LanguageSettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';

export default function LanguageSettingsScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.neutral[100] }]}>
          <Text style={[styles.backIcon, { color: theme.colors.text.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Dil</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.neutral[200] }]}>
        <Text style={[styles.text, { color: theme.colors.text.secondary }]}>Dil ayarları yakında burada.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backIcon: { fontSize: 18 },
  title: { fontSize: 18, fontWeight: '900' },
  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  text: {},
});


