import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { expensesApi, houseApi, paymentsApi, scheduledChargesApi } from '../services/api';
import { normalizeExpense } from '../utils/expenseClassifier';
import { deduplicateMonthlyPlans, getItemDate, sortByDateDesc } from '../utils/expenseHelpers';

const arrayFrom = (response) => {
  const body = response?.data?.data ?? response?.data?.items ?? response?.data;
  return Array.isArray(body) ? body : [];
};

export default function useRoomoraDashboard(user) {
  const houseId = Number(user?.defaultHouseId || 0) || null;
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    errors: {},
    expenses: [],
    scheduled: [],
    pendingPayments: [],
    payable: 0,
    receivable: 0,
  });

  const load = useCallback(async (refreshing = false) => {
    if (!houseId || !user?.id) {
      setState((prev) => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: '',
        errors: {},
        expenses: [],
        scheduled: [],
        pendingPayments: [],
        payable: 0,
        receivable: 0,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: !refreshing && prev.expenses.length === 0,
      refreshing,
      error: '',
      errors: {},
    }));
    const results = await Promise.allSettled([
      expensesApi.getByHouse(houseId),
      houseApi.getUserDebts(Number(user.id), houseId),
      paymentsApi.getPendingPayments(Number(user.id)),
      scheduledChargesApi.getByHouse(houseId),
    ]);

    const expenseResponse = results[0].status === 'fulfilled' ? results[0].value : null;
    const debtResponse = results[1].status === 'fulfilled' ? results[1].value : null;
    const pendingResponse = results[2].status === 'fulfilled' ? results[2].value : null;
    const scheduledResponse = results[3].status === 'fulfilled' ? results[3].value : null;
    const errors = {
      expenses: results[0].status === 'rejected' ? 'Giderler şu anda alınamıyor.' : '',
      debt: results[1].status === 'rejected' ? 'Borç ve alacak bilgileri şu anda alınamıyor.' : '',
      pendingPayments: results[2].status === 'rejected' ? 'Bekleyen ödemeler şu anda alınamıyor.' : '',
      scheduled: results[3].status === 'rejected' ? 'Planlı ödemeler şu anda alınamıyor.' : '',
    };

    const expenses = sortByDateDesc(
      deduplicateMonthlyPlans(arrayFrom(expenseResponse).map(normalizeExpense))
    );
    const debtBody = debtResponse?.data?.data ?? debtResponse?.data ?? {};
    const totals = Array.isArray(debtBody?.totals) ? debtBody.totals : [];
    const mine = totals.find((item) => Number(item.userId) === Number(user.id)) || debtBody;

    setState({
      loading: false,
      refreshing: false,
      error: Object.values(errors).find(Boolean) || '',
      errors,
      expenses,
      scheduled: arrayFrom(scheduledResponse),
      pendingPayments: arrayFrom(pendingResponse),
      payable: Number(mine?.payable ?? mine?.borc ?? mine?.totalDebt ?? 0),
      receivable: Number(mine?.receivable ?? mine?.alacak ?? mine?.totalReceivable ?? 0),
    });
  }, [houseId, user?.id]);

  useFocusEffect(useCallback(() => {
    load(false);
  }, [load]));

  const monthExpenses = useMemo(() => {
    const now = new Date();
    return state.expenses.filter((item) => {
      const date = getItemDate(item);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
  }, [state.expenses]);

  return {
    ...state,
    houseId,
    houseName: user?.defaultHouseName || 'Aktif Ev',
    balance: state.receivable - state.payable,
    monthExpenses,
    refresh: () => load(true),
    retry: () => load(false),
  };
}
