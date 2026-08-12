import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
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

const formatDisplayDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
};

const maskDate = (text) => {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};

const displayToISO = (text) => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text || '');
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(candidate.getTime())
    || candidate.getFullYear() !== Number(year)
    || candidate.getMonth() + 1 !== Number(month)
    || candidate.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};

export default function DateField({ value, onChange, placeholder, minimumDate, maximumDate }) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(() => formatDisplayDate(value));
  const dateValue = parseISODate(value);

  useEffect(() => setDraft(formatDisplayDate(value)), [value]);

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event?.type === 'dismissed') return;
    if (selected) {
      const next = toISODate(selected);
      onChange(next);
      setDraft(formatDisplayDate(next));
    }
  };

  const handleTextChange = (text) => {
    const next = maskDate(text);
    setDraft(next);
    const iso = displayToISO(next);
    if (iso) onChange(iso);
  };

  const styles = makeStyles(theme);

  return (
    <View>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={handleTextChange}
          onBlur={() => setDraft(formatDisplayDate(value))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={10}
          placeholder={placeholder || 'gg.aa.yyyy'}
          placeholderTextColor={theme.colors.text.disabled}
        />
        <TouchableOpacity accessibilityLabel="Takvimden tarih seç" style={styles.calendarButton} onPress={() => setShow(true)} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary[600]} />
        </TouchableOpacity>
      </View>

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
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    minHeight: 48,
    paddingLeft: 12,
  },
  input: { flex: 1, color: theme.colors.text.primary, fontSize: 13, paddingVertical: 10 },
  calendarButton: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  doneBtn: { marginTop: 12, padding: 14, borderRadius: theme.radius.sm, alignItems: 'center', backgroundColor: theme.colors.primary[600] },
  doneBtnText: { color: theme.colors.text.onPrimary, fontWeight: '700' },
});
