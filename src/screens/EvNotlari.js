import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { houseNotesApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { PageHeader } from '../shared/ui/roomora/CanonicalUI';
import { shadow } from '../shared/ui/shadow';

const normalizeBoard = (payload) => {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  return sections.map((section) => ({
    ...section,
    items: Array.isArray(section?.items) ? section.items : [],
    completedItems: Array.isArray(section?.completedItems) ? section.completedItems : [],
  }));
};

const notePreferenceKey = (houseId) => `roomora:notes:${houseId}:view`;

export default function EvNotlari({ route, navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const isMainTab = route?.name === 'Notlar';
  const houseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const houseName = route?.params?.houseName || user?.defaultHouseName || 'Aktif Ev';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [mode, setMode] = useState('active');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [itemDraft, setItemDraft] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadBoard = async () => {
    if (!houseId) {
      setSections([]);
      setLoading(false);
      return;
    }

    try {
      const response = await houseNotesApi.getBoard(houseId);
      const next = normalizeBoard(response?.data);
      const savedPreference = await AsyncStorage.getItem(notePreferenceKey(houseId))
        .then((value) => (value ? JSON.parse(value) : null))
        .catch(() => null);
      setSections(next);
      setSelectedSectionId((current) => (
        next.some((section) => Number(section.id) === Number(current))
          ? current
          : next.find((section) => Number(section.id) === Number(savedPreference?.sectionId))?.id
            ?? next[0]?.id
            ?? null
      ));
      if (savedPreference?.mode === 'active' || savedPreference?.mode === 'history') {
        setMode(savedPreference.mode);
      }
      if (next.length === 0) setShowCreate(true);
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Notlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadBoard();
  }, [houseId]);

  useEffect(() => {
    if (!houseId || !selectedSectionId) return;
    AsyncStorage.setItem(
      notePreferenceKey(houseId),
      JSON.stringify({ sectionId: selectedSectionId, mode })
    ).catch(() => {});
  }, [houseId, mode, selectedSectionId]);

  const selectedSection = sections.find(
    (section) => Number(section.id) === Number(selectedSectionId)
  ) || sections[0] || null;
  const activeCount = sections.reduce((total, section) => total + section.items.length, 0);
  const historyCount = sections.reduce((total, section) => total + section.completedItems.length, 0);
  const visibleItems = mode === 'active'
    ? selectedSection?.items || []
    : selectedSection?.completedItems || [];

  const confirmAction = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sil', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const createSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    setSubmitting(true);
    try {
      const response = await houseNotesApi.createSection(houseId, title);
      setNewSectionTitle('');
      setShowCreate(false);
      await loadBoard();
      const createdId = response?.data?.id ?? response?.data?.data?.id;
      if (createdId) setSelectedSectionId(createdId);
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Liste oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = async () => {
    const content = itemDraft.trim();
    if (!selectedSection?.id || !content) return;
    setSubmitting(true);
    try {
      await houseNotesApi.createItem(selectedSection.id, content);
      setItemDraft('');
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Madde eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeItem = async (itemId) => {
    try {
      await houseNotesApi.completeItem(itemId);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Madde tamamlanamadı.');
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await houseNotesApi.deleteItem(itemId);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Madde kaldırılamadı.');
    }
  };

  const deleteSection = async () => {
    if (!selectedSection) return;
    const confirmed = await confirmAction(
      'Listeyi sil',
      `"${selectedSection.title}" listesini kaldırmak istediğine emin misin?`
    );
    if (!confirmed) return;
    try {
      await houseNotesApi.deleteSection(selectedSection.id);
      setSelectedSectionId(null);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Liste silinemedi.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={isMainTab ? 72 : 12}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="never"
      >
        <PageHeader
          title="Notlar"
          subtitle={houseName}
          onBack={isMainTab ? undefined : () => navigation.goBack()}
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary[600]} />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="list-outline" size={26} color={theme.colors.primary[700]} />
            </View>
            <Text style={styles.emptyTitle}>İlk not listeni oluştur</Text>
            <Text style={styles.emptyText}>Market, ev işleri veya alınacaklar için ortak bir liste aç.</Text>
            <View style={styles.createRow}>
              <TextInput
                style={styles.input}
                value={newSectionTitle}
                onChangeText={setNewSectionTitle}
                placeholder="Örn. Market"
                placeholderTextColor={theme.colors.text.disabled}
                returnKeyType="done"
                onSubmitEditing={createSection}
              />
              <TouchableOpacity style={styles.iconAction} onPress={createSection} disabled={submitting}>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.text.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.listSelectorHeader}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listSelector}
                keyboardShouldPersistTaps="handled"
              >
                {sections.map((section) => {
                  const selected = Number(section.id) === Number(selectedSection?.id);
                  return (
                    <TouchableOpacity
                      key={String(section.id)}
                      style={[styles.listChip, selected && styles.listChipActive]}
                      onPress={() => {
                        setSelectedSectionId(section.id);
                        setItemDraft('');
                      }}
                    >
                      <Text style={[styles.listChipText, selected && styles.listChipTextActive]}>
                        {section.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                accessibilityLabel="Yeni liste oluştur"
                style={styles.addListButton}
                onPress={() => setShowCreate((value) => !value)}
              >
                <Ionicons name={showCreate ? 'close' : 'add'} size={20} color={theme.colors.primary[700]} />
              </TouchableOpacity>
            </View>

            {showCreate ? (
              <View style={styles.compactCreate}>
                <TextInput
                  autoFocus
                  style={styles.input}
                  value={newSectionTitle}
                  onChangeText={setNewSectionTitle}
                  placeholder="Yeni liste adı"
                  placeholderTextColor={theme.colors.text.disabled}
                  returnKeyType="done"
                  onSubmitEditing={createSection}
                />
                <TouchableOpacity style={styles.iconAction} onPress={createSection} disabled={submitting}>
                  <Ionicons name="checkmark" size={20} color={theme.colors.text.onPrimary} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={styles.noteHeading}>
                  <Text style={styles.noteTitle}>{selectedSection?.title}</Text>
                  <Text style={styles.noteMeta}>
                    {selectedSection?.items.length || 0} açık madde
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Listeyi sil"
                  style={styles.deleteListButton}
                  onPress={deleteSection}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.itemComposer}>
                <TextInput
                  style={styles.itemInput}
                  value={itemDraft}
                  onChangeText={setItemDraft}
                  placeholder="Yeni madde ekle"
                  placeholderTextColor={theme.colors.text.disabled}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={addItem}
                />
                <TouchableOpacity
                  accessibilityLabel="Maddeyi ekle"
                  style={[styles.addItemButton, !itemDraft.trim() && styles.disabled]}
                  onPress={addItem}
                  disabled={!itemDraft.trim() || submitting}
                >
                  <Ionicons name="add" size={22} color={theme.colors.text.onPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.segment}>
                <TouchableOpacity
                  style={[styles.segmentButton, mode === 'active' && styles.segmentActive]}
                  onPress={() => setMode('active')}
                >
                  <Text style={[styles.segmentText, mode === 'active' && styles.segmentTextActive]}>
                    Aktif {activeCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, mode === 'history' && styles.segmentActive]}
                  onPress={() => setMode('history')}
                >
                  <Text style={[styles.segmentText, mode === 'history' && styles.segmentTextActive]}>
                    Geçmiş {historyCount}
                  </Text>
                </TouchableOpacity>
              </View>

              {visibleItems.length === 0 ? (
                <Text style={styles.noItems}>
                  {mode === 'active' ? 'Bu listede bekleyen madde yok.' : 'Henüz tamamlanan madde yok.'}
                </Text>
              ) : visibleItems.map((item) => (
                <View key={String(item.id)} style={styles.itemRow}>
                  {mode === 'active' ? (
                    <TouchableOpacity
                      accessibilityLabel="Tamamlandı"
                      style={styles.checkButton}
                      onPress={() => completeItem(item.id)}
                    >
                      <Ionicons name="checkmark" size={16} color={theme.colors.primary[700]} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.checkButton, styles.completedCheck]}>
                      <Ionicons name="checkmark" size={16} color={theme.colors.success[700]} />
                    </View>
                  )}
                  <Text style={[styles.itemText, mode === 'history' && styles.completedText]}>
                    {item.content}
                  </Text>
                  <TouchableOpacity
                    accessibilityLabel="Maddeyi kaldır"
                    style={styles.removeItem}
                    onPress={() => deleteItem(item.id)}
                  >
                    <Ionicons name="close" size={18} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    flexGrow: 1,
    paddingTop: insets.top + 6,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  loading: { paddingVertical: 80, alignItems: 'center' },
  emptyCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 18 },
  emptyText: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 16,
  },
  createRow: { flexDirection: 'row', gap: 8 },
  compactCreate: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    paddingHorizontal: 12,
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  listSelector: { gap: 7, paddingRight: 2 },
  listChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.surface,
  },
  listChipActive: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
  listChipText: { color: theme.colors.text.secondary, fontFamily: theme.typography.semibold, fontSize: 13 },
  listChipTextActive: { color: theme.colors.text.onPrimary },
  addListButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noteCard: {
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  noteHeader: {
    minHeight: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  noteHeading: { flex: 1 },
  noteTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 17 },
  noteMeta: { color: theme.colors.text.secondary, fontFamily: theme.typography.regular, fontSize: 11, marginTop: 2 },
  deleteListButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.error[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemComposer: { flexDirection: 'row', gap: 8, padding: 12 },
  itemInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    paddingHorizontal: 12,
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  addItemButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.42 },
  segment: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.neutral[100],
  },
  segmentButton: { minHeight: 30, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: theme.colors.surface },
  segmentText: { color: theme.colors.text.secondary, fontFamily: theme.typography.semibold, fontSize: 12 },
  segmentTextActive: { color: theme.colors.primary[700] },
  noItems: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    padding: 18,
    textAlign: 'center',
  },
  itemRow: {
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCheck: { borderColor: theme.colors.success[300], backgroundColor: theme.colors.success[50] },
  itemText: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.regular, fontSize: 14 },
  completedText: { color: theme.colors.text.secondary, textDecorationLine: 'line-through' },
  removeItem: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
