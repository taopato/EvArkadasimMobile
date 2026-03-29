// src/constants/ExpenseUI.js
// UI seçenekleri (opsiyonel), tek yerde toplandı.
// NOT: Backend’e gönderimde numerik eşleme için ExpenseEnums.toExpenseCategory kullanın.

import { ExpenseCategory } from './ExpenseEnums';

export const expenseCategoryOptions = [
  { label: 'Market',   value: ExpenseCategory.Market,      icon: '🛒', color: '#4CAF50' },
  { label: 'Yemek',    value: ExpenseCategory.Food,        icon: '🍽️', color: '#FF9800' },
  { label: 'Elektrik', value: ExpenseCategory.Electricity, icon: '⚡',  color: '#FFC107' },
  { label: 'Su',       value: ExpenseCategory.Water,       icon: '💧', color: '#2196F3' },
  { label: 'İnternet', value: ExpenseCategory.Internet,    icon: '🌐', color: '#9C27B0' },
  { label: 'Kira',     value: ExpenseCategory.Rent,        icon: '🏠', color: '#795548' },
  { label: 'Doğalgaz', value: ExpenseCategory.Gas,         icon: '🔥', color: '#FF5722' },
  { label: 'Diğer',    value: ExpenseCategory.Other,       icon: '📦', color: '#607D8B' },
];

export const getCategoryLabel = (value) => {
  const o = expenseCategoryOptions.find((x) => x.value === value);
  return o?.label || value || 'Diğer';
};

export const getCategoryColorUI = (value) => {
  const o = expenseCategoryOptions.find((x) => x.value === value);
  return o?.color || '#607D8B';
};

export const getCategoryIconUI = (value) => {
  const o = expenseCategoryOptions.find((x) => x.value === value);
  return o?.icon || '📦';
};
