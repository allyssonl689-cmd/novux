import React, { createContext, useContext, useState } from 'react';

export type PeriodPreset = '7d' | '30d' | '3m' | '6m' | '12m' | 'ytd' | 'custom';

export interface DateRange { start: Date; end: Date; }

interface PeriodContextType {
  period: PeriodPreset;
  customRange: DateRange | null;
  setPeriod: (p: PeriodPreset) => void;
  setCustomRange: (r: DateRange) => void;
  getRange: () => DateRange;
  label: string;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  '7d':     'Últimos 7 dias',
  '30d':    'Últimos 30 dias',
  '3m':     'Últimos 3 meses',
  '6m':     'Últimos 6 meses',
  '12m':    'Últimos 12 meses',
  'ytd':    'Este ano (2026)',
  'custom': 'Personalizado',
};

const PeriodContext = createContext<PeriodContextType | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod]           = useState<PeriodPreset>('30d');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  function getRange(): DateRange {
    const end   = new Date();
    const start = new Date();
    switch (period) {
      case '7d':  start.setDate(start.getDate() - 7);           break;
      case '30d': start.setDate(start.getDate() - 30);          break;
      case '3m':  start.setMonth(start.getMonth() - 3);         break;
      case '6m':  start.setMonth(start.getMonth() - 6);         break;
      case '12m': start.setFullYear(start.getFullYear() - 1);   break;
      // 'ytd' = ano completo (Jan 1 a Dez 31) — mais intuitivo que apenas "até hoje"
      case 'ytd':
        start.setMonth(0); start.setDate(1);
        end.setMonth(11); end.setDate(31);
        break;
      case 'custom': return customRange || { start, end };
    }
    return { start, end };
  }

  return (
    <PeriodContext.Provider value={{
      period, customRange, setPeriod, setCustomRange, getRange,
      label: PERIOD_LABELS[period],
    }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used within PeriodProvider');
  return ctx;
}
