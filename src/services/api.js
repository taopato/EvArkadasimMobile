// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL as ENV_BASE } from '../shared/config/env';
import eventBus from '../shared/events/bus';

/**
 * ENV_BASE örn: https://localhost:7118
 * BASE_URL = `${ENV_BASE}/api`
 */
const BASE_URL = `${ENV_BASE}/api`;

// ---------- Axios instance ----------
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  
  headers: { 'Content-Type': 'application/json' },
});

// Token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (err) {
    console.error('Token alınırken hata:', err);
    return null;
  }
};

// Interceptors
api.interceptors.request.use(
  async (config) => {
    const urlPath = typeof config.url === 'string' ? config.url : '';
    // Hem "/Auth/" hem "Auth/" gibi varyasyonlar için güvenli kontrol
    const isAuthRequest = urlPath.startsWith('/Auth/') || urlPath.startsWith('Auth/');
    const token = await getAuthToken();
    config.headers = config.headers || {};

    if (token && !isAuthRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (isAuthRequest && config.headers?.Authorization) {
      delete config.headers.Authorization;
    } else if (!token && !isAuthRequest) {
      try {
        console.error('Auth token bulunamadi, istek tokensiz gidiyor:', {
          url: config.url,
          method: config.method,
        });
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => {
    return res;
  },
  (error) => {
    // Ayrıntılı log (native'de CORS yok; bağlantı sorunlarını görmek için)
    try {
      console.error('🔍 API Error', {
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
        method: error?.config?.method,
        timeout: error?.config?.timeout,
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
      });
    } catch {}

    if (error?.response?.status === 401) {
      const urlPath = typeof error?.config?.url === 'string' ? error.config.url : '';
      const isAuthRequest = urlPath.startsWith('/Auth/') || urlPath.startsWith('Auth/');
      if (!isAuthRequest) {
        AsyncStorage.multiRemove(['authToken', 'user'])
          .catch(() => {})
          .finally(() => eventBus.emit('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// ---------------- AUTH ----------------
export const authApi = {
  login: async (payload) => {
    try {
      const res = await api.post('/Auth/Login', payload);
      const raw = res?.data || {};
      const data = raw?.data ?? raw ?? {};

      const pickFirst = (obj, keys) => keys.map(k => obj?.[k]).find(v => v != null);
      const tokenFromBody = pickFirst(data, ['token', 'accessToken', 'jwt', 'jwtToken']) || pickFirst(raw, ['token', 'accessToken', 'jwt', 'jwtToken']);
      const authHeader = res?.headers?.authorization || res?.headers?.Authorization;
      const tokenFromHeader = typeof authHeader === 'string' ? authHeader.replace(/^[Bb]earer\s+/,'') : undefined;
      const token = tokenFromBody || tokenFromHeader;
      const nestedUser = pickFirst(data, ['user', 'userDto', 'account', 'profile']) || pickFirst(raw, ['user', 'userDto', 'account', 'profile']);
      const user = nestedUser || (token ? {
        id: data?.id ?? raw?.id ?? 0,
        email: data?.email ?? raw?.email,
        fullName: data?.fullName ?? raw?.fullName,
        phoneNumber: data?.phoneNumber ?? raw?.phoneNumber,
        iban: data?.iban ?? raw?.iban,
        profileImageUrl: data?.profileImageUrl ?? raw?.profileImageUrl,
      } : undefined);

      // Normalize edilmiş dönüş: LoginScreen daha kolay karar verebilsin
      return { data: { token, user, raw } };
    } catch (err) {
      // Axios timeout veya XHR kaynaklı sorunlarda fetch ile fallback denemesi
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(`${BASE_URL}/Auth/Login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const raw = await res.json().catch(() => ({}));
        const data = raw?.data ?? raw ?? {};
        const token = data?.token || data?.accessToken || undefined;
        const user = data?.user || data?.userDto || (token ? {
          id: data?.id ?? raw?.id ?? 0,
          email: data?.email ?? raw?.email,
          fullName: data?.fullName ?? raw?.fullName,
          phoneNumber: data?.phoneNumber ?? raw?.phoneNumber,
          iban: data?.iban ?? raw?.iban,
          profileImageUrl: data?.profileImageUrl ?? raw?.profileImageUrl,
        } : undefined);
        return { data: { token, user, raw } };
      } catch (fallbackErr) {
        throw err;
      }
    }
  },
  googleLogin: async (idToken) => {
    const res = await api.post('/Auth/GoogleLogin', { idToken });
    const raw = res?.data || {};
    const data = raw?.data ?? raw ?? {};

    const pickFirst = (obj, keys) => keys.map(k => obj?.[k]).find(v => v != null);
    const tokenFromBody = pickFirst(data, ['token', 'accessToken', 'jwt', 'jwtToken']) || pickFirst(raw, ['token', 'accessToken', 'jwt', 'jwtToken']);
    const authHeader = res?.headers?.authorization || res?.headers?.Authorization;
    const tokenFromHeader = typeof authHeader === 'string' ? authHeader.replace(/^[Bb]earer\s+/,'') : undefined;
    const token = tokenFromBody || tokenFromHeader;
    const nestedUser = pickFirst(data, ['user', 'userDto', 'account', 'profile']) || pickFirst(raw, ['user', 'userDto', 'account', 'profile']);
    // Backend LoginResponseDto düz alanlar döner (id/email/fullName), iç içe user objesi yok — yoksa buradan kur.
    const user = nestedUser || (token ? {
      id: data?.id ?? raw?.id ?? 0,
      email: data?.email ?? raw?.email,
      fullName: data?.fullName ?? raw?.fullName,
      phoneNumber: data?.phoneNumber ?? raw?.phoneNumber,
      iban: data?.iban ?? raw?.iban,
      profileImageUrl: data?.profileImageUrl ?? raw?.profileImageUrl,
    } : undefined);

    return { data: { token, user, raw } };
  },
  appleLogin: async (identityToken, fullName) => {
    const res = await api.post('/Auth/AppleLogin', { identityToken, fullName });
    const raw = res?.data || {};
    const data = raw?.data ?? raw ?? {};

    const pickFirst = (obj, keys) => keys.map(k => obj?.[k]).find(v => v != null);
    const token = pickFirst(data, ['token', 'accessToken', 'jwt', 'jwtToken']) || pickFirst(raw, ['token', 'accessToken', 'jwt', 'jwtToken']);
    const user = token ? {
      id: data?.id ?? raw?.id ?? 0,
      email: data?.email ?? raw?.email,
      fullName: data?.fullName ?? raw?.fullName,
      phoneNumber: data?.phoneNumber ?? raw?.phoneNumber,
      iban: data?.iban ?? raw?.iban,
      profileImageUrl: data?.profileImageUrl ?? raw?.profileImageUrl,
    } : undefined;

    return { data: { token, user, raw } };
  },
  sendVerificationCode: (email, purpose = 'register') => api.post('/Auth/SendVerificationCode', { email, purpose }),
  verifyCodeAndRegister: (email, code, fullName, password, invitationToken) =>
    api.post('/Auth/VerifyCodeAndRegister', { email, code, fullName, password, invitationToken }).then((res) => {
      const raw = res?.data || {};
      const data = raw?.data ?? raw ?? {};
      const token = data?.token || data?.accessToken || raw?.token;
      const user = token
        ? {
            ...(data?.user || raw?.user || {}),
            id: data?.user?.id ?? raw?.user?.id ?? data?.id ?? raw?.id ?? 0,
            email: data?.user?.email ?? raw?.user?.email ?? data?.email ?? raw?.email ?? email,
            fullName: data?.user?.fullName ?? raw?.user?.fullName ?? data?.fullName ?? raw?.fullName ?? fullName,
          }
        : undefined;
      return { data: { token, user, raw } };
    }),
  verifyCodeForReset: (email, code) => api.post('/Auth/VerifyCodeForReset', { email, code }),
  resetPassword: (email, code, newPassword) =>
    api.post('/Auth/ResetPassword', { email, code, newPassword }),
  updateProfile: (userId, data) => api.put(`/Users/${userId}/Profile`, data),
  uploadProfileImage: (userId, image) => {
    const formData = new FormData();
    formData.append('image', image);
    return api.post(`/Users/${userId}/ProfileImage`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  deleteAccount: (userId) => api.delete(`/Users/${userId}/Account`),
};

// ---------------- HOUSES ----------------
export const houseApi = {
  getAll: () => api.get('/Houses'),
  create: (name, creatorUserId) => api.post('/Houses', { name, creatorUserId }),
  getById: (id) => api.get(`/Houses/${id}`),
  addMember: (houseId, userId) => api.post(`/Houses/${houseId}/members`, { houseId, userId }),
  removeMember: (houseId, userId) => api.delete(`/Houses/${houseId}/members/${userId}`),
  sendInvitation: (houseId, email) => api.post(`/Houses/${houseId}/invitations`, { email }),
  acceptInvitation: (userIdOrInvitationCode, invitationCode) => {
    if (invitationCode == null) {
      return api.post('/Houses/AcceptInvitation', { invitationCode: userIdOrInvitationCode });
    }
    return api.post('/Houses/AcceptInvitation', { userId: userIdOrInvitationCode, invitationCode });
  },
  getMembers: (houseId) => api.get(`/Houses/${houseId}/members`),
  uploadCoverImage: (houseId, image) => {
    const formData = new FormData();
    formData.append('image', image);
    return api.post(`/Houses/${houseId}/CoverImage`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  // Debts
  getUserDebts: (userId, houseId) => api.get(`/Houses/GetUserDebts/${userId}/${houseId}`),
  getHouseDebts: (houseId) => api.get(`/Houses/GetUserDebts/${houseId}`),
  getUserDebtBetween: (houseId, userAId, userBId) =>
    api.get(`/Houses/GetUserDebtBetween/${houseId}?userAId=${userAId}&userBId=${userBId}`),

  getUserHouses: (userId) => api.get(`/Houses/GetUserHouses/${userId}`),
  createHouse: (houseData) => api.post('/Houses', houseData),
};

// ---------------- LEDGER ----------------
export const ledgerApi = {
  byExpense: (expenseId) => api.get(`/LedgerLines/ByExpense/${expenseId}`),
  byHouse: (houseId) => api.get(`/LedgerLines/ByHouse/${houseId}`),
};

// ---------------- PAYMENTS ----------------
export const paymentsApi = {
  /**
   * CreatePayment (multipart/form-data)
   * payload:
   *  {
   *    houseId, borcluUserId, alacakliUserId,
   *    tutar, paymentMethod|method, note, odemeTarihi?, chargeId?, dekontFile?
   *  }
   */
  create: async (payload) => {
    const fd = new FormData();
    fd.append('HouseId', Number(payload.houseId));
    fd.append('BorcluUserId', Number(payload.borcluUserId));
    fd.append('AlacakliUserId', Number(payload.alacakliUserId));
    fd.append('Tutar', Number(payload.tutar));
    fd.append('PaymentMethod', String(payload.paymentMethod || payload.method || 'Cash'));
    fd.append('OdemeTarihi', payload.odemeTarihi || new Date().toISOString());
    fd.append('Aciklama', payload.note || '');
    if (payload.chargeId != null) fd.append('ChargeId', Number(payload.chargeId));
    if (payload.dekontFile) fd.append('Dekont', payload.dekontFile); // File/Blob

    return api.post('/Payments/CreatePayment', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Listeleme / bekleyenler / onay-red uçları
  getByHouse: (houseId) => api.get(`/Payments/GetPayments/${houseId}`),

  // iki isim de mevcut olsun (eski çağrılar kırılmasın)
  getPendingForUser: (userId) => api.get(`/Payments/GetPendingPayments/${userId}`),
  getPendingPayments: (userId) => api.get(`/Payments/GetPendingPayments/${userId}`),

  approve: (paymentId) => api.post(`/Payments/ApprovePayment/${paymentId}`),
  approvePayment: (paymentId) => api.post(`/Payments/ApprovePayment/${paymentId}`),

  reject: (paymentId) => api.post(`/Payments/RejectPayment/${paymentId}`),
  rejectPayment: (paymentId) => api.post(`/Payments/RejectPayment/${paymentId}`),
};

// ---------------- EXPENSES ----------------
export const expensesApi = {
  // Harcama ekleme - dokümantasyona göre
  create: (body) => api.post('/Expenses', body), // Ana endpoint (mode destekli)
  createIrregular: (body) => api.post('/Expenses/CreateIrregular', body), // Kısa yol
  addExpense: (body) => api.post('/Expenses/AddExpense', body), // Alias
  
  // Harcama listeleme - dokümantasyona göre
  getExpenses: (houseId, month) => {
    const params = month ? { month } : {};
    return api.get(`/Expenses/GetExpenses/${Number(houseId)}`, { params });
  },
  getByHouse: (houseId, params) => api.get(`/Expenses/GetExpenses/${houseId}`, { params }),
  getById: (expenseId) => api.get(`/Expenses/GetExpense/${expenseId}`),
  
  // Harcama güncelleme/silme - dokümantasyona göre
  update: (expenseId, dto) => api.put(`/Expenses/UpdateExpense/${expenseId}`, dto),
  remove: (expenseId) => api.delete(`/Expenses/DeleteExpense/${expenseId}`),
};

// ---------------- SCHEDULED CHARGES ----------------
// Kira/aidat gibi dönemsel tahsilatlar normal borç defterinden ayrı tutulur.
export const scheduledChargesApi = {
  create: (body) => api.post('/RecurringCharges', body),
  getByHouse: (houseId) => api.get(`/RecurringCharges/house/${Number(houseId)}`),
  getMyDue: (houseId) => api.get(`/RecurringCharges/house/${Number(houseId)}/my-due`),
  setSharePaid: (cycleId, userId, isPaid) =>
    api.put(`/RecurringCharges/cycles/${Number(cycleId)}/shares/${Number(userId)}`, { isPaid: Boolean(isPaid) }),
  setExternalPaid: (cycleId, isPaid) =>
    api.put(`/RecurringCharges/cycles/${Number(cycleId)}/external-payment`, { isPaid: Boolean(isPaid) }),
  remove: (planId) => api.delete(`/RecurringCharges/${Number(planId)}`),
};

// ---------------- RECEIPTS ----------------
export const receiptsApi = {
  scan: async ({ houseId, image }) => {
    const fd = new FormData();
    fd.append('HouseId', Number(houseId));
    fd.append('Image', image);

    return api.post('/Receipts/Scan', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  getByHouse: (houseId) => api.get(`/Receipts/ByHouse/${houseId}`),
  getById: (receiptId) => api.get(`/Receipts/${receiptId}`),
  reparse: (receiptId) => api.post(`/Receipts/${receiptId}/Reparse`),
  update: (receiptId, payload) => api.put(`/Receipts/${receiptId}`, payload),
  convertToExpense: (receiptId, payload) => api.post(`/Receipts/${receiptId}/ConvertToExpense`, payload),
  remove: (receiptId) => api.delete(`/Receipts/${receiptId}`),
};

export const houseNotesApi = {
  getBoard: (houseId) => api.get(`/HouseNotes/${houseId}`),
  createSection: (houseId, title) => api.post(`/HouseNotes/${houseId}/sections`, { title }),
  createItem: (sectionId, content) => api.post(`/HouseNotes/sections/${sectionId}/items`, { content }),
  completeItem: (itemId) => api.post(`/HouseNotes/items/${itemId}/complete`),
  deleteItem: (itemId) => api.delete(`/HouseNotes/items/${itemId}`),
  deleteSection: (sectionId) => api.delete(`/HouseNotes/sections/${sectionId}`),
};


// -------- GetUserDebts (Expenses Controller) için güvenli helper --------
export const getUserDebtsSafe = async (userId, houseId) => {
  const uid = Number(userId);
  const hid = Number(houseId);
  try {
    return await api.get(`/Expenses/GetUserDebts/${uid}/${hid}`);
  } catch (e1) {
    if (e1?.response?.status !== 404) throw e1;
    return await api.get('/Expenses/GetUserDebts', { params: { userId: uid, houseId: hid } });
  }
};

// ---------------- CHARGES (Planlı Giderler) - Kaldırıldı, sadece Expenses API kullanılacak ----------------
// chargesApi kaldırıldı - sadece expensesApi kullanılacak

export default api;
