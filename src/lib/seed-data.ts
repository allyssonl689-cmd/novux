import { Transaction } from './types';
import { generateFullMockData } from './mock-data';

// Re-export the generated data as seed transactions
export const SEED_TRANSACTIONS: Omit<Transaction, 'id'>[] = generateFullMockData();
