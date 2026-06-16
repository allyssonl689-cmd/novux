import React, { useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FinanceContext, FinanceContextType } from './finance-context';
import { Transaction, Category } from '@/lib/types';
import { generateInsights } from '@/lib/insights';
import { transactionService } from '@/services/transactionService';
import { categoryService } from '@/services/categoryService';
import { useAuth } from './AuthContext';

// Tamanho de página ao carregar o histórico completo (máx. aceito pelo backend).
const PAGE_SIZE = 1000;

/**
 * Carrega TODAS as transações do usuário paginando a API até o fim.
 * Antes o app pedia apenas 500 (`limit: 500`) e calculava saldos/relatórios em
 * cima desse recorte — com >500 lançamentos os números ficavam ERRADOS (#4).
 */
async function fetchAllTransactions(): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = 1;
  for (;;) {
    const { data, total } = await transactionService.list({ page, limit: PAGE_SIZE });
    all.push(...data);
    if (data.length === 0 || all.length >= total) break;
    page++;
  }
  return all;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, tokenReady } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.userId;

  // Aguarda tokenReady para garantir que o access token está em memória (evita 401
  // por race entre hydration da sessão e fetch). Chaves por usuário isolam o cache
  // entre contas — no logout a query fica desabilitada e não vaza dados.
  const enabled = isAuthenticated && tokenReady && !!userId;
  const txKey  = useMemo(() => ['transactions', userId] as const, [userId]);
  const catKey = useMemo(() => ['categories', userId] as const, [userId]);

  const txQuery = useQuery({
    queryKey: txKey,
    queryFn: fetchAllTransactions,
    enabled,
    staleTime: 60_000,
  });

  const catQuery = useQuery({
    queryKey: catKey,
    queryFn: () => categoryService.list(),
    enabled,
    staleTime: 5 * 60_000,
  });

  const transactions = txQuery.data ?? [];
  const categories   = catQuery.data ?? [];
  const isLoading    = enabled && (txQuery.isLoading || catQuery.isLoading);
  // Não deixa o usuário ver "R$ 0,00" sem explicação — comum no cold start (~30s) do Render
  const loadError = (txQuery.isError || catQuery.isError)
    ? 'Não foi possível carregar seus dados. O servidor pode estar iniciando — isso pode levar alguns segundos no primeiro acesso.'
    : null;

  const [isPremiumPreview, setIsPremiumPreview] = React.useState(false);

  const reloadData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: txKey }),
      queryClient.invalidateQueries({ queryKey: catKey }),
    ]);
  }, [queryClient, txKey, catKey]);

  // Agregados server-side (Dashboard/Relatórios e recentes) derivam das transações;
  // após qualquer mutação eles precisam ser revalidados para refletir a mudança.
  const invalidateDerived = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['transactions', 'recent'] });
    queryClient.invalidateQueries({ queryKey: ['transactions', 'page'] });
  }, [queryClient]);

  // Helpers que atualizam o cache do TanStack Query — mantêm todas as telas
  // (Dashboard, Relatórios, Lançamentos) sincronizadas a partir de uma fonte única.
  const setTxCache = useCallback(
    (updater: (prev: Transaction[]) => Transaction[]) => {
      queryClient.setQueryData<Transaction[]>(txKey, prev => updater(prev ?? []));
      invalidateDerived();
    },
    [queryClient, txKey, invalidateDerived],
  );

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    const created = await transactionService.create(transaction);
    setTxCache(prev => [created, ...prev]);
  }, [setTxCache]);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    const { id, ...rest } = transaction;
    const updated = await transactionService.update(id, rest);
    setTxCache(prev => prev.map(t => t.id === id ? updated : t));
  }, [setTxCache]);

  // Update parcial: envia só os campos informados (evita revalidar a transação
  // inteira no backend, que rejeita ex.: notes=null por ser opcional não-nullable).
  const updateTransactionFields = useCallback(async (id: string, fields: Partial<Transaction>) => {
    const updated = await transactionService.update(id, fields);
    setTxCache(prev => prev.map(t => t.id === id ? updated : t));
  }, [setTxCache]);

  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    setTxCache(prev => prev.filter(t => t.id !== id));
  }, [setTxCache]);

  const addTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
    // Uma única requisição em lote (atômica) em vez de N POSTs.
    const created = await transactionService.createMany(newTransactions);
    setTxCache(prev => [...created, ...prev]);
  }, [setTxCache]);

  const toggleTransactionPaid = useCallback(async (id: string, paid: boolean) => {
    const updated = await transactionService.togglePaid(id, paid);
    setTxCache(prev => prev.map(t => t.id === id ? updated : t));
  }, [setTxCache]);

  const addCategory = useCallback(async (name: string) => {
    const created = await categoryService.create(name);
    queryClient.setQueryData<Category[]>(catKey, prev => [...(prev ?? []), created]);
  }, [queryClient, catKey]);

  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  const value = useMemo<FinanceContextType>(() => ({
    transactions,
    categories,
    insights,
    isPremiumPreview,
    isLoading,
    loadError,
    reloadData,
    setPremiumPreview: setIsPremiumPreview,
    addTransaction,
    updateTransaction,
    updateTransactionFields,
    deleteTransaction,
    addCategory,
    addTransactions,
    toggleTransactionPaid,
  }), [transactions, categories, insights, isPremiumPreview, isLoading, loadError, reloadData, addTransaction, updateTransaction, updateTransactionFields, deleteTransaction, addCategory, addTransactions, toggleTransactionPaid]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
}
