// HarcamaDetayi.js

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useCommonStyles, makeColorThemes } from '../shared/ui/CommonStyles';
import { useTheme } from '../shared/theme/ThemeProvider';
import { expensesApi, ledgerApi } from '../services/api';
import { houseApi } from '../services/api';
import eventBus from '../shared/events/bus';
import { useAuth } from '../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../shared/format/money';

const HarcamaDetayi = ({ navigation, route }) => {
  const { expenseId: expenseIdParam, billId: billIdParam, houseId, houseName } = route.params || {};
  const expenseId = expenseIdParam ?? billIdParam;
  const { user } = useAuth();
  const CommonStyles = useCommonStyles();
  const { theme } = useTheme();
  const ColorThemes = makeColorThemes(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [expense, setExpense] = useState(null);
  const [ledgerLines, setLedgerLines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Düzenleme modu
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formShared, setFormShared] = useState('');
  const [formPersonal, setFormPersonal] = useState({}); // { userId: '1000.00' }
  const [formNote, setFormNote] = useState('');
  // Kullanıcı adları (ev üyeleri)
  const [membersMap, setMembersMap] = useState({});

  // Plan özeti
  const [planStats, setPlanStats] = useState({
    isChild: false,
    parentId: null,
    totalMonths: 0,
    maturedMonths: 0,
    remainingMonths: 0,
    dueDay: null,
    monthlyAmount: 0,
    planStartMonth: null,
    type: null, // "installment" | "recurring" | null
  });

  useEffect(() => {
    if (expenseId) fetchExpenseDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  useEffect(() => {
    (async () => {
      try {
        if (!houseId) return;
        const res = await houseApi.getMembers(houseId);
        const raw = res?.data?.data || res?.data || [];
        const map = {};
        (Array.isArray(raw) ? raw : []).forEach((m) => {
          const uid = Number(m?.userId ?? m?.UserId ?? m?.id ?? m?.user?.id);
          const name = m?.fullName ?? m?.FullName ?? m?.name ?? m?.Name ?? m?.user?.fullName ?? `Kullanıcı ${uid}`;
          if (Number.isFinite(uid)) map[uid] = name;
        });
        setMembersMap(map);
      } catch {}
    })();
  }, [houseId]);

  const parseDate = (v) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };

  const safeDateForUI = (v) => {
    const d = parseDate(v);
    if (!d) return '—';
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Para formatlaması - Türk Lirası standardı
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  };

  const fetchExpenseDetail = async () => {
    try {
      setLoading(true);

      const [expenseResponse, ledgerResponse] = await Promise.all([
        expensesApi.getById(expenseId),
        ledgerApi.byExpense(expenseId),
      ]);

      const expenseData = expenseResponse?.data?.data || expenseResponse?.data;
      const ledgerData = ledgerResponse?.data?.data || ledgerResponse?.data || [];

      setExpense(expenseData);
      setLedgerLines(Array.isArray(ledgerData) ? ledgerData : []);

      // Edit formunu doldur (read-only görüntülemeden bağımsız)
      try {
        const title = expenseData?.tur || expenseData?.category || '';
        const totalRaw = String(expenseData?.tutar ?? expenseData?.amount ?? '');
        const sharedRaw = String(expenseData?.ortakHarcamaTutari ?? '');
        const personalArr = Array.isArray(expenseData?.sahsiHarcamalar) ? expenseData.sahsiHarcamalar : [];
        const pMap = {};
        for (const it of personalArr) {
          const uid = Number(it?.userId ?? it?.UserId);
          const val = Number(it?.tutar ?? it?.Tutar ?? it?.amount ?? 0);
          if (Number.isFinite(uid)) pMap[String(uid)] = String(val);
        }
        setFormTitle(title);
        setFormTotal(formatMoneyInput(totalRaw));
        setFormShared(formatMoneyInput(sharedRaw));
        setFormPersonal(pMap);
        setFormNote(String(expenseData?.note ?? expenseData?.Note ?? expenseData?.description ?? expenseData?.Description ?? expenseData?.aciklama ?? expenseData?.Aciklama ?? ''));
      } catch {}

      // Plan özeti (kardeşler)
      if (houseId && expenseData) {
        const listRes = await expensesApi.getByHouse(Number(houseId));
        const all = listRes?.data?.data || listRes?.data || [];

        const parentId = expenseData?.parentExpenseId ?? expenseData?.ParentExpenseId ?? null;
        const isChild = parentId != null;

        let siblings = [];
        if (isChild) {
          siblings = all.filter(
            (x) => (x?.parentExpenseId ?? x?.ParentExpenseId ?? null) === parentId
          );
        } else {
          const thisId = expenseData?.id ?? expenseData?.Id;
          siblings = all.filter(
            (x) => (x?.parentExpenseId ?? x?.ParentExpenseId ?? null) === thisId
          );
        }

        const dueDay = expenseData?.dueDay ?? expenseData?.DueDay ?? null;
        const planStartMonth = expenseData?.planStartMonth ?? expenseData?.PlanStartMonth ?? null;

        const now = new Date();
        const matured = siblings.filter((c) => {
          const ds = c?.kayitTarihi || c?.postDate || c?.createdDate || c?.createdAt;
          const d = parseDate(ds);
          return d && d <= now;
        });

        const anyChild = siblings[0] || {};
        const installCount =
          anyChild?.installmentCount ??
          anyChild?.InstallmentCount ??
          expenseData?.installmentCount ??
          expenseData?.InstallmentCount ??
          null;

        const monthlyAmount = Number(
          (expenseData?.ortakHarcamaTutari ?? expenseData?.tutar ?? 0)
        );

        const totalMonths = installCount ? Number(installCount) : siblings.length;
        const maturedMonths = matured.length;
        const remainingMonths = Math.max(0, totalMonths - maturedMonths);

        setPlanStats({
          isChild,
          parentId: isChild ? parentId : (expenseData?.id ?? expenseData?.Id ?? null),
          totalMonths,
          maturedMonths,
          remainingMonths,
          dueDay: dueDay ? Number(dueDay) : null,
          monthlyAmount,
          planStartMonth,
          type: installCount ? 'installment' : (siblings.length > 0 ? 'recurring' : null),
        });
      }
    } catch (error) {
      console.error('❌ Expense detail fetch error:', error);
      Alert.alert('Hata', 'Harcama detayları alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Formu mevcut expense verisine geri al
    if (expense) {
      setFormTitle(expense?.tur || expense?.category || '');
      setFormTotal(formatMoneyInput(String(expense?.tutar ?? expense?.amount ?? '')));
      setFormShared(formatMoneyInput(String(expense?.ortakHarcamaTutari ?? '')));
      const pMap = {};
      (expense?.sahsiHarcamalar || []).forEach(it => {
        const uid = Number(it?.userId ?? it?.UserId);
        const val = Number(it?.tutar ?? it?.Tutar ?? it?.amount ?? 0);
        if (Number.isFinite(uid)) pMap[String(uid)] = String(val);
      });
      setFormPersonal(pMap);
      setFormNote(String(expense?.note ?? expense?.Note ?? expense?.description ?? expense?.Description ?? expense?.aciklama ?? expense?.Aciklama ?? ''));
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      const dto = {
        Tur: String(formTitle || '').trim(),
        Tutar: parseMoneyInput(formTotal),
        OrtakHarcamaTutari: parseMoneyInput(formShared),
        SahsiHarcamalar: Object.entries(formPersonal)
          .map(([uid, val]) => ({ UserId: Number(uid), Tutar: parseMoneyInput(val) }))
          .filter(x => Number.isFinite(x.UserId) && x.Tutar >= 0),
        Aciklama: String(formNote || '').trim(),
        Note: String(formNote || '').trim(),
        // 🔹 Backend'in üçüncü fallback'i de garanti olsun
        Description: String(formNote || '').trim(),
      };

      if (!dto.Tur) return Alert.alert('Hata', 'Başlık/Tür boş olamaz');
      if (!(dto.Tutar > 0)) return Alert.alert('Hata', 'Toplam tutar > 0 olmalı');
      if (dto.OrtakHarcamaTutari < 0) return Alert.alert('Hata', 'Ortak tutar 0 veya daha büyük olmalı');
      const personalTotal = dto.SahsiHarcamalar.reduce((sum, item) => sum + item.Tutar, 0);
      if (Math.abs(dto.OrtakHarcamaTutari + personalTotal - dto.Tutar) > 0.01) {
        return Alert.alert('Tutarları kontrol et', 'Ortak tutar ile kişisel tutarların toplamı genel tutara eşit olmalı.');
      }

      await expensesApi.update(expenseId, dto);
      Alert.alert('Başarılı', 'Harcama güncellendi');
      setIsEditing(false);
      await fetchExpenseDetail();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Güncelleme başarısız';
      Alert.alert('Hata', msg);
    }
  };

  const handleDeleteExpense = () => {
    Alert.alert(
      'Harcamayı Sil',
      'Bu harcamayı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting expense:', expenseId);
              const response = await expensesApi.remove(expenseId);
              console.log('✅ Delete response:', response?.data);
              Alert.alert('Başarılı', 'Harcama silindi');
              try { eventBus.emit('expenses:updated', { houseId: Number(houseId) }); } catch {}
              navigation.goBack();
            } catch (error) {
              console.error('❌ Delete expense error:', error);
              console.error('❌ Delete error response:', error?.response?.data);
              Alert.alert('Hata', `Harcama silinirken bir hata oluştu:\n\n${error?.response?.data?.message || error?.message || 'Bilinmeyen hata'}`);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Harcama Detayı</Text>
        </View>
        <View style={[CommonStyles.card, { alignItems: 'center', padding: 40 }]}>
          <ActivityIndicator size="large" color={theme.colors.primary?.[600]} />
          <Text style={{ color: theme.colors.text.secondary, marginTop: 16 }}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={CommonStyles.container}>
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Harcama Detayı</Text>
        </View>
        <View style={CommonStyles.card}>
          <Text style={styles.errorText}>Harcama bulunamadı</Text>
        </View>
      </View>
    );
  }

  const titleText = expense?.tur || expense?.category || 'Harcama';

  // Ledger → kullanıcı bazlı özet (kişi başı)
  const userShares = (() => {
    const map = new Map(); // key: fromUserId, val: toplam borç
    (ledgerLines || []).forEach((l) => {
      const uid = Number(l?.fromUserId);
      const amt = Number(l?.amount || 0);
      if (!uid || !amt) return;
      map.set(uid, Number((map.get(uid) || 0) + amt));
    });
    return Array.from(map.entries())
      .map(([uid, total]) => ({ uid, total }))
      .sort((a, b) => b.total - a.total);
  })();

  return (
    <View style={CommonStyles.container}>
      <KeyboardAwareScrollView
        style={CommonStyles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={110}
      >
        <View style={CommonStyles.header}>
          <Text style={CommonStyles.title}>Harcama Detayı</Text>
          <Text style={CommonStyles.subtitle}>{houseName || ''}</Text>
        </View>

        {/* Harcama Bilgileri */}
        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>Harcama Bilgileri</Text>

          {!isEditing ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kategori/Başlık:</Text>
                <Text style={styles.detailValue}>{titleText}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tutar (kalem):</Text>
                <Text style={[styles.detailValue, styles.amountText]}>
                  {formatAmount(expense?.tutar ?? expense?.amount ?? 0)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ortak Harcama:</Text>
                <Text style={styles.detailValue}>
                  {formatAmount(expense?.ortakHarcamaTutari ?? 0)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tarih:</Text>
                <Text style={styles.detailValue}>
                  {safeDateForUI(expense?.postDate || expense?.kayitTarihi || expense?.createdAt || expense?.createdDate)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ödeyen:</Text>
                <Text style={styles.detailValue}>
                  {expense?.odeyenKullaniciAdi || expense?.odeyenUser?.fullName || 'Bilinmiyor'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kaydeden:</Text>
                <Text style={styles.detailValue}>
                  {expense?.kaydedenKullaniciAdi || expense?.kaydedenUser?.fullName || 'Bilinmiyor'}
                </Text>
              </View>

              <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Açıklama:</Text>
                <Text style={[styles.detailValue, { textAlign: 'left' }]}>
                  {String(expense?.note ?? expense?.Note ?? expense?.description ?? expense?.Description ?? expense?.aciklama ?? expense?.Aciklama ?? '—')}
                </Text>
              </View>
              {!(expense?.note || expense?.Note || expense?.description || expense?.Description || expense?.aciklama || expense?.Aciklama) ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>Teşhis:</Text>
                  <Text style={[styles.detailValue, { textAlign: 'left', color: theme.colors.text.secondary }]}>
                    Not alanı bulunamadı. Lütfen yeni bir notla kaydedip tekrar deneyin.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.editRow}>
                <Text style={styles.detailLabel}>Başlık</Text>
                <TextInput style={styles.input} value={formTitle} onChangeText={setFormTitle} placeholder="Örn: Market" />
              </View>
              <View style={styles.editRow}>
                <Text style={styles.detailLabel}>Toplam Tutar</Text>
                <TextInput
                  style={styles.input}
                  value={formTotal}
                  onChangeText={(t) => setFormTotal(formatMoneyInput(t))}
                  keyboardType="numeric"
                  placeholder="2.500"
                />
              </View>
              <View style={styles.editRow}>
                <Text style={styles.detailLabel}>Ortak Tutar</Text>
                <TextInput
                  style={styles.input}
                  value={formShared}
                  onChangeText={(t) => setFormShared(formatMoneyInput(t))}
                  keyboardType="numeric"
                  placeholder="2.000"
                />
              </View>
              <View style={[styles.editRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Açıklama</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top', flex: 1 }]}
                  value={formNote}
                  onChangeText={setFormNote}
                  placeholder="Not / açıklama"
                  multiline
                />
              </View>
            </>
          )}
        </View>

        {/* Plan Özeti (varsa) */}
        {(planStats?.totalMonths || 0) > 0 && (
          <View style={CommonStyles.card}>
            <Text style={styles.sectionTitle}>
              {planStats.type === 'installment' ? 'Taksit Planı Özeti' : 'Düzenli Gider Özeti'}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Aylık Tutar:</Text>
              <Text style={[styles.detailValue, styles.amountText]}>
                {formatAmount(planStats.monthlyAmount)}
              </Text>
            </View>

            {planStats.dueDay ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vade Günü:</Text>
                <Text style={styles.detailValue}>{planStats.dueDay}</Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Toplam Ay:</Text>
              <Text style={styles.detailValue}>{planStats.totalMonths}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tamamlanan:</Text>
              <Text style={styles.detailValue}>{planStats.maturedMonths}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kalan:</Text>
              <Text style={styles.detailValue}>{planStats.remainingMonths}</Text>
            </View>
          </View>
        )}

        {/* Kişisel Harcamalar (varsa) */}
        {expense?.sahsiHarcamalar && expense.sahsiHarcamalar.length > 0 && (
          <View style={CommonStyles.card}>
            <Text style={styles.sectionTitle}>Kişisel Harcamalar</Text>
            {(!isEditing ? expense.sahsiHarcamalar : expense.sahsiHarcamalar).map((item, index) => {
              const uid = String(item?.userId ?? item?.UserId);
              const name = item?.kullaniciAdi || `Kullanıcı ${uid}`;
              const val = formPersonal[uid] ?? String(item?.tutar || item?.amount || 0);
              return (
                <View key={index} style={styles.personalItem}>
                  <Text style={styles.personalName}>{name}</Text>
                  {!isEditing ? (
                    <Text style={styles.personalAmount}>{formatAmount(Number(val))}</Text>
                  ) : (
                    <TextInput
                      style={[styles.input, { width: 120, textAlign: 'right' }]}
                      value={val}
                      onChangeText={(t) => setFormPersonal((p) => ({ ...p, [uid]: formatMoneyInput(t) }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Ledger Satırları (Bu kalem için kişi başı paylar) */}
        <View style={CommonStyles.card}>
          <Text style={styles.sectionTitle}>Bu Kalem İçin Paylaşım</Text>

          {userShares.length > 0 ? (
            userShares.map((u) => (
              <View key={u.uid} style={styles.ledgerItem}>
                <View style={styles.ledgerInfo}>
                  <Text style={styles.ledgerFrom}>{membersMap[u.uid] || (u.uid === user?.id ? 'Sen' : `Kullanıcı ${u.uid}`)}</Text>
                  <Text style={[styles.ledgerArrow, { marginLeft: 6, marginRight: 6 }]}>→</Text>
                  <Text style={styles.ledgerTo}>{expense?.odeyenKullaniciAdi || expense?.odeyenUser?.fullName || membersMap[Number(expense?.odeyenUserId)] || 'Ödeyen'}</Text>
                </View>
                <Text style={styles.ledgerAmount}>{formatAmount(u.total)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Ledger kaydı yok</Text>
              <Text style={styles.emptySubtext}>Bu kalem için tahakkuk/borç satırı oluşmamış ya da gizli.</Text>
            </View>
          )}
        </View>

        {/* İşlem Butonları */}
        <View style={styles.actionButtons}>
          {!isEditing ? (
            <>
              <TouchableOpacity
                style={[CommonStyles.menuButton, { backgroundColor: ColorThemes.primary.background }]}
                onPress={handleStartEdit}
                activeOpacity={0.8}
              >
                <View style={CommonStyles.buttonContent}>
                  <Ionicons name="create-outline" size={22} color={ColorThemes.primary.foreground} style={{ marginBottom: 4 }} />
                  <Text style={CommonStyles.buttonText}>Düzenle</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[CommonStyles.menuButton, { backgroundColor: ColorThemes.error.background }]}
                onPress={handleDeleteExpense}
                activeOpacity={0.8}
              >
                <View style={CommonStyles.buttonContent}>
                  <Ionicons name="trash-outline" size={22} color={ColorThemes.error.foreground} style={{ marginBottom: 4 }} />
                  <Text style={CommonStyles.buttonText}>Harcamayı Sil</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[CommonStyles.menuButton, { backgroundColor: ColorThemes.primary.background }]}
                onPress={handleSaveEdit}
                activeOpacity={0.8}
              >
                <View style={CommonStyles.buttonContent}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={ColorThemes.primary.foreground} style={{ marginBottom: 4 }} />
                  <Text style={CommonStyles.buttonText}>Kaydet</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[CommonStyles.menuButton, { backgroundColor: ColorThemes.neutral.background }]}
                onPress={handleCancelEdit}
                activeOpacity={0.8}
              >
                <View style={CommonStyles.buttonContent}>
                  <Ionicons name="close-outline" size={22} color={ColorThemes.neutral.foreground} style={{ marginBottom: 4 }} />
                  <Text style={CommonStyles.buttonText}>İptal</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

function makeStyles(theme) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text.primary,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: theme.colors.text.primary,
      textAlign: 'right',
      flex: 1,
      marginLeft: 16,
    },
    amountText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.primary[600],
    },
    personalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    personalName: {
      fontSize: 14,
      color: theme.colors.text.primary,
    },
    personalAmount: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.primary[600],
    },
    ledgerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    ledgerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    ledgerFrom: {
      fontSize: 14,
      color: theme.colors.text.primary,
    },
    ledgerArrow: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    ledgerTo: {
      fontSize: 14,
      color: theme.colors.text.primary,
    },
    ledgerAmount: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.primary[600],
    },
    actionButtons: { marginTop: 20 },
    emptyState: { padding: 20, alignItems: 'center' },
    emptyText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.text.disabled,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      padding: 20,
    },
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      backgroundColor: theme.colors.background,
      color: theme.colors.text.primary,
      flex: 1,
    },
  });
}

export default HarcamaDetayi;
