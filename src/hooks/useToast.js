// src/hooks/useToast.js
import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const show = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const showSuccess = useCallback((message) => show(message, 'success'), [show]);
  const showError = useCallback((message) => show(message, 'error'), [show]);
  const showWarning = useCallback((message) => show(message, 'warning'), [show]);
  const showInfo = useCallback((message) => show(message, 'info'), [show]);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  return { toast, show, showSuccess, showError, showWarning, showInfo, hideToast };
};
