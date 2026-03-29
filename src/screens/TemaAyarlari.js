// src/screens/ThemeSettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';
import useThemedStyles from '../shared/theme/useThemedStyles';

export default function ThemeSettingsScreen({ navigation }) {
  const { theme, themeKey, setThemeKey } = useTheme();
  const styles = useThemedStyles((t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.surface, padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.neutral?.[100], marginRight: 8 },
    backIcon: { fontSize: 18, color: t.colors.text.primary },
    title: { fontSize: 18, fontWeight: '900', color: t.colors.text.primary },
    card: { backgroundColor: t.colors.background, borderRadius: 12, borderWidth: 1, borderColor: t.colors.neutral?.[200], padding: 12 },
    rowBtn: { borderWidth: 1, borderColor: t.colors.neutral?.[200], borderRadius: 10, padding: 12, marginTop: 10 },
    rowTitle: { fontWeight: '800', color: t.colors.text.primary },
    rowDesc: { color: t.colors.text.secondary, marginTop: 2 },
    active: { borderColor: t.colors.primary?.[600], backgroundColor: t.colors.primary?.[50] },
  }));
  const current = themeKey;

  const onPick = (id) => {
    setThemeKey(id);
  };

  const Item = ({ id, title, desc }) => (
    <TouchableOpacity style={[styles.rowBtn, current === id && styles.active]} onPress={() => onPick(id)} activeOpacity={0.85}>
      <Text style={[styles.rowTitle]}>{title}</Text>
      <Text style={styles.rowDesc}>{desc}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tema</Text>
      </View>

      <View style={styles.card}>
        <Item id="light" title="Açık" desc="Aydınlık tema" />
        <Item id="dark" title="Koyu" desc="Klasik koyu tema" />
        <Item id="amoled" title="Gece (AMOLED)" desc="Siyah arka plan" />
      </View>
    </View>
  );
}

// Stiller useThemedStyles içinde dinamik üretiliyor


