import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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
import KeyboardAwareScreen from '../shared/ui/KeyboardAwareScreen';

const normalizeBoard = (payload) => {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  return sections.map((section) => ({
    ...section,
    items: Array.isArray(section?.items) ? section.items : [],
    completedItems: Array.isArray(section?.completedItems) ? section.completedItems : [],
  }));
};

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
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [itemDrafts, setItemDrafts] = useState({});
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const loadBoard = async () => {
    if (!houseId) {
      setSections([]);
      setLoading(false);
      return;
    }
    try {
      const response = await houseNotesApi.getBoard(houseId);
      setSections(normalizeBoard(response?.data));
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

  const quickAddTarget = sections[0] || null;
  const completedItems = sections.flatMap((section) => section.completedItems.map((item) => ({
    ...item,
    sectionTitle: section.title,
  }))).sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

  const createSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    setSubmitting(true);
    try {
      await houseNotesApi.createSection(houseId, title);
      setNewSectionTitle('');
      setShowCreateSection(false);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Liste oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  const renameSection = async (sectionId) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingSectionId(null);
      return;
    }
    setSubmitting(true);
    try {
      await houseNotesApi.updateSection(sectionId, title);
      setEditingSectionId(null);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Kategori adı güncellenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuickAdd = async () => {
    const content = quickAddText.trim();
    if (!content || !quickAddTarget) return;
    setSubmitting(true);
    try {
      await houseNotesApi.createItem(quickAddTarget.id, content);
      setQuickAddText('');
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Not eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const addItemToSection = async (sectionId) => {
    const content = (itemDrafts[sectionId] || '').trim();
    if (!content) return;
    setSubmitting(true);
    try {
      await houseNotesApi.createItem(sectionId, content);
      setItemDrafts((prev) => ({ ...prev, [sectionId]: '' }));
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

  const deleteSection = async (section) => {
    const confirmed = await confirmAction(
      'Kategoriyi sil',
      `"${section.title}" kategorisini kaldırmak istediğine emin misin?`
    );
    if (!confirmed) return;
    try {
      await houseNotesApi.deleteSection(section.id);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Kategori silinemedi.');
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        bottomOffset={isMainTab ? 72 : 44}
      >
        <PageHeader
          centered
          title="Ev Notları"
          onBack={isMainTab ? undefined : () => navigation.goBack()}
          menuIcon="ellipsis-vertical"
          onMenuPress={() => Alert.alert('Yakında', 'Bu menü yakında eklenecek.')}
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary[600]} />
          </View>
        ) : (
          <>
            <View style={styles.quickAddCard}>
              <TextInput
                style={styles.quickAddInput}
                value={quickAddText}
                onChangeText={setQuickAddText}
                placeholder="Yeni not ekle..."
                placeholderTextColor={theme.colors.text.disabled}
                editable={!!quickAddTarget}
                returnKeyType="done"
                onSubmitEditing={submitQuickAdd}
              />
              <TouchableOpacity
                accessibilityLabel="Notu ekle"
                style={[styles.quickAddButton, (!quickAddText.trim() || !quickAddTarget) && styles.disabled]}
                onPress={submitQuickAdd}
                disabled={!quickAddText.trim() || !quickAddTarget || submitting}
              >
                <Ionicons name="add" size={20} color={theme.colors.text.onPrimary} />
              </TouchableOpacity>
            </View>

            {sections.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="list-outline" size={26} color={theme.colors.primary[700]} />
                </View>
                <Text style={styles.emptyTitle}>İlk kategorini oluştur</Text>
                <Text style={styles.emptyText}>Market, ev işleri veya alınacaklar için ortak bir kategori aç.</Text>
              </View>
            ) : (
              sections.map((section) => {
                const isEditing = Number(editingSectionId) === Number(section.id);
                const draft = itemDrafts[section.id] || '';
                return (
                  <View key={String(section.id)} style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      {isEditing ? (
                        <TextInput
                          autoFocus
                          style={styles.sectionTitleInput}
                          value={editingTitle}
                          onChangeText={setEditingTitle}
                          returnKeyType="done"
                          onSubmitEditing={() => renameSection(section.id)}
                          onBlur={() => renameSection(section.id)}
                        />
                      ) : (
                        <Text style={styles.sectionTitle} numberOfLines={1}>{section.title}</Text>
                      )}
                      <View style={styles.sectionHeaderActions}>
                        <TouchableOpacity
                          accessibilityLabel="Kategoriyi düzenle"
                          style={styles.sectionIconButton}
                          onPress={() => {
                            setEditingSectionId(section.id);
                            setEditingTitle(section.title);
                          }}
                        >
                          <Ionicons name="pencil-outline" size={16} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityLabel="Kategoriyi sil"
                          style={styles.sectionIconButton}
                          onPress={() => deleteSection(section)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.colors.error[600]} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {section.items.length === 0 ? (
                      <Text style={styles.noItems}>Bu kategoride bekleyen madde yok.</Text>
                    ) : section.items.map((item) => (
                      <View key={String(item.id)} style={styles.itemRow}>
                        <TouchableOpacity
                          accessibilityLabel="Tamamlandı"
                          style={styles.checkButton}
                          onPress={() => completeItem(item.id)}
                        >
                          <View />
                        </TouchableOpacity>
                        <Text style={styles.itemText}>{item.content}</Text>
                        <TouchableOpacity
                          accessibilityLabel="Maddeyi kaldır"
                          style={styles.removeItem}
                          onPress={() => deleteItem(item.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.colors.text.secondary} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.itemComposer}>
                      <TextInput
                        style={styles.itemInput}
                        value={draft}
                        onChangeText={(text) => setItemDrafts((prev) => ({ ...prev, [section.id]: text }))}
                        placeholder="Yeni madde ekle"
                        placeholderTextColor={theme.colors.text.disabled}
                        returnKeyType="done"
                        blurOnSubmit={false}
                        onSubmitEditing={() => addItemToSection(section.id)}
                      />
                      <TouchableOpacity
                        accessibilityLabel="Maddeyi ekle"
                        style={[styles.addItemButton, !draft.trim() && styles.disabled]}
                        onPress={() => addItemToSection(section.id)}
                        disabled={!draft.trim() || submitting}
                      >
                        <Ionicons name="add" size={20} color={theme.colors.text.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {showCreateSection ? (
              <View style={styles.compactCreate}>
                <TextInput
                  autoFocus
                  style={styles.input}
                  value={newSectionTitle}
                  onChangeText={setNewSectionTitle}
                  placeholder="Yeni kategori adı"
                  placeholderTextColor={theme.colors.text.disabled}
                  returnKeyType="done"
                  onSubmitEditing={createSection}
                />
                <TouchableOpacity style={styles.iconAction} onPress={createSection} disabled={submitting}>
                  <Ionicons name="checkmark" size={20} color={theme.colors.text.onPrimary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addSectionButton} onPress={() => setShowCreateSection(true)}>
                <Ionicons name="add-circle" size={20} color={theme.colors.primary[600]} />
                <Text style={styles.addSectionText}>Yeni Kategori Ekle</Text>
              </TouchableOpacity>
            )}

            {completedItems.length > 0 && (
              <>
                <Text style={styles.completedHeader}>Tamamlananlar ({completedItems.length})</Text>
                <View style={styles.completedCard}>
                  {completedItems.map((item) => (
                    <View key={String(item.id)} style={styles.itemRow}>
                      <View style={[styles.checkButton, styles.completedCheck]}>
                        <Ionicons name="checkmark" size={14} color={theme.colors.success[700]} />
                      </View>
                      <Text style={styles.completedText} numberOfLines={1}>{item.content}</Text>
                      <TouchableOpacity
                        accessibilityLabel="Maddeyi kaldır"
                        style={styles.removeItem}
                        onPress={() => deleteItem(item.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.colors.text.secondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </KeyboardAwareScreen>
    </View>
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
  quickAddCard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  quickAddInput: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.regular,
    fontSize: 15,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 20,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
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
    textAlign: 'center',
  },
  compactCreate: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  sectionCard: {
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: 12,
    marginBottom: 12,
    ...shadow(1, 'rgba(23,40,57,0.08)'),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.bold, fontSize: 16 },
  sectionTitleInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.bold,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary[500],
    paddingVertical: 2,
  },
  sectionHeaderActions: { flexDirection: 'row', gap: 4 },
  sectionIconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  noItems: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    paddingVertical: 10,
  },
  itemComposer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  itemInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.background,
    color: theme.colors.text.primary,
    paddingHorizontal: 12,
    fontFamily: theme.typography.regular,
    fontSize: 14,
  },
  addItemButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.42 },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    marginBottom: 20,
  },
  addSectionText: { color: theme.colors.primary[600], fontFamily: theme.typography.semibold, fontSize: 14 },
  completedHeader: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    marginBottom: 8,
  },
  completedCard: {
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: 12,
    opacity: 0.7,
  },
  itemRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  checkButton: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCheck: { borderColor: theme.colors.success[300], backgroundColor: theme.colors.success[50] },
  itemText: { flex: 1, color: theme.colors.text.primary, fontFamily: theme.typography.regular, fontSize: 14 },
  completedText: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  removeItem: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
