// src/constants/ExpenseEnums.js

export const ExpenseCategory = {
  Water: 'Water',
  Electricity: 'Electricity',
  Rent: 'Rent',
  Gas: 'Gas',
  Other: 'Other',
  Internet: 'Internet',
  Market: 'Market',
  Food: 'Food',
};

export const SplitPolicy = { Esit: 'Esit', KisiBazli: 'KisiBazli' };
export const PaymentMethod = { Cash: 'Cash', BankTransfer: 'BankTransfer' };
export const PaymentStatus = { Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' };

export const PaylasimTuru = {
  Ortak: 1,
  Kira: 2,
  Elektrik: 3,
  Su: 4,
  Yemek: 5,
};

export const NON_BILL_KEYS = ['Market', 'Food', 'Other'];
export const BILL_KEYS = ['Water', 'Electricity', 'Rent', 'Gas', 'Internet', 'Other'];

// Backend Domain.Enums.ExpenseCategory: Rent=0, Internet=1, Electricity=2, Water=3, Market=4, Food=5, Other=99
const CATEGORY_ID_TO_KEY = {
  0: 'Rent',
  1: 'Internet',
  2: 'Electricity',
  3: 'Water',
  4: 'Market',
  5: 'Food',
  99: 'Other',
};

export const getCategoryDisplayName = (category) => {
  const map = {
    Water: 'Su',
    Electricity: 'Elektrik',
    Rent: 'Kira',
    Gas: 'Dogalgaz',
    Other: 'Diger',
    Internet: 'Internet',
    Market: 'Market',
    Food: 'Yemek',
    0: 'Kira',
    1: 'Internet',
    2: 'Elektrik',
    3: 'Su',
    4: 'Market',
    5: 'Yemek',
    99: 'Diger',
  };

  const numKey = Number(category);
  if (!Number.isNaN(numKey) && map[numKey] != null) return map[numKey];
  return map[category] ?? String(category);
};

// Backend'in beklediği numerik enum'a çeviri (Rent=0, Internet=1, Electricity=2, Water=3, Market=4, Food=5, Other=99)
export const toExpenseCategory = (nameOrId) => {
  const byName = {
    Elektrik: 2,
    Su: 3,
    Dogalgaz: 99,
    DogalGaz: 99,
    Internet: 1,
    Kira: 0,
    Market: 4,
    Yemek: 5,
    Diger: 99,
    Electricity: 2,
    Water: 3,
    Gas: 99,
    Rent: 0,
    Other: 99,
    Food: 5,
  };
  const byId = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 99: 99 };

  if (typeof nameOrId === 'number') return byId[nameOrId] ?? 99;

  const asNum = Number(nameOrId);
  if (!Number.isNaN(asNum) && byId[asNum] != null) return byId[asNum];

  return byName[nameOrId] ?? 99;
};

// Premium tasarım dilinde gerçek vektör ikon kullanmak için Ionicons adları.
export const getCategoryIconName = (category) => {
  const iconMap = {
    Water: 'water-outline',
    Electricity: 'flash-outline',
    Rent: 'home-outline',
    Gas: 'flame-outline',
    Other: 'document-text-outline',
    Internet: 'wifi-outline',
    Market: 'cart-outline',
    Food: 'restaurant-outline',
  };

  if (typeof category === 'number') category = CATEGORY_ID_TO_KEY[category] ?? category;
  return iconMap[category] || 'cash-outline';
};

export const getCategoryColor = (category) => {
  const colorMap = {
    Water: '#3b82f6',
    Electricity: '#f59e0b',
    Rent: '#10b981',
    Gas: '#ef4444',
    Other: '#6b7280',
    Internet: '#8b5cf6',
    Market: '#f97316',
    Food: '#ec4899',
  };

  if (typeof category === 'number') category = CATEGORY_ID_TO_KEY[category] ?? category;
  return colorMap[category] || '#6b7280';
};

export const isBillCategory = (category) =>
  BILL_KEYS.includes(typeof category === 'number' ? CATEGORY_ID_TO_KEY[category] ?? category : category);

export const isFixedExpense = (category) => {
  const key = typeof category === 'number' ? CATEGORY_ID_TO_KEY[category] ?? category : category;
  return ['Rent', 'Internet'].includes(key);
};

export const isVariableExpense = (category) => {
  const key = typeof category === 'number' ? CATEGORY_ID_TO_KEY[category] ?? category : category;
  return ['Water', 'Electricity', 'Gas'].includes(key);
};

export const getSplitPolicyOptions = (category) => {
  const key = typeof category === 'number' ? CATEGORY_ID_TO_KEY[category] ?? category : category;
  return key === 'Market' || key === 'Food'
    ? [SplitPolicy.Esit, SplitPolicy.KisiBazli]
    : [SplitPolicy.Esit];
};

export const formatAmount = (amount) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export const formatDate = (dateString) => {
  if (!dateString) return 'Tarih yok';
  try {
    return new Date(dateString).toLocaleDateString('tr-TR');
  } catch {
    return 'Geçersiz tarih';
  }
};

const textToKey = (text = '') => {
  const t = String(text).toLowerCase();
  if (/(su|water)/.test(t)) return 'Water';
  if (/(elektrik|electricity)/.test(t)) return 'Electricity';
  if (/(kira|rent)/.test(t)) return 'Rent';
  if (/(dogalgaz|doğalgaz|gaz|gas)/.test(t)) return 'Gas';
  if (/internet/.test(t)) return 'Internet';
  if (/(market|alışveriş|alisveris|bakkal|migros|a101|bim)/.test(t)) return 'Market';
  if (/(yemek|food|pizza|burger|kahve|restoran|cafe)/.test(t)) return 'Food';
  return 'Other';
};

export const normalizeExpense = (raw = {}) => {
  const date = raw.kayitTarihi || raw.postDate || raw.date || raw.createdAt || raw.CreatedDate || null;

  let key;
  if (raw.category != null) key = CATEGORY_ID_TO_KEY[Number(raw.category)];
  if (!key) key = textToKey(`${raw.tur ?? ''} ${raw.description ?? raw.Description ?? raw.note ?? ''}`);

  const kind = isBillCategory(key) ? 'bill' : 'other';

  return {
    id: raw.id ?? raw.expenseId ?? raw.ExpenseId,
    title: raw.description ?? raw.Description ?? raw.tur ?? `${getCategoryDisplayName(key)} harcamasi`,
    amount: Number(raw.tutar ?? raw.amount ?? raw.Amount ?? 0),
    date,
    payerName: raw.odeyenKullaniciAdi ?? raw.OdeyenKullaniciAdi,
    recorderName: raw.kaydedenKullaniciAdi ?? raw.KaydedenKullaniciAdi,
    key,
    kind,
    _raw: raw,
  };
};

export const ymOf = (dateString) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const nowYm = () => ymOf(new Date().toISOString());

export const CATEGORY_ID_TO_KEY_EXPORT = CATEGORY_ID_TO_KEY;
export { CATEGORY_ID_TO_KEY };

export default {
  ExpenseCategory,
  SplitPolicy,
  PaymentMethod,
  PaymentStatus,
  PaylasimTuru,
  NON_BILL_KEYS,
  BILL_KEYS,
  toExpenseCategory,
  getCategoryDisplayName,
  getCategoryIconName,
  getCategoryColor,
  isBillCategory,
  isFixedExpense,
  isVariableExpense,
  getSplitPolicyOptions,
  formatAmount,
  formatDate,
  normalizeExpense,
  ymOf,
  nowYm,
  CATEGORY_ID_TO_KEY,
};
