import { describe, it, expect } from 'vitest';
import { buildFinancialIndicators } from './financial-indicators';
import type { Transaction } from './types';

/** Data no mês-calendário atual (dia 10, evita problemas de fuso). */
function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`;
}

let seq = 0;
function tx(p: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: String(seq),
    type: 'expense',
    value: 0,
    category: 'Outros',
    date: thisMonth(),
    description: '',
    paid: true,
    tags: [],
    ...p,
  };
}

describe('buildFinancialIndicators', () => {
  it('retorna null quando não há movimentação no mês atual', () => {
    expect(buildFinancialIndicators([])).toBeNull();
    // Lançamento de outro mês/ano não conta para o mês corrente
    expect(buildFinancialIndicators([tx({ type: 'income', value: 100, date: '2000-01-05' })])).toBeNull();
  });

  it('agrega receita/despesa do mês e calcula riskRatio', () => {
    const r = buildFinancialIndicators([
      tx({ type: 'income', value: 1000 }),
      tx({ type: 'expense', value: 500, category: 'Mercado' }),
    ]);
    expect(r).not.toBeNull();
    expect(r!.income).toBe(1000);
    expect(r!.expense).toBe(500);
    expect(r!.riskRatio).toBeCloseTo(0.5, 5);
    expect(r!.riskLevel).toBe('healthy');
  });

  it('classifica risco alto quando despesa quase iguala a receita', () => {
    const r = buildFinancialIndicators([
      tx({ type: 'income', value: 1000 }),
      tx({ type: 'expense', value: 950 }),
    ]);
    expect(r!.riskLevel).toBe('high');
  });

  it('ordena o top3 de categorias por valor', () => {
    const r = buildFinancialIndicators([
      tx({ type: 'income', value: 5000 }),
      tx({ type: 'expense', value: 300, category: 'Mercado' }),
      tx({ type: 'expense', value: 800, category: 'Aluguel' }),
      tx({ type: 'expense', value: 100, category: 'Lazer' }),
    ]);
    expect(r!.top3.map(c => c.name)).toEqual(['Aluguel', 'Mercado', 'Lazer']);
    expect(r!.top3[0].value).toBe(800);
  });
});
