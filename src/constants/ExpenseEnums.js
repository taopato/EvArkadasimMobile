// src/constants/ExpenseEnums.js

// String enum benzeri sabitler
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

// Backend PaylasimTuru enum (1-5)
export const PaylasimTuru = {
  Ortak: 1,      // Ortak harcama
  Kira: 2,       // Kira
  Elektrik: 3,   // Elektrik
  Su: 4,         // Su
  Yemek: 5       // Yemek
};

// UI/filtrelerde kullanılan yardımcı sabitler
// Günlük harcamalar (fatura dışı) — diğer ekranlar bunları kullanıyor.
export const NON_BILL_KEYS = ['Market', 'Food', 'Other'];
export const BILL_KEYS = ['Water', 'Electricity', 'Rent', 'Gas', 'Internet', 'Other'];

// Kategori ID -> Anahtar (backend'ten gelebilecek numerik kategori alanı için)
const CATEGORY_ID_TO_KEY = {
  0: 'Rent',
  1: 'Internet',
  2: 'Electricity',
  3: 'Water',
  4: 'Gas',
  5: 'Food',
  6: 'Market',
  99: 'Other',
};

// UI görünen isim
export const getCategoryDisplayName = (category) => {
  const map = {
    Water: 'Su',
    Electricity: 'Elektrik',
    Rent: 'Kira',
    Gas: 'Doğalgaz',
    Other: 'Diğer',
    Internet: 'İnternet',
    Market: 'Market',
    Food: 'Yemek',
    0: 'Kira', 1: 'İnternet', 2: 'Elektrik', 3: 'Su', 4: 'Doğalgaz', 5: 'Yemek', 6: 'Market', 99: 'Diğer',
  };
  // number ya da "2" gibi string-numeric değerler için de güvenli erişim
  const numKey = Number(category);
  if (!Number.isNaN(numKey) && map[numKey] != null) return map[numKey];
  return map[category] ?? String(category);
};

// Backend’in beklediği numerik enum’a çeviri
export const toExpenseCategory = (nameOrId) => {
  const byName = {
    Elektrik: 2, Su: 3, 'Doğalgaz': 4, Dogalgaz: 4,
    İnternet: 1, Internet: 1, Kira: 0,
    Market: 6, Yemek: 5, Diğer: 99, Diger: 99,
    Electricity: 2, Water: 3, Gas: 4, Rent: 0, Other: 99, Food: 5,
  };
  const byId = { 0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 99:99 };
  if (typeof nameOrId === 'number') return byId[nameOrId] ?? 99;
  // "6" gibi string numeric gelirse:
  const asNum = Number(nameOrId);
  if (!Number.isNaN(asNum) && byId[asNum] != null) return byId[asNum];
  return byName[nameOrId] ?? 99;
};

export const getCategoryIcon = (category) => {
  const iconMap = {
    Water: '💧', Electricity: '⚡', Rent: '🏠', Gas: '🔥',
    Other: '📄', Internet: '🌐', Market: '🛒', Food: '🍽️',
  };
  // numerik kategori id ile gelirse önce anahtara çevir
  if (typeof category === 'number') category = CATEGORY_ID_TO_KEY[category] ?? category;
  return iconMap[category] || '💰';
};

export const getCategoryColor = (category) => {
  const colorMap = {
    Water: '#3b82f6', Electricity: '#f59e0b', Rent: '#10b981', Gas: '#ef4444',
    Other: '#6b7280', Internet: '#8b5cf6', Market: '#f97316', Food: '#ec4899',
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
  return (key === 'Market' || key === 'Food') ? [SplitPolicy.Esit, SplitPolicy.KisiBazli] : [SplitPolicy.Esit];
};

// Para formatlaması - Türk Lirası standardı
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount || 0));
};

export const formatDate = (dateString) => {
  if (!dateString) return 'Tarih yok';
  try { return new Date(dateString).toLocaleDateString('tr-TR'); }
  catch { return 'Geçersiz tarih'; }
};

// ---- Liste/normalize yardımcıları ----
const textToKey = (text = '') => {
  const t = String(text).toLowerCase();
  if (/(su|water)/.test(t)) return 'Water';
  if (/(elektrik|electricity)/.test(t)) return 'Electricity';
  if (/(kira|rent)/.test(t)) return 'Rent';
  if (/(doğalgaz|dogalgaz|gaz|gas)/.test(t)) return 'Gas';
  if (/internet/.test(t)) return 'Internet';
  if (/(market|alışveriş|alisveris|bakkal|migros|a101|bim)/.test(t)) return 'Market';
  if (/(yemek|food|pizza|burger|kahve|restoran|cafe)/.test(t)) return 'Food';
  return 'Other';
};

export const normalizeExpense = (raw = {}) => {
  const date = raw.kayitTarihi || raw.postDate || raw.date || raw.createdAt || raw.CreatedDate || null;

  // Kategori anahtarı
  let key;
  if (raw.category != null) key = CATEGORY_ID_TO_KEY[Number(raw.category)];
  if (!key) key = textToKey(`${raw.tur ?? ''} ${raw.description ?? raw.Description ?? raw.note ?? ''}`);

  const kind = isBillCategory(key) ? 'bill' : 'other';

  return {
    id: raw.id ?? raw.expenseId ?? raw.ExpenseId,
    title: raw.description ?? raw.Description ?? raw.tur ?? `${getCategoryDisplayName(key)} harcaması`,
    amount: Number(raw.tutar ?? raw.amount ?? raw.Amount ?? 0),
    date,
    payerName: raw.odeyenKullaniciAdi ?? raw.OdeyenKullaniciAdi,
    recorderName: raw.kaydedenKullaniciAdi ?? raw.KaydedenKullaniciAdi,
    key,   // category key
    kind,  // 'bill' | 'other'
    _raw: raw,
  };
};

export const ymOf = (dateString) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const nowYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default {
  ExpenseCategory, SplitPolicy, PaymentMethod, PaymentStatus, PaylasimTuru,
  NON_BILL_KEYS, BILL_KEYS,
  toExpenseCategory, getCategoryDisplayName, getCategoryIcon, getCategoryColor,
  isBillCategory, isFixedExpense, isVariableExpense, getSplitPolicyOptions,
  formatAmount, formatDate, normalizeExpense, ymOf, nowYm,
};
