// src/components/EmptyState.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';

const EmptyState = ({ icon = '📭', title = 'Kayıt yok', subtitle }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { color: theme.colors.text.secondary }]}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },
  icon: { fontSize: 42, marginBottom: 6 },
  title: { fontWeight: '900' },
  sub: { marginTop: 4, textAlign: 'center' },
});

export default EmptyState;
