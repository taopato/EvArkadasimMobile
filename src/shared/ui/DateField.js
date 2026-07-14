import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISODate = (value) => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date();
};

export default function DateField({ value, onChange, placeholder, minimumDate, maximumDate }) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const dateValue = parseISODate(value);

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event?.type === 'dismissed') return;
    if (selected) onChange(toISODate(selected));
  };

  const styles = makeStyles(theme);

  return (
    <View>
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.85}>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.text.secondary} />
        <Text style={[styles.text, { color: value ? theme.colors.text.primary : theme.colors.text.disabled }]}>
          {value ? dateValue.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : (placeholder || 'Tarih seç')}
        </Text>
      </TouchableOpacity>

      {show && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={show} onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShow(false)}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="inline"
                themeVariant={theme.mode === 'light' ? 'light' : 'dark'}
                accentColor={theme.colors.primary[600]}
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale="tr-TR"
              />
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShow(false)} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="calendar"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
  },
  text: { flex: 1, fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  doneBtn: { marginTop: 12, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary[600] },
  doneBtnText: { color: theme.colors.text.onPrimary, fontWeight: '700' },
});
