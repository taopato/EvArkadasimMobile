import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'roomora.accessToken';
const REFRESH_TOKEN_KEY = 'roomora.refreshToken';

const storage = Platform.OS === 'web'
  ? {
      get: (key) => AsyncStorage.getItem(key),
      set: (key, value) => AsyncStorage.setItem(key, value),
      remove: (key) => AsyncStorage.removeItem(key),
    }
  : {
      get: (key) => SecureStore.getItemAsync(key),
      set: (key, value) => SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      }),
      remove: (key) => SecureStore.deleteItemAsync(key),
    };

export const sessionStore = {
  getAccessToken: () => storage.get(ACCESS_TOKEN_KEY),
  getRefreshToken: () => storage.get(REFRESH_TOKEN_KEY),
  async setTokens(accessToken, refreshToken) {
    await storage.set(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await storage.set(REFRESH_TOKEN_KEY, refreshToken);
  },
  async clearTokens() {
    await Promise.all([
      storage.remove(ACCESS_TOKEN_KEY),
      storage.remove(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem('authToken'),
    ]);
  },
};
