import { NON_BILL_KEYS } from './expenseClassifier';
import { getCategoryDisplayName, getCategoryIcon, getCategoryColor } from '../constants/ExpenseEnums';

export const getUTCMonthWindow = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  return { monthStart, monthEnd };
};

export const formatCurrency = (amount) => new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

const parseExpenseDate = (value) => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isFinite(fromNumber.getTime()) ? fromNumber : new Date(0);
  }

  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return new Date(0);
  }

  const direct = new Date(rawValue);
  if (Number.isFinite(direct.getTime())) {
    return direct;
  }

  const dmyMatch = rawValue.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dmyMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = dmyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const ymdMatch = rawValue.match(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (ymdMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = ymdMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  return new Date(0);
};

export const formatDate = (date) => {
  if (!date) return '-';
  const resolved = parseExpenseDate(date);
  if (!Number.isFinite(resolved.getTime()) || resolved.getTime() === 0) return '-';

  return resolved.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getItemDate = (item) => {
  const raw = item?._raw || {};
  const date = item?.date ||
    raw.kayitTarihi ||
    raw.postDate ||
    raw.createdDate ||
    raw.KayitTarihi ||
    raw.PostDate ||
    raw.CreatedDate;

  return parseExpenseDate(date);
};

export const getSortDate = (item) => {
  const raw = item?._raw || {};
  const planType = getPlanType(item);
  const createdDate = parseExpenseDate(raw.createdDate ?? raw.CreatedDate);

  if (planType === 'irregular' && Number.isFinite(createdDate.getTime()) && createdDate.getTime() > 0) {
    return createdDate;
  }

  return getItemDate(item);
};

export const isFutureExpense = (item, now = new Date()) => {
  const date = getItemDate(item);
  return Number.isFinite(date.getTime()) && date.getTime() > now.getTime();
};

export const getItemNote = (item) => {
  const raw = item?._raw || {};
  return item?.note ??
    item?.Note ??
    item?.description ??
    item?.Description ??
    raw?.note ??
    raw?.Note ??
    raw?.aciklama ??
    raw?.Aciklama ??
    raw?.description ??
    raw?.Description ??
    '-';
};

export const getPlanType = (item) => {
  const raw = item?._raw || {};
  const installmentCount = Number(raw.installmentCount ?? raw.InstallmentCount ?? 0);
  const hasDueDay = (raw.dueDay ?? raw.DueDay ?? null) != null;
  const hasPlanStart = (raw.planStartMonth ?? raw.PlanStartMonth ?? raw.startMonth ?? raw.StartMonth ?? null) != null;

  if (installmentCount > 1) return 'installment';
  if (hasDueDay || hasPlanStart) return 'recurring';
  return 'irregular';
};

export const isChildExpense = (item) => {
  const raw = item?._raw || {};
  return (raw.parentExpenseId ?? raw.ParentExpenseId ?? null) != null;
};

export const isParentExpense = (item) => {
  const raw = item?._raw || {};
  return (raw.parentExpenseId ?? raw.ParentExpenseId ?? null) == null &&
    (getPlanType(item) === 'recurring' || getPlanType(item) === 'installment');
};

export const isUtilityKey = (key) => !NON_BILL_KEYS.includes(key);

export const deduplicateMonthlyPlans = (items) => {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const raw = item._raw || {};
    const parentId = raw.parentExpenseId ?? raw.ParentExpenseId;
    const date = getItemDate(item);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    if (isParentExpense(item)) continue;

    if (parentId != null) {
      const key = `${parentId}-${year}-${month}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }

    result.push(item);
  }

  return result;
};

export const filterCurrentMonthPast = (items) => {
  const { monthStart, monthEnd } = getUTCMonthWindow();
  const now = new Date();

  return items.filter((item) => {
    const date = getItemDate(item);
    if (!(date >= monthStart && date < monthEnd)) return false;
    if (date > now) return false;
    return true;
  });
};

export const compareByRecentDate = (a, b) => {
  const dateA = getSortDate(a);
  const dateB = getSortDate(b);
  const now = new Date();
  const futureA = isFutureExpense(a, now);
  const futureB = isFutureExpense(b, now);

  if (futureA !== futureB) {
    return futureA ? 1 : -1;
  }

  if (dateA.getTime() !== dateB.getTime()) {
    return dateB.getTime() - dateA.getTime();
  }

  return (b.id ?? 0) - (a.id ?? 0);
};

export const sortByDateDesc = (items) => [...items].sort(compareByRecentDate);

export const getExpenseDisplayTitle = (item) => {
  const rawTitle = String(item?.title || '').trim();
  const raw = item?._raw || {};
  const planType = getPlanType(item);
  const categoryLabel = getCategoryDisplayName(item?.key);
  const categoryText = String(
    raw?.category ?? raw?.Category ?? raw?.utilityType ?? raw?.UtilityType ?? ''
  ).trim();

  if (planType !== 'irregular' && /(başlangıç|baslangic|baÅŸlangÄ±Ã§)/i.test(rawTitle)) {
    return categoryLabel;
  }

  if (rawTitle) {
    return rawTitle;
  }

  if (categoryText) {
    return categoryText;
  }

  return `${categoryLabel} harcamasi`;
};

export const getStatusBadges = (item) => {
  const badges = [];
  const raw = item._raw || {};
  const date = getItemDate(item);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const installmentCount = Number(raw.installmentCount ?? raw.InstallmentCount ?? 0);
  const installmentNumber = Number(raw.installmentNumber ?? raw.InstallmentNumber ?? 0);
  if (installmentCount > 1 && installmentNumber > 0) {
    badges.push({ text: `Taksit ${installmentNumber}/${installmentCount}`, type: 'info' });
  }

  const dueDay = raw.dueDay ?? raw.DueDay;
  const hasPlanSignals =
    installmentCount > 1 ||
    dueDay != null ||
    (raw.planStartMonth ?? raw.PlanStartMonth ?? raw.startMonth ?? raw.StartMonth ?? null) != null ||
    (raw.parentExpenseId ?? raw.ParentExpenseId ?? null) != null;

  if (hasPlanSignals) {
    if (itemDate < today) {
      badges.push({ text: 'Gecikmis', type: 'error' });
    } else if (itemDate.getTime() === today.getTime()) {
      badges.push({ text: 'Bugun', type: 'warning' });
    }
  }

  if (dueDay != null) {
    badges.push({ text: `Vade: ${dueDay}`, type: 'neutral' });
  }

  const isPaid = raw.isPaid ?? raw.IsPaid ?? (raw.status === 'paid') ?? (raw.Status === 'Paid');
  if (isPaid !== undefined) {
    badges.push({
      text: isPaid ? 'Odendi' : 'Odenmedi',
      type: isPaid ? 'success' : 'warning',
    });
  }

  return badges;
};

export const UTILITY_META = {
  Electricity: { label: 'Elektrik', icon: 'E', color: '#3b82f6' },
  Water: { label: 'Su', icon: 'S', color: '#0ea5e9' },
  Gas: { label: 'Dogalgaz', icon: 'G', color: '#ef4444' },
  Internet: { label: 'Internet', icon: 'I', color: '#0284c7' },
  Rent: { label: 'Kira', icon: 'K', color: '#22c55e' },
  Other: { label: 'Diger', icon: 'D', color: '#737373' },
};

export const getUtilityMeta = (key) => UTILITY_META[key] || UTILITY_META.Other;

export const calculateTotals = (items) => {
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const count = items.length;
  return { total, count };
};

export const getUserLedgerStatus = () => ({
  isDebtor: false,
  isCreditor: false,
  amount: 0,
  status: 'neutral',
});

export { getCategoryDisplayName, getCategoryIcon, getCategoryColor };
