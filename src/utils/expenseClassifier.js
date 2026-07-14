import { getCategoryDisplayName } from '../constants/ExpenseEnums';

// Backend Domain.Enums.ExpenseCategory: Rent=0, Internet=1, Electricity=2, Water=3, Market=4, Food=5, Other=99.
// "Gas" has no backend id — it's only ever inferred from free-text (see textToKey below).
export const CATEGORY_ID_TO_KEY = {
  0: 'Rent',
  1: 'Internet',
  2: 'Electricity',
  3: 'Water',
  4: 'Market',
  5: 'Food',
  99: 'Other',
};

export const CATEGORY_KEY_TO_ID = Object.fromEntries(
  Object.entries(CATEGORY_ID_TO_KEY).map(([id, key]) => [key, Number(id)])
);

export const BILL_KEYS = ['Water', 'Electricity', 'Rent', 'Gas', 'Internet'];
export const NON_BILL_KEYS = ['Market', 'Food', 'Other'];

const textToKey = (text = '') => {
  const value = String(text).toLowerCase();

  if (/(su|water)/.test(value)) return 'Water';
  if (/(elektrik|electricity)/.test(value)) return 'Electricity';
  if (/(kira|rent)/.test(value)) return 'Rent';
  if (/(doğalgaz|dogalgaz|gaz|gas)/.test(value)) return 'Gas';
  if (/internet/.test(value)) return 'Internet';
  if (/(market|alışveriş|alisveris|bakkal|migros|a101|bim)/.test(value)) return 'Market';
  if (/(yemek|food|pizza|burger|kahve|restoran|cafe)/.test(value)) return 'Food';

  return 'Other';
};

export const normalizeExpense = (raw) => {
  const parentExpenseId = raw?.parentExpenseId ?? raw?.ParentExpenseId ?? null;
  const dueDay = raw?.dueDay ?? raw?.DueDay ?? null;
  const planStartMonth = raw?.planStartMonth ?? raw?.PlanStartMonth ?? null;
  const installmentIndex = raw?.installmentIndex ?? raw?.InstallmentIndex ?? null;
  const installmentCount = raw?.installmentCount ?? raw?.InstallmentCount ?? null;

  const dateStr =
    raw?.postDate ??
    raw?.PostDate ??
    raw?.dueDate ??
    raw?.DueDate ??
    raw?.kayitTarihi ??
    raw?.KayitTarihi ??
    raw?.createdDate ??
    raw?.CreatedDate;

  let key;
  const categoryIdCandidate =
    raw?.categoryId ??
    raw?.CategoryId ??
    (typeof raw?.category === 'number' ? raw.category : undefined) ??
    (typeof raw?.Category === 'number' ? raw.Category : undefined);

  if (categoryIdCandidate != null) {
    const mapped = CATEGORY_ID_TO_KEY[Number(categoryIdCandidate)];
    if (mapped) key = mapped;
  }

  if (!key) {
    const categoryNameCandidate =
      (typeof raw?.category === 'string' && raw.category) ||
      (typeof raw?.Category === 'string' && raw.Category) ||
      (typeof raw?.utilityType === 'string' && raw.utilityType) ||
      (typeof raw?.UtilityType === 'string' && raw.UtilityType) ||
      undefined;

    if (categoryNameCandidate) {
      const lower = String(categoryNameCandidate).toLowerCase();
      const direct = Object.keys(CATEGORY_KEY_TO_ID).find(
        (candidate) => candidate.toLowerCase() === lower || (lower === 'naturalgas' && candidate === 'Gas')
      );

      if (direct) key = direct;
      else if (lower.includes('kira')) key = 'Rent';
      else if (lower.includes('elektrik') || lower.includes('electric')) key = 'Electricity';
      else if (lower === 'su' || lower.includes('water')) key = 'Water';
      else if (lower.includes('doğalgaz') || lower.includes('dogalgaz') || lower.includes('naturalgas') || lower === 'gaz' || lower.includes(' gas')) key = 'Gas';
      else if (lower.includes('internet') || lower.includes('ınternet')) key = 'Internet';
      else if (lower.includes('diğer') || lower.includes('diger') || lower === 'other') key = 'Other';
    }
  }

  if (!key) {
    const typeText = raw?.type || raw?.Type || '';
    key = textToKey(`${raw?.tur ?? ''} ${raw?.note ?? ''} ${typeText}`);
  }

  const isInstallment = /taksit|installment/i.test(raw?.tur || '');
  const isRecurring = /kira|internet|su|elektrik|doğalgaz|dogalgaz/i.test(raw?.tur || '');
  const kind = BILL_KEYS.includes(key) || isInstallment || isRecurring ? 'bill' : 'other';

  const parseNum = (value) => {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const tryKeys = [
    'tutar',
    'amount',
    'fixedAmount',
    'monthlyAmount',
    'aylikTutar',
    'ortakHarcamaTutari',
    'estimatedAmount',
    'amountPerInstallment',
    'Amount',
    'Tutar',
    'FixedAmount',
    'MonthlyAmount',
    'OrtakHarcamaTutari',
    'amountPerMonth',
  ];

  let amount = 0;
  for (const candidate of tryKeys) {
    if (raw?.[candidate] != null) {
      amount = parseNum(raw[candidate]);
      if (amount > 0) break;
    }
  }

  if (amount === 0 && raw?.totalAmount != null && raw?.installmentCount != null) {
    const totalAmount = parseNum(raw.totalAmount);
    const count = parseNum(raw.installmentCount);
    if (totalAmount > 0 && count > 0) amount = totalAmount / count;
  }

  return {
    id: raw?.id ?? raw?.expenseId,
    title: raw?.tur || `${getCategoryDisplayName(key)} harcaması`,
    amount,
    date: dateStr,
    payerName: raw?.odeyenKullaniciAdi,
    recorderName: raw?.kaydedenKullaniciAdi,
    key,
    kind,
    _raw: {
      ...raw,
      parentExpenseId,
      dueDay,
      planStartMonth,
      installmentIndex,
      installmentCount,
    },
  };
};

export const ymOf = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const nowYm = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
