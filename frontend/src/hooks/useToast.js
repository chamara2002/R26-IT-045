import { useCallback } from 'react';
import toast from 'react-hot-toast';

export const useToast = () => {
  const showSuccess = useCallback((message) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: '500',
      },
    });
  }, []);

  const showError = useCallback((message) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: '500',
      },
    });
  }, []);

  const showInfo = useCallback((message) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#3b82f6',
        color: '#fff',
        fontWeight: '500',
      },
      icon: 'ℹ️',
    });
  }, []);

  const showWarning = useCallback((message) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#f59e0b',
        color: '#fff',
        fontWeight: '500',
      },
      icon: '⚠️',
    });
  }, []);

  return { showSuccess, showError, showInfo, showWarning };
};
