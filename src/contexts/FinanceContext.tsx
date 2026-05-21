import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FinanceContext, FinanceContextType } from './finance-context';
import { Transaction, Category } from '@/lib/types';
import { generateInsights } from '@/lib/insights';
import { transactionService } from '@/services/transactionService';
import { categoryService } from '@/services/categoryService';
import { useAuth } from './AuthContext';

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPremiumPreview, setIsPremiumPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setTransactions([]);
      setCategories([]);
      return;
    }

    setIsLoading(true);
    Promise.all([
      transactionService.list({ limit: 500 }),
      categoryService.list(),
    ])
      .then(([txResult, cats]) => {
        setTransactions(txResult.data);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    const created = await transactionService.create(transaction);
    setTransactions(prev => [created, ...prev]);
  }, []);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    const { id, ...rest } = transaction;
    const updated = await transactionService.update(id, rest);
    setTransactions(prev => prev.map(t => t.id === id ? updated : t));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCategory = useCallback(async (name: string) => {
    const created = await categoryService.create(name);
    setCategories(prev => [...prev, created]);
  }, []);

  const addTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
    const created = await Promise.all(newTransactions.map(t => transactionService.create(t)));
    setTransactions(prev => [...created, ...prev]);
  }, []);

  const value = useMemo<FinanceContextType>(() => ({
    transactions,
    categories,
    insights,
    isPremiumPreview,
    isLoading,
    setPremiumPreview: setIsPremiumPreview,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    addTransactions,
  }), [transactions, categories, insights, isPremiumPreview, isLoading, addTransaction, updateTransaction, deleteTransaction, addCategory, addTransactions]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
}
