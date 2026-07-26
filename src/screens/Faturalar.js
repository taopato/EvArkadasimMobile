// src/screens/Faturalar.js
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { expensesApi, scheduledChargesApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { getCategoryDisplayName as getCatName, getCategoryIconName as getCatIconName } from '../constants/ExpenseEnums';
import { useCommonStyles } from '../shared/ui/CommonStyles';
import Toast from '../components/Toast';
import eventBus from '../shared/events/bus';
import { PremiumCard } from '../shared/ui/premium/Card';
import { TouchableScale } from '../shared/ui/premium/TouchableScale';
import PrimaryActionCard from '../shared/ui/PrimaryActionCard';
import {
  normalizeExpense,
  NON_BILL_KEYS,
  CATEGORY_ID_TO_KEY,
} from '../utils/expenseClassifier';
import { getParentCategoryHint } from '../shared/state/categoryHints';
import { useFocusEffect } from '@react-navigation/native';
import useScrollRestore from '../hooks/useScrollRestore';
import BrandMark from '../components/BrandMark';
import ScheduledChargeCard from '../components/ScheduledChargeCard';

const formatAmount = (amount) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const UTILITY_META = {
  Electricity: { label: 'Elektrik' },
  Water: { label: 'Su' },
  Gas: { label: 'Doğalgaz' },
  Internet: { label: 'İnternet' },
  Rent: { label: 'Kira' },
  Other: { label: 'Diğer' },
};

const isUtilityKey = (k) => !NON_BILL_KEYS.includes(k);
const toUtilityKey = (k) => (UTILITY_META[k] ? k : 'Other');

const normalizeText = (s = '') => {
  try {
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u');
  } catch {
    return String(s).toLowerCase();
  }
};

const pickUtilityKey = (it) => {
  const raw = it?._raw || {};

  const candidates = [
    it?.key,
    raw.category,
    raw.Category,
    raw.categoryId,
    raw.CategoryId,
    raw.utilityType,
    raw.UtilityType,
  ];

  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const n = Number(c);
    if (Number.isFinite(n) && CATEGORY_ID_TO_KEY[n]) {
      return CATEGORY_ID_TO_KEY[n];
    }
  }

  for (const c of candidates) {
    if (!c || typeof c !== 'string') continue;
    const lower = c.toLowerCase();
    const match = Object.keys(UTILITY_META).find(
      (k) => k.toLowerCase() === lower
    );
    if (match) return match;
  }

  const t = normalizeText(it?.tur || it?.Tur || raw.tur || raw.Tur || it?.title || '');
  if (/elektrik|electric|electricity/.test(t)) return 'Electricity';
  if (/(^|\s)(su|water)($|\s)/.test(t)) return 'Water';
  if (/(dogalgaz|doğalgaz|gaz|gas|naturalgas)/.test(t)) return 'Gas';
  if (/internet/.test(t)) return 'Internet';
  if (/(kira|rent)/.test(t)) return 'Rent';

  return 'Other';
};

const getMonthWindow = (base = new Date()) => {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  return { start, end };
};

const getItemDate = (it) => {
  const v =
    it?.date ||
    it?._raw?.kayitTarihi ||
    it?._raw?.postDate ||
    it?._raw?.createdDate ||
    it?.kayitTarihi ||
    it?.postDate ||
    it?.createdDate;
  return new Date(v || 0);
};

const cmpByDateThenIdDesc = (a, b) => {
  const db = getItemDate(b).getTime();
  const da = getItemDate(a).getTime();
  if (db !== da) return db - da;
  const ib = Number(b.id || b._raw?.id || 0);
  const ia = Number(a.id || a._raw?.id || 0);
  return ib - ia;
};

export default function BillsOverviewScreen({ navigation, route }) {
  const { user } = useAuth();
  const routeParams = route.params || {};
  const houseId = routeParams.houseId || user?.defaultHouseId;
  const houseName = routeParams.houseName || user?.defaultHouseName || 'Aktif Ev';
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 520;
  const [loading, setLoading] = React.useState(false);
  useCommonStyles();
  const [toast, setToast] = React.useState({
    visible: false,
    message: '',
    type: 'success',
  });
  const [items, setItems] = React.useState([]);
  const [scheduledPlans, setScheduledPlans] = React.useState([]);
  const [busyCycleId, setBusyCycleId] = React.useState(null);
  const lastFetchedAtRef = useRef(0);
  const debounceRef = useRef(null);
  const { listRef, handleScroll } = useScrollRestore(
    `BillsOverviewScreen:${houseId ?? 'all'}`
  );

  const [category, setCategory] = React.useState(null);
  const [paidFilter, setPaidFilter] = React.useState('all');

  const showToast = (message, type = 'success') =>
    setToast({ visible: true, message, type });
  const hideToast = () => setToast((p) => ({ ...p, visible: false }));

  const fetchData = async (opts = { silent: false }) => {
    if (!houseId) return;
    if (!opts?.silent) setLoading(true);
    try {
      const resExp = await expensesApi.getByHouse(Number(houseId));
      let scheduled = [];
      try {
        const resScheduled = await scheduledChargesApi.getByHouse(Number(houseId));
        const rawScheduled = resScheduled?.data?.data ?? resScheduled?.data ?? [];
        scheduled = Array.isArray(rawScheduled) ? rawScheduled : [];
      } catch (scheduledError) {
        console.error('Scheduled charges fetch error:', scheduledError);
      }
      const rawExp =
        resExp?.data?.data ?? resExp?.data?.list ?? resExp?.data ?? [];
      const arrExp = Array.isArray(rawExp) ? rawExp : [];

      const normalized = arrExp.map(normalizeExpense);

      const getKeyFromRaw = (r = {}) => {
        const idCand = r.categoryId ?? r.CategoryId ?? (typeof r.category === 'number' ? r.category : undefined) ?? (typeof r.Category === 'number' ? r.Category : undefined);
        if (idCand != null && CATEGORY_ID_TO_KEY[Number(idCand)]) return CATEGORY_ID_TO_KEY[Number(idCand)];
        const nameCand = (typeof r.category === 'string' && r.category) || (typeof r.Category === 'string' && r.Category) || (typeof r.utilityType === 'string' && r.utilityType) || (typeof r.UtilityType === 'string' && r.UtilityType) || '';
        if (nameCand) {
          const lower = String(nameCand).toLowerCase();
          const direct = Object.keys(UTILITY_META).find(k => k.toLowerCase() === lower);
          if (direct) return direct;
          if (lower.includes('kira')) return 'Rent';
          if (lower.includes('elektrik') || lower.includes('electric') || lower.includes('electricity')) return 'Electricity';
          if (lower === 'su' || lower.includes(' water') || lower.includes('su ') || lower.includes('water')) return 'Water';
          if (lower.includes('doğalgaz') || lower.includes('dogalgaz') || lower.includes('naturalgas') || lower === 'gaz' || lower.includes(' gas')) return 'Gas';
          if (lower.includes('internet')) return 'Internet';
          if (lower.includes('diğer') || lower.includes('diger') || lower === 'other') return 'Other';
        }
        return undefined;
      };

      const idToKey = new Map();
      for (const r of arrExp) {
        const rid = Number(r?.id ?? r?.expenseId);
        if (!Number.isFinite(rid)) continue;
        const k = getKeyFromRaw(r);
        if (k && UTILITY_META[k]) idToKey.set(rid, k);
      }

      for (const x of normalized) {
        const raw = x._raw || {};
        const pid = Number(raw.parentExpenseId ?? raw.ParentExpenseId);
        if (!Number.isFinite(pid) || idToKey.has(pid)) continue;

        const inferredKey = pickUtilityKey(x);
        if (inferredKey && UTILITY_META[inferredKey]) {
          idToKey.set(pid, inferredKey);
          continue;
        }

        const hintedKey = getParentCategoryHint(pid);
        if (hintedKey && UTILITY_META[hintedKey]) {
          idToKey.set(pid, hintedKey);
        }
      }

      const normalizedWithKeys = normalized.map(x => {
        let k = x.key;
        const raw = x._raw || {};
        if (!UTILITY_META[k]) {
          const fromRaw = getKeyFromRaw(raw);
          if (fromRaw) k = fromRaw;
          else {
            const pid = raw.parentExpenseId ?? raw.ParentExpenseId;
            if (pid != null) {
              if (idToKey.has(Number(pid))) k = idToKey.get(Number(pid));
              else {
                const hint = getParentCategoryHint(pid);
                if (hint && UTILITY_META[hint]) k = hint;
              }
            }
          }
        }
        return { ...x, key: k || 'Other' };
      });

      const now = new Date();
      const { start: monthStart, end: monthEnd } = getMonthWindow(now);

      const candidates = normalizedWithKeys.filter((x) => {
        const raw = x._raw || {};
        const parentId = raw.parentExpenseId ?? raw.ParentExpenseId ?? null;

        const isChild = parentId != null;
        const isParent = parentId == null;
        const installmentCount = Number(
          raw.installmentCount ?? raw.InstallmentCount ?? 0
        );
        const hasPlanSignals =
          installmentCount > 1 ||
          (raw.dueDay ?? raw.DueDay ?? null) != null ||
          (raw.planStartMonth ??
            raw.PlanStartMonth ??
            raw.startMonth ??
            raw.StartMonth ??
            null) != null;

        const keyKForFilter = toUtilityKey(x.key || pickUtilityKey(x));
        const isVariableUtility = keyKForFilter === 'Water' || keyKForFilter === 'Electricity' || keyKForFilter === 'Gas';

        if (isVariableUtility) {
          const d = getItemDate(x);
          if (!(d >= monthStart && d < monthEnd)) return false;
          if (d > now) return false;
          return true;
        }

        if (isParent && hasPlanSignals) return true;

        if (isChild) return false;

        return false;
      });

      const pickMap = new Map();
      for (const it of candidates) {
        const raw = it._raw || {};
        const parentId = raw.parentExpenseId ?? raw.ParentExpenseId ?? null;
        const d = getItemDate(it);
        const ym = `${d.getUTCFullYear()}-${String(
          d.getUTCMonth() + 1
        ).padStart(2, '0')}`;

        const key =
          parentId != null ? `p-${parentId}-${ym}` : `s-${it.id || raw.id || `${it.title}-${ym}`}`;

        const prev = pickMap.get(key);
        if (!prev) pickMap.set(key, it);
        else {
          const better = cmpByDateThenIdDesc(it, prev) < 0 ? it : prev;
          pickMap.set(key, better);
        }
      }

      const onlyThisMonth = Array.from(pickMap.values()).sort(
        cmpByDateThenIdDesc
      );

      setItems(onlyThisMonth);
      setScheduledPlans(scheduled);
      lastFetchedAtRef.current = Date.now();
    } catch (e) {
      console.error('BillsOverviewScreen fetch error:', e);
      showToast('Fatura verileri yüklenemedi', 'error');
      setItems([]);
      setScheduledPlans([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ silent: false });
  }, [houseId]);

  useEffect(() => {
    const onUpdated = ({ houseId: changedId }) => {
      if (Number(changedId) === Number(houseId)) fetchData({ silent: true });
    };
    const onCreatedRecurring = ({ houseId: changedId }) => {
      if (Number(changedId) !== Number(houseId)) return;
      fetchData({ silent: true });
    };
    const onScheduledUpdated = ({ houseId: changedId }) => {
      if (Number(changedId) !== Number(houseId)) return;
      fetchData({ silent: true });
    };
    eventBus.on('expenses:updated', onUpdated);
    eventBus.on('expenses:created:recurring', onCreatedRecurring);
    eventBus.on('scheduled-charges:updated', onScheduledUpdated);
    return () => {
      eventBus.off('expenses:updated', onUpdated);
      eventBus.off('expenses:created:recurring', onCreatedRecurring);
      eventBus.off('scheduled-charges:updated', onScheduledUpdated);
    };
  }, [houseId]);

  useFocusEffect(
    React.useCallback(() => {
      const elapsed = Date.now() - (lastFetchedAtRef.current || 0);
      if (elapsed < 2 * 60 * 1000) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchData({ silent: true }), 400);
      return () => debounceRef.current && clearTimeout(debounceRef.current);
    }, [houseId])
  );

  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (category && toUtilityKey(b.key) !== category) return false;
      if (paidFilter !== 'all') {
        const paid =
          typeof b.isPaid === 'boolean'
            ? b.isPaid
            : String(b.status || '').toLowerCase() === 'paid';
        if (paidFilter === 'paid' && !paid) return false;
        if (paidFilter === 'unpaid' && paid) return false;
      }
      return true;
    });
  }, [items, category, paidFilter]);

  const totals = useMemo(() => {
    const all = filtered.reduce(
      (s, b) => s + (Number(b.amount ?? b.tutar) || 0),
      0
    );
    const isPaidOf = (b) => (typeof b.isPaid === 'boolean' ? b.isPaid : String(b.status || '').toLowerCase() === 'paid');
    const pending = filtered.filter((b) => !isPaidOf(b));
    const pendingTotal = pending.reduce((s, b) => s + (Number(b.amount ?? b.tutar) || 0), 0);
    return { all, pendingCount: pending.length, pendingTotal };
  }, [filtered]);

  const getDueBadge = (raw) => {
    const dueDay = raw.dueDay ?? raw.DueDay ?? null;
    if (dueDay == null) return null;
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), Number(dueDay));
    const diffDays = Math.round((due.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (diffDays < 0) return { label: 'Gecikti', tone: 'error' };
    if (diffDays === 0) return { label: 'Bugün son gün', tone: 'error' };
    if (diffDays === 1) return { label: 'Yarın son gün', tone: 'warning' };
    if (diffDays <= 5) return { label: `${diffDays} gün kaldı`, tone: 'warning' };
    return null;
  };

  const sectioned = useMemo(() => {
    const isPaidOf = (b) => (typeof b.isPaid === 'boolean' ? b.isPaid : String(b.status || '').toLowerCase() === 'paid');
    const unpaid = filtered.filter((b) => !isPaidOf(b));
    const paid = filtered.filter(isPaidOf);
    const rows = [];
    if (unpaid.length) {
      rows.push({ __header: true, id: 'h-unpaid', title: 'Ödenecekler', count: unpaid.length });
      rows.push(...unpaid);
    }
    if (paid.length) {
      rows.push({ __header: true, id: 'h-paid', title: 'Ödendi', count: paid.length });
      rows.push(...paid);
    }
    return rows;
  }, [filtered]);

  const handleAddBill = () => {
    navigation.navigate('DuzenliGiderEkle', {
      houseId,
      houseName,
      defaultMode: 'recurring',
    });
  };

  const handleToggleShare = async (plan, share, isPaid) => {
    if (!plan?.cycle?.id || !share?.userId) return;
    setBusyCycleId(plan.cycle.id);
    try {
      await scheduledChargesApi.setSharePaid(plan.cycle.id, share.userId, isPaid);
      showToast(isPaid ? 'Kira payı ödendi olarak işaretlendi.' : 'Kira payı yeniden açıldı.');
      eventBus.emit('scheduled-charges:updated', { houseId });
    } catch (error) {
      showToast(error?.response?.data?.message || 'Ödeme durumu güncellenemedi.', 'error');
    } finally {
      setBusyCycleId(null);
    }
  };

  const handleToggleExternal = (plan, isPaid) => {
    if (!plan?.cycle?.id) return;
    Alert.alert(
      isPaid ? 'Kirayı ödendi işaretle' : 'Ödeme durumunu geri al',
      isPaid
        ? 'Bu dönem için ev sahibine ödeme yapıldığını onaylıyor musunuz?'
        : 'Ev sahibine ödeme durumunu yeniden bekliyor yapmak istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: isPaid ? 'Ödendi' : 'Geri Al',
          onPress: async () => {
            setBusyCycleId(plan.cycle.id);
            try {
              await scheduledChargesApi.setExternalPaid(plan.cycle.id, isPaid);
              showToast(isPaid ? 'Kira ödemesi tamamlandı.' : 'Ödeme durumu geri alındı.');
              eventBus.emit('scheduled-charges:updated', { houseId });
            } catch (error) {
              showToast(error?.response?.data?.message || 'Ödeme durumu güncellenemedi.', 'error');
            } finally {
              setBusyCycleId(null);
            }
          },
        },
      ],
    );
  };

  const categories = [
    { key: null, label: 'Tümü' },
    { key: 'Electricity', label: 'Elektrik' },
    { key: 'Water', label: 'Su' },
    { key: 'Gas', label: 'Doğalgaz' },
    { key: 'Internet', label: 'İnternet' },
    { key: 'Rent', label: 'Kira' },
    { key: 'Other', label: 'Diğer' },
  ];

  const ListHeader = useCallback(() => (
    <View>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 4, paddingHorizontal: 16, backgroundColor: theme.colors.background }}>
        <View>
          <View>
            <Text style={{ color: theme.colors.text.primary, fontSize: 26, fontWeight: '900' }}>Faturalar</Text>
            <Text style={{ color: theme.colors.text.secondary, marginTop: 2, fontSize: 14 }}>{houseName}</Text>
          </View>
        </View>

        <View style={{
          marginTop: 16,
          borderRadius: 20,
          padding: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.neutral[200],
        }}>
          <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700' }}>Bu ay toplam</Text>
              <Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '900', marginTop: 2 }}>{formatAmount(totals.all)}</Text>
            </View>
            {!isCompact && <View style={{ width: 1, backgroundColor: theme.colors.neutral[200] }} />}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700' }}>Ödenecek</Text>
              <Text style={{ color: theme.colors.warning[700], fontSize: 22, fontWeight: '900', marginTop: 2 }}>{formatAmount(totals.pendingTotal)}</Text>
            </View>
          </View>
          {totals.pendingCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: theme.colors.warning[50], alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
              <Ionicons name="time-outline" size={13} color={theme.colors.warning[700]} />
              <Text style={{ color: theme.colors.warning[700], fontSize: 12, fontWeight: '700' }}>
                {totals.pendingCount} fatura ödenmeyi bekliyor
              </Text>
            </View>
          )}
        </View>
        {scheduledPlans.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '900' }}>Dönemsel Ödemeler</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Normal hesaptan ayrı</Text>
            </View>
            {scheduledPlans.map((plan) => (
              <ScheduledChargeCard
                key={String(plan.id)}
                plan={plan}
                currentUserId={user?.id}
                busy={Number(busyCycleId) === Number(plan?.cycle?.id)}
                onToggleShare={handleToggleShare}
                onToggleExternal={handleToggleExternal}
              />
            ))}
          </View>
        )}
        <PrimaryActionCard
          icon="document-text-outline"
          title="Yeni Fatura Ekle"
          subtitle="Tek seferlik veya düzenli bir fatura oluştur"
          onPress={handleAddBill}
          style={{ marginTop: 12 }}
        />
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <FlatList
          data={categories}
          keyExtractor={(it) => String(it.key ?? 'all')}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          renderItem={({ item }) => {
            const active = (category ?? null) === item.key;
            return (
              <View style={{ marginRight: 8 }}>
                <TouchableScale onPress={() => setCategory(item.key)}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: active ? theme.colors.primary[50] : theme.colors.surface,
                      borderColor: active ? theme.colors.primary?.[600] : theme.colors.neutral?.[200],
                    }}
                  >
                    <Text style={{
                      color: active ? theme.colors.primary?.[700] : theme.colors.text.primary,
                      fontWeight: active ? '700' : '500',
                      fontSize: 13,
                    }}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableScale>
              </View>
            );
          }}
        />
      </View>
    </View>
  ), [theme, totals, filtered, houseName, category, isCompact, scheduledPlans, busyCycleId, user?.id]);

  const renderItem = useCallback(({ item: it }) => {
    if (it.__header) {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.text.primary }}>{it.title}</Text>
          <View style={{ backgroundColor: theme.colors.neutral[100], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.text.secondary }}>{it.count}</Text>
          </View>
        </View>
      );
    }

    const raw = it._raw || {};
    const isPaid = typeof it.isPaid === 'boolean' ? it.isPaid : String(it.status || '').toLowerCase() === 'paid';
    const keyK = toUtilityKey(it.key || pickUtilityKey(it));
    const d = getItemDate(it);
    const catRaw = raw.category ?? raw.Category ?? raw.categoryId ?? raw.CategoryId ?? keyK;
    const iconName = getCatIconName(catRaw);
    const label = getCatName(catRaw);
    const idxNo = raw.installmentIndex || raw.InstallmentIndex || null;
    const cnt = raw.installmentCount || raw.InstallmentCount || null;
    const parentId = raw.parentExpenseId ?? raw.ParentExpenseId ?? null;
    const isChild = parentId != null;
    const dueDay = raw.dueDay ?? raw.DueDay ?? null;
    const isParentPlan = !isChild && ((raw.planStartMonth ?? raw.PlanStartMonth ?? null) != null || dueDay != null || Number(raw.installmentCount ?? raw.InstallmentCount ?? 0) > 1);
    const titleSuffix = keyK === 'Other' && isChild && idxNo != null && cnt != null ? ` • Taksit ${idxNo}/${cnt}` : '';
    const secondaryText = isParentPlan
      ? `${cnt > 1 ? `${cnt} ay plan` : 'Aylık plan'}${dueDay ? ` • Her ay ${dueDay}. gün` : ''}`
      : `Tarih: ${d.toLocaleDateString('tr-TR')}`;
    const dueBadge = !isPaid ? getDueBadge(raw) : null;

    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <TouchableScale
          onPress={() =>
            navigation.navigate('BillDetail', {
              billId: it.id,
              houseId,
              houseName,
            })
          }
        >
          <PremiumCard elevation="small" padding="medium" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary[50] }]}>
              <Ionicons name={iconName} size={22} color={theme.colors.primary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text.primary }}>
                {label}
                {titleSuffix}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 }}>
                {secondaryText}
              </Text>
              {dueBadge && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: theme.colors[dueBadge.tone][50],
                }}>
                  <Ionicons name="alarm-outline" size={11} color={theme.colors[dueBadge.tone][700]} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors[dueBadge.tone][700] }}>
                    {dueBadge.label}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 6 }}>
                {formatAmount(it.amount ?? it.tutar)}
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: isPaid ? theme.colors.success[50] : theme.colors.warning[50],
              }}>
                <Ionicons name={isPaid ? 'checkmark-circle' : 'time'} size={11} color={isPaid ? theme.colors.success[700] : theme.colors.warning[700]} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: isPaid ? theme.colors.success[700] : theme.colors.warning[700] }}>
                  {isPaid ? 'ÖDENDİ' : 'BEKLİYOR'}
                </Text>
              </View>
            </View>
          </PremiumCard>
        </TouchableScale>
      </View>
    );
  }, [navigation, houseId, houseName, theme]);

  const ListEmpty = useCallback(() => (
    <View style={[styles.empty, styles.emptyState, { paddingHorizontal: 16 }]}>
      <BrandMark variant="logo" size={190} subtle style={styles.emptyWatermark} />
      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
        {loading ? 'Veriler yükleniyor...' : 'Bu ay için görünür fatura bulunmuyor.'}
      </Text>
    </View>
  ), [theme, loading]);

  if (loading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary?.[500]} />
        <Text style={{ marginTop: 8, color: theme.colors.text.secondary }}>Fatura verileri yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        ref={listRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={sectioned}
        keyExtractor={(it, idx) => String(it?.__header ? it.id : it?.id ?? idx)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={8}
        removeClippedSubviews
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    padding: 16,
  },
  emptyState: { position: 'relative', overflow: 'hidden', minHeight: 190 },
  emptyWatermark: {
    position: 'absolute',
    opacity: 0.08,
    right: -24,
    bottom: -18,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  emptyText: { fontSize: 14, marginBottom: 8 },
});
