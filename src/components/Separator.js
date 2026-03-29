// src/components/Separator.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../shared/theme/ThemeProvider';

const Separator = ({ inset = 0 }) => {
  const { theme } = useTheme();
  return <View style={[styles.sep, { marginLeft: inset, backgroundColor: theme.colors.neutral?.[200] }]} />;
};

const styles = StyleSheet.create({
  sep: { height: 1, marginVertical: 8 },
});

export default Separator;
