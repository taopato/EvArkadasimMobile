import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'appLanguage';
const SUPPORTED = ['tr'];

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('tr');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (mounted && SUPPORTED.includes(stored)) {
          setLanguageState(stored);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage) => {
    const safe = SUPPORTED.includes(nextLanguage) ? nextLanguage : 'tr';
    setLanguageState(safe);
    await AsyncStorage.setItem(LANGUAGE_KEY, safe);
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    loading,
  }), [language, setLanguage, loading]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return ctx;
};
