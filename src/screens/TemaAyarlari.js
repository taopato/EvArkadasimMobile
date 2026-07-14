import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PALETTES } from '../shared/theme/palettes';
import { shadow } from '../shared/ui/shadow';

const options = [
  {
    id: 'light',
    icon: 'sunny-outline',
    title: 'Açık Tema',
    desc: 'Gündüz kullanımı için ideal, parlak görünüm.',
  },
  {
    id: 'amoled',
    icon: 'moon-outline',
    title: 'Gece Tema',
    desc: 'Göz yorgunluğunu azaltan koyu, derin siyah arayüz.',
  },
];

export default function ThemeSettingsScreen({ navigation }) {
  const { theme, themeKey, setThemeKey, paletteKey, setPaletteKey } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tema Ayarları</Text>
        <View style={styles.previewBubble}>
          <Text style={styles.previewText}>Aa</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Uygulamanın görünümünü tercihinize göre özelleştirin.</Text>

        <View style={styles.optionStack}>
          {options.map((item) => {
            const active = themeKey === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => setThemeKey(item.id)}
                style={[styles.optionCard, active && styles.optionCardActive]}
              >
                {active && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={26} color={theme.colors.primary[600]} />
                  </View>
                )}
                <View style={[styles.optionIconWrap, active && styles.optionIconWrapActive]}>
                  <Ionicons name={item.icon} size={34} color={active ? theme.colors.primary[700] : theme.colors.neutral[600]} />
                </View>
                <Text style={styles.optionTitle}>{item.title}</Text>
                <Text style={styles.optionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.paletteSection}>
          <Text style={styles.paletteTitle}>Renk Paleti <Text style={styles.paletteBadge}>Test</Text></Text>
          <Text style={styles.paletteLead}>
            Farklı renk paletlerini dene, hangisini beğendiğine karar ver. Bu bölüm geliştirme aşamasında test amaçlıdır.
          </Text>
          <View style={styles.paletteGrid}>
            {PALETTES.map((p) => {
              const active = paletteKey === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  activeOpacity={0.9}
                  onPress={() => setPaletteKey(p.key)}
                  style={styles.paletteCard}
                >
                  <View style={[
                    styles.paletteSwatch,
                    { backgroundColor: p.swatch },
                    active && { borderColor: theme.colors.text.primary },
                  ]}>
                    {active && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </View>
                  <Text style={styles.paletteCardLabel}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      height: 60 + insets.top,
      paddingHorizontal: 22,
      paddingTop: insets.top + 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: theme.colors.text.primary,
      fontSize: 20,
      fontWeight: '900',
    },
    previewBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary[100],
      borderWidth: 1,
      borderColor: theme.colors.primary[200],
    },
    previewText: {
      color: theme.colors.primary[800],
      fontWeight: '900',
    },
    content: {
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 36,
    },
    lead: {
      color: theme.colors.text.secondary,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
      marginBottom: 24,
    },
    optionStack: {
      gap: 14,
    },
    optionCard: {
      borderRadius: 20,
      borderWidth: 1.2,
      borderColor: theme.colors.neutral[200],
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 24,
      ...shadow(1, 'rgba(23,40,57,0.08)'),
    },
    optionCardActive: {
      borderWidth: 2,
      borderColor: theme.colors.primary[600],
      backgroundColor: theme.colors.primary[50],
    },
    checkBadge: {
      position: 'absolute',
      top: 14,
      right: 14,
    },
    optionIconWrap: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor: theme.colors.neutral[100],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    optionIconWrapActive: {
      backgroundColor: theme.colors.primary[100],
    },
    optionTitle: {
      color: theme.colors.text.primary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 8,
    },
    optionDesc: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    paletteSection: {
      marginTop: 32,
    },
    paletteTitle: {
      color: theme.colors.text.primary,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 6,
    },
    paletteBadge: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.warning[700],
      backgroundColor: theme.colors.warning[50],
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    paletteLead: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 18,
    },
    paletteGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    paletteCard: {
      alignItems: 'center',
      width: 84,
    },
    paletteSwatch: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    paletteCardLabel: {
      color: theme.colors.text.primary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
