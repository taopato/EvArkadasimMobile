// src/shared/config/env.ts
import { Platform } from 'react-native';
// @ts-ignore - expo-constants runtime import for reading extra
import Constants from 'expo-constants';

/**
 * Geliştirme senaryoları:
 * - iOS Simülatör: localhost
 * - Android Emülatör: 10.0.2.2
 * - Gerçek cihaz (iOS/Android, Expo Go ile): AĞDAKI BİLGİSAYARIN LAN IP'si
 *
 * Not: Production/EAS build için EXPO_PUBLIC_API_URL ile override edebilirsin.
 */

// Expo'nun kendi LAN host tespiti (getExpoLanHost) genelde yeterli; bu sadece
// tespit başarısız olursa kullanılan bir fallback. Farklı bir makinede/ağda
// çalışırken kaynağı değiştirmeye gerek kalmasın diye env değişkeninden okunur.
const HOST_REAL_DEVICE = (process.env.EXPO_PUBLIC_LAN_HOST as string) || '192.168.1.106';

// Emülatör hostları
const HOST_DEV_ANDROID = '10.0.2.2';
const HOST_DEV_IOS = 'localhost';

// Backend portun
const DEV_PORT = 7118;
const DEV_HTTP_PORT = 5118;
const DEFAULT_WEB_PROD_API = 'https://control.builtwhys.space/roomora-api';

// HTTP/HTTPS tercihi (lokal geliştirmede genelde HTTP)
const USE_HTTPS = false;
const DEV_PROTOCOL = USE_HTTPS ? 'https' : 'http';
const DEV_WEB_PROTOCOL = USE_HTTPS ? 'https' : 'http';
const DEV_SELECTED_PORT = USE_HTTPS ? DEV_PORT : DEV_HTTP_PORT;

const getExpoLanHost = (): string | undefined => {
  const candidates = [
    (Constants?.expoConfig as any)?.hostUri,
    (Constants as any)?.manifest?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
  ].filter(Boolean);

  const raw = candidates.find((value) => typeof value === 'string' && value.includes(':'));
  if (!raw) return undefined;
  const host = String(raw).split(':')[0];
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : undefined;
};

// Emülatörlerde farklı host, gerçek cihazda LAN IP kullan
const getDevHost = (): string => {
  const expoLanHost = getExpoLanHost();
  if (Constants.isDevice && expoLanHost) {
    return expoLanHost;
  }
  if (Platform.OS === 'android') {
    return Constants.isDevice ? HOST_REAL_DEVICE : HOST_DEV_ANDROID;
  }
  if (Platform.OS === 'ios') {
    return Constants.isDevice ? HOST_REAL_DEVICE : HOST_DEV_IOS;
  }
  return HOST_DEV_IOS; // Web fallback
};

// Development taban URL (LAN testi)
const DEV_BASE = `${DEV_PROTOCOL}://${getDevHost()}:${DEV_SELECTED_PORT}`;

const getWebRuntimeBase = (): string | undefined => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const { hostname, protocol } = window.location;
  const normalizedHost = String(hostname || '').toLowerCase();

  if (!normalizedHost || normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return `${DEV_WEB_PROTOCOL}://localhost:${USE_HTTPS ? DEV_PORT : DEV_HTTP_PORT}`;
  }

  if (normalizedHost === 'evarkadasim.co' || normalizedHost === 'www.evarkadasim.co') {
    return DEFAULT_WEB_PROD_API;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHost)) {
    return `${protocol}//${normalizedHost}:${USE_HTTPS ? DEV_PORT : DEV_HTTP_PORT}`;
  }

  return `${protocol}//api.${normalizedHost}`;
};

// Production/EAS override imkanları
const EXTRA_API_URL = (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL as string | undefined;
const ENV_API_URL = (process.env.EXPO_PUBLIC_API_URL as string) || undefined;
const WEB_RUNTIME_API_URL = getWebRuntimeBase();

const EXTRA_GOOGLE_WEB_CLIENT_ID = (Constants?.expoConfig?.extra as any)?.GOOGLE_WEB_CLIENT_ID as string | undefined;
const EXTRA_GOOGLE_IOS_CLIENT_ID = (Constants?.expoConfig?.extra as any)?.GOOGLE_IOS_CLIENT_ID as string | undefined;
const EXTRA_GOOGLE_ANDROID_CLIENT_ID = (Constants?.expoConfig?.extra as any)?.GOOGLE_ANDROID_CLIENT_ID as string | undefined;
const EXTRA_GOOGLE_EXPO_CLIENT_ID = (Constants?.expoConfig?.extra as any)?.GOOGLE_EXPO_CLIENT_ID as string | undefined;

const ENV_GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string) || undefined;
const ENV_GOOGLE_IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string) || undefined;
const ENV_GOOGLE_ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string) || undefined;
const ENV_GOOGLE_EXPO_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID as string) || undefined;

/* ------------------------------------------------------------------
   NGROK TEST OVERRIDE
   - Şu değere o anki NGROK HTTPS adresini yapıştır.
   - BOŞ bırakılırsa (""), otomatik olarak EXTRA/ENV/DEV_BASE'e döner.
------------------------------------------------------------------- */
const NGROK_BASE: string = ""; // Ngrok kapalıysa boş bırak → LAN/ENV kullan
const USE_NGROK = !!NGROK_BASE && NGROK_BASE.startsWith('http');

/* Seçilen taban URL:
   - Önce NGROK,
   - sonra EXPO_PUBLIC_API_URL (extra/env),
   - en sonda DEV_BASE (LAN).
*/
const WEB_BASE =
  WEB_RUNTIME_API_URL ||
  ENV_API_URL ||
  EXTRA_API_URL ||
  (__DEV__ ? DEV_BASE : DEFAULT_WEB_PROD_API);

const NATIVE_BASE =
  (USE_NGROK ? NGROK_BASE : (ENV_API_URL || EXTRA_API_URL)) ||
  (__DEV__ ? DEV_BASE : DEFAULT_WEB_PROD_API);

const SELECTED_BASE = Platform.OS === 'web' ? WEB_BASE : NATIVE_BASE;

/* ÖNEMLİ:
   İsteklerin zaten '/api/...' ile gidiyor → burada '/api' EKLEME.
   (Aksi halde '/api/api/...' olur.)
*/
export const BASE_URL: string = SELECTED_BASE;

/* İstersen bazı yerlerde kısa yoldan kullanmak için alternatif de bırakıyorum: */
export const API_BASE_URL: string = `${SELECTED_BASE}/api`;

export const resolveMediaUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SELECTED_BASE}${value.startsWith('/') ? value : `/${value}`}`;
};

export const GOOGLE_CLIENT_IDS = {
  web: EXTRA_GOOGLE_WEB_CLIENT_ID || ENV_GOOGLE_WEB_CLIENT_ID || '',
  ios: EXTRA_GOOGLE_IOS_CLIENT_ID || ENV_GOOGLE_IOS_CLIENT_ID || '',
  android: EXTRA_GOOGLE_ANDROID_CLIENT_ID || ENV_GOOGLE_ANDROID_CLIENT_ID || '',
  expo: EXTRA_GOOGLE_EXPO_CLIENT_ID || ENV_GOOGLE_EXPO_CLIENT_ID || '',
};

// Diğer yardımcı sabitler
export const API_TIMEOUTS = { DEFAULT: 15000, UPLOAD: 30000, DOWNLOAD: 60000 } as const;
export const PAGINATION = { DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100 } as const;
export const MOBILE_CONFIG = { USE_ASYNC_STORAGE: true, PREFER_HTTP: !USE_HTTPS, PLATFORM: Platform.OS } as const;

// Debug için
export const __ENV_DEBUG__ = {
  __DEV__,
  Platform: Platform.OS,
  DEV_PROTOCOL,
  DEV_PORT,
  BASE_URL,
};

export default BASE_URL;
