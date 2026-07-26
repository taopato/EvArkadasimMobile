// src/context/AuthContext.js
import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventBus from '../shared/events/bus';
import { isTokenExpired, normalizeAuthUser } from '../shared/auth/session';

const AuthContext = createContext();
const favoriteHouseStorageKey = (userId) => `roomora:favorite-house:${userId}`;

const restoreFavoriteHouse = async (nextUser) => {
  if (!nextUser?.id) return nextUser;

  const storedFavorite = await AsyncStorage.getItem(favoriteHouseStorageKey(nextUser.id));
  if (!storedFavorite) return nextUser;

  try {
    const favorite = JSON.parse(storedFavorite);
    const houseId = Number(favorite?.id);
    if (!houseId) return nextUser;
    return {
      ...nextUser,
      defaultHouseId: houseId,
      ...(favorite?.name ? { defaultHouseName: favorite.name } : {}),
    };
  } catch {
    await AsyncStorage.removeItem(favoriteHouseStorageKey(nextUser.id));
    return nextUser;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  const tokenRef = useRef(null);

  const applySession = useCallback((nextUser, nextToken) => {
    userRef.current = nextUser;
    tokenRef.current = nextToken;
    setUser(nextUser);
    setToken(nextToken);
  }, []);

  // Uygulama başladığında token'ı kontrol et
  // API 401 dönerse (token gecersiz/suresi dolmus) oturumu otomatik temizle
  useEffect(() => {
    const onUnauthorized = () => {
      applySession(null, null);
    };
    eventBus.on('auth:unauthorized', onUnauthorized);
    return () => eventBus.off('auth:unauthorized', onUnauthorized);
  }, [applySession]);

  const checkToken = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        if (isTokenExpired(storedToken)) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          applySession(null, null);
          return;
        }

        try {
          const normalizedUser = normalizeAuthUser(JSON.parse(storedUser), storedToken);
          const userData = await restoreFavoriteHouse(normalizedUser);
          if (!userData?.id) {
            await AsyncStorage.multiRemove(['authToken', 'user']);
            applySession(null, null);
            return;
          }
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          applySession(userData, storedToken);
        } catch (parseError) {
          console.error('Kullanıcı verisi parse hatası:', parseError);
          // Geçersiz veri varsa temizle
          await AsyncStorage.multiRemove(['authToken', 'user']);
          applySession(null, null);
        }
      } else if (!storedToken && storedUser) {
        await AsyncStorage.removeItem('user');
      } else if (storedToken && !storedUser) {
        await AsyncStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Token kontrolü hatası:', error);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  const login = useCallback(async (userData, authToken) => {
    try {
      if (!authToken || isTokenExpired(authToken)) {
        throw new Error('Geçersiz veya süresi dolmuş oturum belirteci.');
      }

      const normalizedUser = await restoreFavoriteHouse(normalizeAuthUser(userData, authToken));
      if (!normalizedUser?.id) {
        throw new Error('Oturum yanıtında kullanıcı kimliği bulunamadı.');
      }

      await AsyncStorage.setItem('authToken', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));

      applySession(normalizedUser, authToken);
    } catch (error) {
      console.error('Login hatası:', error);
      throw error;
    }
  }, [applySession]);

  const updateUser = useCallback(async (updater) => {
    try {
      const currentUser = userRef.current;
      const candidate = typeof updater === 'function' ? updater(currentUser) : updater;
      const nextUser = normalizeAuthUser(candidate, tokenRef.current);
      if (!nextUser?.id) {
        throw new Error('Kullanıcı kimliği korunamadı.');
      }
      await AsyncStorage.setItem('user', JSON.stringify(nextUser));
      userRef.current = nextUser;
      setUser(nextUser);
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      throw error;
    }
  }, []);

  const setDefaultHouseId = useCallback(async (houseId, houseName) => {
    const hid = Number(houseId);
    if (!hid) return;
    const currentUser = userRef.current;
    if (!currentUser?.id) return;

    await AsyncStorage.setItem(
      favoriteHouseStorageKey(currentUser.id),
      JSON.stringify({ id: hid, name: houseName || '' })
    );

    await updateUser((prev) => ({
      ...(prev || {}),
      defaultHouseId: hid,
      ...(houseName ? { defaultHouseName: houseName } : {}),
    }));
  }, [updateUser]);

  const logout = useCallback(async () => {
    try {
      // Token ve kullanıcı bilgilerini temizle
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      
      applySession(null, null);
    } catch (error) {
      console.error('Logout hatası:', error);
    }
  }, [applySession]);

  const getToken = useCallback(() => {
    return tokenRef.current;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading,
      login, 
      logout, 
      getToken,
      updateUser,
      setDefaultHouseId,
      refreshAuth: checkToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth, AuthProvider içinde kullanılmalıdır.");
  }
  return context;
};
