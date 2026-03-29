// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = globalThis?.atob
      ? globalThis.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + 15;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Uygulama başladığında token'ı kontrol et
  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        if (isTokenExpired(storedToken)) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          setToken(null);
          setUser(null);
          return;
        }

        try {
          const userData = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(userData);
        } catch (parseError) {
          console.error('Kullanıcı verisi parse hatası:', parseError);
          // Geçersiz veri varsa temizle
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
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
  };

  const login = async (userData, authToken) => {
    try {
      if (!authToken || isTokenExpired(authToken)) {
        throw new Error('Gecersiz veya suresi dolmus oturum belirteci.');
      }

      const normalizedUser = {
        ...userData,
        id: Number(userData?.id ?? userData?.userId ?? 0) || 0,
      };

      await AsyncStorage.setItem('authToken', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));

      setToken(authToken);
      setUser(normalizedUser);
    } catch (error) {
      console.error('Login hatası:', error);
      throw error;
    }
  };

  const updateUser = async (updater) => {
    try {
      const nextUser = typeof updater === 'function' ? updater(user) : updater;
      await AsyncStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
    }
  };

  const setDefaultHouseId = async (houseId, houseName) => {
    const hid = Number(houseId);
    if (!hid) return;

    await updateUser((prev) => ({
      ...(prev || {}),
      defaultHouseId: hid,
      ...(houseName ? { defaultHouseName: houseName } : {}),
    }));
  };

  const logout = async () => {
    try {
      // Token ve kullanıcı bilgilerini temizle
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout hatası:', error);
    }
  };

  const getToken = () => {
    return token;
  };

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
