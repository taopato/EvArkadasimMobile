// src/screens/AddBillScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Animated, Platform, TextInput, Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../shared/theme/ThemeProvider';

import { useAuth } from '../context/AuthContext';
import { houseApi, expensesApi } from '../services/api';
import Toast from '../components/Toast';
import { toExpenseCategory } from '../constants/ExpenseEnums';
import DateField from '../shared/ui/DateField';

const getCategoryDisplayName = (category) => {
  const categoryMap = {
    Electricity: 'Elektrik', Water: 'Su', Internet: 'İnternet', Rent: 'Kira', Gas: 'Doğalgaz',
    Market: 'Market', Food: 'Yemek', Other: 'Diğer',
    0: 'Kira', 1: 'İnternet', 2: 'Elektrik', 3: 'Su', 4: 'Doğalgaz', 5: 'Yemek', 99: 'Diğer',
  };
  return categoryMap[category] || category;
};

const BILL_TYPES = [
  { key: 'Water', icon: 'water-outline', label: 'Su', isFixed: false, description: 'Değişken - aylık değişir' },
  { key: 'Electricity', icon: 'flash-outline', label: 'Elektrik', isFixed: false, description: 'Değişken - aylık değişir' },
  { key: 'Rent', icon: 'home-outline', label: 'Kira', isFixed: true, description: 'Sabit - her ay aynı' },
  { key: 'Gas', icon: 'flame-outline', label: 'Doğalgaz', isFixed: false, description: 'Değişken - aylık değişir' },
  { key: 'Other', icon: 'document-text-outline', label: 'Diğer', isFixed: null, description: 'Listede olmayan giderler' },
  { key: 'Internet', icon: 'wifi-outline', label: 'İnternet', isFixed: true, description: 'Sabit - her ay aynı' },
];

const AddBillScreen = ({ route, navigation }) => {
  const { houseId, houseName, billId, isEditing } = route.params || {};
  const { user } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  const [amount, setAmount] = useState('100.00');
  const [billDate, setBillDate] = useState(''); // YYYY-MM-DD
  const [month, setMonth] = useState('');       // YYYY-MM
  const [note, setNote] = useState('');
  const [billType, setBillType] = useState('Water');
  const [responsibleUserId, setResponsibleUserId] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  const normalizeMembers = (raw) =>
    (Array.isArray(raw) ? raw : [])
      .map(m => ({
        userId: Number(m.userId ?? m.user?.id ?? NaN),
        fullName: m.fullName ?? m.name ?? m.user?.fullName ?? 'Kullanıcı'
      }))
      .filter(m => Number.isInteger(m.userId) && m.userId > 0);

  useEffect(() => {
    if (!houseId) {
      showToast('Gerekli bilgiler eksik', 'error');
      navigation.goBack();
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;
    setBillDate(today);
    setMonth(`${y}-${m}`);

    fetchMembers();
    if (isEditing && billId) fetchBillData();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [houseId, billId, isEditing]);

  useFocusEffect(
    React.useCallback(() => { if (houseId) fetchMembers(); }, [houseId])
  );

  useEffect(() => {
    const selected = BILL_TYPES.find(t => t.key === billType);
    if (!selected) return;
    if (selected.isFixed === true) { setIsRecurring(true);  showToast(`${selected.label} - ${selected.description}`, 'info'); }
    else if (selected.isFixed === false) { setIsRecurring(false); showToast(`${selected.label} - ${selected.description}`, 'info'); }
    else { setIsRecurring(false); }
  }, [billType]);

  useEffect(() => {
    if (billDate && /^\d{4}-\d{2}-\d{2}$/.test(billDate)) setMonth(billDate.slice(0, 7));
  }, [billDate]);

  const fetchMembers = async () => {
    try {
      const res = await houseApi.getMembers(houseId);
      const list = normalizeMembers(res?.data);
      setMembers(list);
      const me = list.find(x => x.userId === Number(user?.id));
      if (me) setResponsibleUserId(me.userId);
    } catch (err) {
      showToast('Ev üyeleri alınamadı', 'error');
    }
  };

  const fetchBillData = async () => {
    try {
      setLoading(true);
      const response = await expensesApi.getById(billId);
      const bill = response?.data?.data ?? response?.data;
      if (!bill) return;

      setAmount(String(bill.amount ?? bill.tutar ?? 0));
      const pDate = bill.postDate ? String(bill.postDate).slice(0, 10) : '';
      setBillDate(pDate || billDate);
      setMonth((pDate || billDate).slice(0, 7));
      setNote(bill.note ?? '');
      setBillType(typeof bill.category === 'number' ? getCategoryDisplayName(bill.category) : (bill.category || 'Water'));
      setResponsibleUserId(bill.odeyenUserId || null);
    } catch {
      showToast('Fatura verileri alınamadı', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const money = parseFloat(String(amount).replace(',', '.'));
    if (Number.isNaN(money) || money <= 0) { showToast('Geçerli bir tutar girin', 'warning'); return { ok: false }; }
    if (!billDate || !/^\d{4}-\d{2}-\d{2}$/.test(billDate)) { showToast('Tarih formatı YYYY-MM-DD olmalı', 'warning'); return { ok: false }; }
    if (!responsibleUserId) { showToast('Ödeyen kişi seçin', 'warning'); return { ok: false }; }
    const memberIds = new Set(members.map(m => m.userId));
    if (!memberIds.has(Number(responsibleUserId))) { showToast('Seçilen kişi ev üyesi değil', 'error'); return { ok: false }; }
    return { ok: true, money };
  };

  const handleCreateBill = async () => {
    Keyboard.dismiss();
    const v = validateForm();
    if (!v.ok) return;

    setLoading(true);
    try {
      if (isEditing && billId) {
        const safeTur = `${getCategoryDisplayName(billType)} ${month}`.slice(0, 30);
        const updateData = {
          tur: safeTur,
          category: toExpenseCategory(billType),
          tutar: v.money,
          postDate: `${billDate}T00:00:00`,
          dueDate: `${billDate}T00:00:00`,
          // update’te Description zorunlu değilse göndermeye gerek yok
          splitPolicy: 0,
        };
        await expensesApi.update(billId, updateData);
        showToast('Fatura güncellendi', 'success');
        navigation.goBack();
      } else {
        await handleCreateIrregularExpense(v.money);
      }
    } catch (e) {
      const serverText = String(e?.response?.data ?? e?.message ?? '');
      showToast(serverText || 'Beklenmeyen hata', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIrregularExpense = async (moneyValue) => {
    try {
      const payerId = Number(responsibleUserId);
      const creatorId = Number(user?.id);
      const house = Number(houseId);

      const safeTur = `${getCategoryDisplayName(billType)} ${month}`.slice(0, 30);
      const desc = `${getCategoryDisplayName(billType)} • ${billDate}`; // 🔸 Description NOT NULL

      const payload = {
        tur: safeTur,
        category: toExpenseCategory(billType),
        tutar: moneyValue,
        houseId: house,
        odeyenUserId: payerId,
        kaydedenUserId: creatorId,
        postDate: `${billDate}T00:00:00`,
        dueDate: `${billDate}T00:00:00`,
        splitPolicy: 0,
        personalItems: [],
        // 🔸 zorunlu alan:
        description: desc,
        Description: desc,
        Aciklama: desc,
      };

      await expensesApi.createIrregular(payload);

      try { (await import('../shared/events/bus')).default.emit('expenses:updated', { houseId: house }); } catch {}

      showToast('Kayıt oluşturuldu', 'success');
      if (navigation?.canGoBack?.()) navigation.goBack();
      else navigation.navigate('MainTabs', { screen: 'TumHarcamalar', params: { houseId } });
    } catch (e) {
      const serverText = String(e?.response?.data ?? e?.message ?? '');
      showToast(serverText || 'Oluşturma hatası', 'error');
      throw e;
    }
  };

  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Faturayı Düzenle' : 'Yeni Fatura Oluştur'}</Text>
          <Text style={styles.subtitle}>{houseName} • {getCategoryDisplayName(billType)}</Text>
        </View>

        <KeyboardAwareScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
          keyboardOpeningTime={0}
        >
          <View style={styles.card}>
            <Text style={styles.label}>Tutar (₺)</Text>
            <TextInput style={styles.textInput} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Örn: 100.00" placeholderTextColor={theme.colors.text.disabled} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Tarih</Text>
            <DateField value={billDate} onChange={setBillDate} placeholder="Tarih seç" />
            <Text style={styles.hint}>Dönem: {month || '-'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Fatura Türü</Text>
            <View style={styles.pickerContainer}>
              {BILL_TYPES.map((type) => {
                const selected = billType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.billTypeButton, selected && styles.selectedBillTypeButton]}
                    onPress={() => setBillType(type.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={type.icon} size={22} color={selected ? theme.colors.primary[700] : theme.colors.text.secondary} style={{ marginBottom: 6 }} />
                    <Text style={[styles.billTypeButtonText, selected && styles.selectedBillTypeButtonText]}>
                      {type.label}
                    </Text>
                    <Text style={[styles.billTypeDescription, selected && { color: theme.colors.primary[700] }]}>{type.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Not (opsiyonel)</Text>
            <TextInput style={[styles.textInput, styles.textArea]} value={note} onChangeText={setNote} multiline placeholder="İstersen not gir" placeholderTextColor={theme.colors.text.disabled} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Ödeyen Kişi</Text>
            <View style={styles.pickerContainer}>
              {members.map((member) => {
                const selected = Number(member.userId) === Number(responsibleUserId);
                return (
                  <TouchableOpacity
                    key={member.userId}
                    style={[styles.memberButton, selected && styles.selectedMemberButton]}
                    onPress={() => setResponsibleUserId(member.userId)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.memberButtonText, selected && styles.selectedMemberButtonText]}>
                      {member.fullName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={[styles.createButton, loading && styles.createButtonDisabled]} onPress={handleCreateBill} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color={theme.colors.text.onPrimary} size="small" /> : <Text style={styles.createButtonText}>{isEditing ? 'Faturayı Güncelle' : 'Faturayı Kaydet'}</Text>}
          </TouchableOpacity>
        </KeyboardAwareScrollView>

        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </Animated.View>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 18 },
    header: { marginBottom: 18 },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text.primary, marginBottom: 4 },
    subtitle: { fontSize: 14, color: theme.colors.text.secondary },
    formContainer: { flex: 1 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.neutral[200],
      padding: 16,
      marginBottom: 14,
    },
    label: { fontSize: 14, fontWeight: '800', color: theme.colors.text.primary, marginBottom: 10 },
    textInput: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 14, fontSize: 16, color: theme.colors.text.primary, borderWidth: 1, borderColor: theme.colors.neutral[200] },
    textArea: { height: 90, textAlignVertical: 'top' },
    hint: { marginTop: 8, color: theme.colors.text.secondary, fontSize: 12 },
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    billTypeButton: { backgroundColor: theme.colors.background, borderRadius: 14, padding: 14, minWidth: 104, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neutral[200] },
    selectedBillTypeButton: { backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[600] },
    billTypeButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary, textAlign: 'center' },
    selectedBillTypeButtonText: { color: theme.colors.primary[700] },
    billTypeDescription: { fontSize: 11, color: theme.colors.text.secondary, textAlign: 'center', marginTop: 4 },
    memberButton: { backgroundColor: theme.colors.background, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, minWidth: 100, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neutral[200] },
    selectedMemberButton: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
    memberButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary, textAlign: 'center' },
    selectedMemberButtonText: { color: theme.colors.text.onPrimary },
    createButton: { backgroundColor: theme.colors.primary[600], borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 30 },
    createButtonDisabled: { opacity: 0.7 },
    createButtonText: { fontSize: 16, fontWeight: '900', color: theme.colors.text.onPrimary },
  });
}

export default AddBillScreen;
