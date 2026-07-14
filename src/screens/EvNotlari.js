import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../shared/theme/ThemeProvider';
import { houseNotesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const normalizeBoard = (payload) => {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  return sections.map((section) => ({
    ...section,
    items: Array.isArray(section?.items) ? section.items : [],
    completedItems: Array.isArray(section?.completedItems) ? section.completedItems : [],
  }));
};

export default function EvNotlari({ route }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 520;
  const styles = useMemo(() => makeStyles(theme, isCompact), [theme, isCompact]);

  const houseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const houseName = route?.params?.houseName || user?.defaultHouseName || 'Ev Notları';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [itemDrafts, setItemDrafts] = useState({});
  const [activeTab, setActiveTab] = useState('active');

  const loadBoard = async () => {
    if (!houseId) {
      setSections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await houseNotesApi.getBoard(houseId);
      setSections(normalizeBoard(response?.data));
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Ev notları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, [houseId]);

  const activeItemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  const completedItemCount = sections.reduce((sum, section) => sum + section.completedItems.length, 0);
  const activeSections = sections.filter((section) => section.items.length > 0 || section.completedItems.length === 0);
  const historySections = sections.filter((section) => section.completedItems.length > 0);

  const askConfirm = (title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Onayla', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const handleCreateSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) {
      Alert.alert('Hata', 'Önce bir başlık girin.');
      return;
    }

    setSubmitting(true);
    try {
      await houseNotesApi.createSection(houseId, title);
      setNewSectionTitle('');
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Başlık eklenemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = async (sectionId) => {
    const content = String(itemDrafts[sectionId] || '').trim();
    if (!content) {
      Alert.alert('Hata', 'Listeye eklenecek maddeyi yazın.');
      return;
    }

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

  const handleCompleteItem = async (itemId) => {
    try {
      await houseNotesApi.completeItem(itemId);
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Madde tamamlanamadı.');
    }
  };

  const handleDeleteItem = async (itemId, mode = 'active') => {
    const confirmed = await askConfirm(
      mode === 'active' ? 'Notu sil' : 'Geçmiş notu kaldır',
      mode === 'active'
        ? 'Bu madde görünümden kaldırılacak, veritabanında saklanmaya devam edecek.'
        : 'Bu geçmiş not görünümden kaldırılacak, veritabanında saklanmaya devam edecek.'
    );

    if (!confirmed) return;

    try {
      await houseNotesApi.deleteItem(itemId);
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.id !== itemId),
          completedItems: section.completedItems.filter((item) => item.id !== itemId),
        }))
      );
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Madde silinemedi.');
    }
  };

  const handleDeleteSection = async (sectionId, title) => {
    const confirmed = await askConfirm(
      'Başlığı sil',
      `"${title}" başlığı kaldırılacak. Notlar saklanmaya devam edecek.`
    );

    if (!confirmed) return;

    try {
      await houseNotesApi.deleteSection(sectionId);
      setSections((prev) => prev.filter((section) => section.id !== sectionId));
      await loadBoard();
    } catch (error) {
      Alert.alert('Hata', error?.response?.data?.message || 'Başlık silinemedi.');
    }
  };

  const renderActiveSection = (section) => (
    <View
      key={section.id}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral[200] }]}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{section.title}</Text>
        <TouchableOpacity
          style={[
            styles.headerDeleteBtn,
            { backgroundColor: theme.colors.error[50], borderColor: theme.colors.error[100] },
          ]}
          onPress={() => handleDeleteSection(section.id, section.title)}
        >
          <Text style={[styles.headerDeleteText, { color: theme.colors.error[700] }]}>Başlığı sil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inlineRow}>
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              borderColor: theme.colors.neutral[300],
              backgroundColor: theme.colors.background,
              color: theme.colors.text.primary,
            },
          ]}
          placeholder="Listeye yeni madde ekle"
          placeholderTextColor={theme.colors.text.disabled}
          value={itemDrafts[section.id] || ''}
          onChangeText={(value) => setItemDrafts((prev) => ({ ...prev, [section.id]: value }))}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.colors.success[600] }]}
          onPress={() => handleAddItem(section.id)}
          disabled={submitting}
        >
          <Text style={[styles.addBtnText, { color: theme.colors.text.onPrimary }]}>Ekle</Text>
        </TouchableOpacity>
      </View>

      {section.items.length === 0 ? (
        <Text style={[styles.sectionHint, { color: theme.colors.text.secondary }]}>
          Bu başlık altında bekleyen madde yok.
        </Text>
      ) : (
        section.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: theme.colors.primary[400] }]}
              onPress={() => handleCompleteItem(item.id)}
            >
              <Ionicons name="checkmark" size={16} color={theme.colors.primary[700]} />
            </TouchableOpacity>
            <Text style={[styles.itemText, { color: theme.colors.text.primary }]}>{item.content}</Text>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: theme.colors.error[50] }]}
              onPress={() => handleDeleteItem(item.id, 'active')}
            >
              <Text style={[styles.deleteBtnText, { color: theme.colors.error[700] }]}>Sil</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderHistorySection = (section) => (
    <View
      key={`history-${section.id}`}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral[200] }]}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{section.title}</Text>
      </View>
      <Text style={[styles.sectionHint, { color: theme.colors.text.secondary }]}>
        Tamamlanan maddeler aktif listeden kalkar, burada arşivlenir. Buradan kaldırılanlar artık
        görünmez.
      </Text>

      {section.completedItems.map((item) => (
        <View key={`done-${item.id}`} style={styles.itemRow}>
          <View
            style={[
              styles.circleBtn,
              { borderColor: theme.colors.success[400], backgroundColor: theme.colors.success[50] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success[700]} />
          </View>
          <Text style={[styles.itemText, styles.completedText, { color: theme.colors.text.secondary }]}>
            {item.content}
          </Text>
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: theme.colors.neutral[100] }]}
            onPress={() => handleDeleteItem(item.id, 'history')}
          >
            <Text style={[styles.deleteBtnText, { color: theme.colors.text.secondary }]}>Kaldır</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const visibleSections = activeTab === 'active' ? activeSections : historySections;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        keyboardOpeningTime={0}
      >
        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>{houseName}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Market, ev içi işler ve alınacaklar listesi tüm ev üyeleri tarafından görülüp
            yönetilebilir.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryBox,
              { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[100] },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Aktif</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>{activeItemCount}</Text>
          </View>
          <View
            style={[
              styles.summaryBox,
              { backgroundColor: theme.colors.success[50], borderColor: theme.colors.success[100] },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Geçmiş</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>{completedItemCount}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral[200] }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Yeni bir not listesi oluştur</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  borderColor: theme.colors.neutral[300],
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                },
              ]}
              placeholder="Örnek: Market, Ev, Banyo"
              placeholderTextColor={theme.colors.text.disabled}
              value={newSectionTitle}
              onChangeText={setNewSectionTitle}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.colors.primary[600] }]}
              onPress={handleCreateSection}
              disabled={submitting}
            >
              <Text style={[styles.addBtnText, { color: theme.colors.text.onPrimary }]}>Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tabWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral[200] }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'active' && { backgroundColor: theme.colors.primary[600] }]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'active' ? theme.colors.text.onPrimary : theme.colors.text.secondary },
              ]}
            >
              Aktif Notlar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && { backgroundColor: theme.colors.success[600] }]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'history' ? theme.colors.text.onPrimary : theme.colors.text.secondary },
              ]}
            >
              Geçmiş Notlar
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          </View>
        ) : visibleSections.length === 0 ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.neutral[200] }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              {activeTab === 'active' ? 'Henüz aktif not yok' : 'Geçmişte gösterilecek not yok'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              {activeTab === 'active'
                ? 'Önce bir başlık oluşturun, sonra ev üyelerinin göreceği maddeleri ekleyin.'
                : 'Tamamlanan maddeler burada toplanır. Gizlenenler artık bu listede de görünmez.'}
            </Text>
          </View>
        ) : (
          visibleSections.map((section) =>
            activeTab === 'active' ? renderActiveSection(section) : renderHistorySection(section)
          )
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (theme, isCompact) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 12, paddingBottom: 28 },
    hero: { marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    subtitle: { fontSize: 12, lineHeight: 18 },
    summaryRow: { flexDirection: isCompact ? 'column' : 'row', gap: 10, marginBottom: 12 },
    summaryBox: {
      flex: 1,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
    },
    summaryLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: '900' },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
      marginBottom: 12,
    },
    sectionHeaderRow: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800' },
    inlineRow: { flexDirection: isCompact ? 'column' : 'row', gap: 8, alignItems: 'center' },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
    },
    addBtn: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 66,
      alignItems: 'center',
      width: isCompact ? '100%' : undefined,
    },
    addBtnText: { fontWeight: '800', fontSize: 13 },
    loadingWrap: { paddingVertical: 28, alignItems: 'center' },
    emptyTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
    emptyText: { lineHeight: 18, fontSize: 12 },
    sectionHint: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 7,
    },
    circleBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    itemText: { flex: 1, fontSize: 13, lineHeight: 18 },
    deleteBtn: {
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    deleteBtnText: { fontWeight: '700', fontSize: 11 },
    completedText: { textDecorationLine: 'line-through' },
    tabWrap: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 14,
      padding: 5,
      marginBottom: 12,
      gap: 6,
    },
    tabBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tabText: { fontWeight: '800', fontSize: 13 },
    headerDeleteBtn: {
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 7,
    },
    headerDeleteText: {
      fontSize: 11,
      fontWeight: '700',
    },
  });
