import { createContext } from 'react';
import { Category, Insight, Transaction } from '@/lib/types';

export interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  insights: Insight[];
  isPremiumPreview: boolean;
  isLoading: boolean;
  loadError: string | null;
  reloadData: () => void | Promise<void>;
  setPremiumPreview: (value: boolean) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void | Promise<void>;
  updateTransaction: (transaction: Transaction) => void | Promise<void>;
  /** Atualiza apenas alguns campos (PATCH parcial — não revalida a transação inteira). */
  updateTransactionFields: (id: string, fields: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => void | Promise<void>;
  addCategory: (name: string) => void | Promise<void>;
  addTransactions: (transactions: Omit<Transaction, 'id'>[]) => void | Promise<void>;
  toggleTransactionPaid: (id: string, paid: boolean) => Promise<void>;
}

export const FinanceContext = createContext<FinanceContextType | null>(null);

FinanceContext.displayName = 'FinanceContext';
