import { Transaction, Insight } from './types';

export function generateInsights(transactions: Transaction[]): Insight[] {
  const insights: Insight[] = [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalIncome = thisMonth
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.value, 0);
  const totalExpense = thisMonth
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.value, 0);

  if (totalExpense > 0 && totalExpense > totalIncome) {
    const deficit = totalExpense - totalIncome;
    insights.push({
      id: 'deficit',
      level: 'critical',
      label: 'Despesas acima da receita',
      text: `Suas despesas superam a receita em R$ ${deficit.toFixed(2).replace('.', ',')} no período. Revise os gastos variáveis e priorize os custos essenciais para equilibrar seu orçamento.`,
    });
  }

  if (totalExpense > 0) {
    const expenses = thisMonth.filter((transaction) => transaction.type === 'expense');
    const byCategory: Record<string, number> = {};

    expenses.forEach((transaction) => {
      byCategory[transaction.category] = (byCategory[transaction.category] || 0) + transaction.value;
    });

    for (const [category, total] of Object.entries(byCategory)) {
      const percentage = totalExpense > 0 ? (total / totalExpense) * 100 : 0;
      if (!isFinite(percentage) || isNaN(percentage)) continue;

      if (percentage > 30) {
        insights.push({
          id: `concentration-${category}`,
          level: 'warning',
          label: `Alta concentração em ${category}`,
          text: `${category} representa ${Math.round(percentage)}% das suas despesas no período. Avalie se há oportunidade de redução nessa categoria para melhorar sua margem de poupança.`,
        });
      }
    }
  }

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const previousTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
  });
  const previousExpense = previousTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.value, 0);

  if (previousExpense > 0 && totalExpense > 0) {
    const change = ((totalExpense - previousExpense) / previousExpense) * 100;
    if (isFinite(change) && !isNaN(change)) {
      if (change > 10) {
        insights.push({
          id: 'increase',
          level: 'warning',
          label: `Gastos ${Math.round(change)}% acima do período anterior`,
          text: `Suas despesas aumentaram ${Math.round(change)}% em relação ao período anterior. Identifique quais categorias cresceram e avalie ajustes no orçamento.`,
        });
      } else if (change < -10) {
        insights.push({
          id: 'decrease',
          level: 'positive',
          label: `Redução de ${Math.round(Math.abs(change))}% nas despesas`,
          text: `Suas despesas caíram ${Math.round(Math.abs(change))}% em relação ao período anterior. Excelente disciplina financeira — considere direcionar essa economia para investimentos.`,
        });
      }
    }
  }

  if (totalIncome === 0 && thisMonth.length > 0) {
    insights.push({
      id: 'no-income',
      level: 'info',
      label: 'Faltam receitas para uma leitura completa',
      text: 'Sem registrar suas entradas, sua análise fica incompleta e você pode tomar decisões com uma visão parcial do mês.',
    });
  }

  if (totalIncome > totalExpense && totalExpense > 0) {
    const surplus = totalIncome - totalExpense;
    const savingsRate = Math.round((surplus / totalIncome) * 100);
    insights.push({
      id: 'surplus',
      level: 'positive',
      label: 'Saldo positivo — continue assim!',
      text: `Você está guardando R$ ${surplus.toFixed(2).replace('.', ',')} (${savingsRate}% da receita). Considere alocar esse excedente em investimentos de renda fixa ou aumentar sua reserva de emergência.`,
    });
  }

  return insights;
}
