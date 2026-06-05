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

      if (percentage > 25) {
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

  // ── Insights de status de pagamento ──────────────────────
  const fmt2 = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pendingExpenses = thisMonth.filter(t => t.type === 'expense' && !t.paid).reduce((s, t) => s + t.value, 0);
  const receivedIncome  = thisMonth.filter(t => t.type === 'income'  &&  t.paid).reduce((s, t) => s + t.value, 0);
  const toReceiveIncome = thisMonth.filter(t => t.type === 'income'  && !t.paid).reduce((s, t) => s + t.value, 0);

  // Alerta: despesas em aberto relevantes
  if (pendingExpenses > 0 && totalExpense > 0) {
    const pct = Math.round((pendingExpenses / totalExpense) * 100);
    insights.push({
      id: 'pending-expenses',
      level: pct >= 60 ? 'warning' : 'info',
      label: `${fmt2(pendingExpenses)} em despesas em aberto`,
      text: `${pct}% das suas despesas do período ainda não foram pagas. Verifique as datas de vencimento para evitar juros ou inadimplência.`,
    });
  }

  // Alerta: receitas a receber
  if (toReceiveIncome > 0 && totalIncome > 0) {
    const pct = Math.round((toReceiveIncome / totalIncome) * 100);
    insights.push({
      id: 'to-receive',
      level: pct >= 50 ? 'warning' : 'info',
      label: `${fmt2(toReceiveIncome)} ainda a receber`,
      text: `${pct}% das suas receitas do período ainda não entraram no caixa. Certifique-se de que os pagamentos estão sendo acompanhados.`,
    });
  }

  // Alerta: comprometimento do caixa com pendentes
  if (pendingExpenses > 0 && receivedIncome > 0) {
    const commitment = Math.round((pendingExpenses / receivedIncome) * 100);
    if (commitment >= 50) {
      insights.push({
        id: 'cash-commitment',
        level: commitment >= 80 ? 'critical' : 'warning',
        label: `${commitment}% do caixa comprometido com pendentes`,
        text: `Você tem ${fmt2(pendingExpenses)} em aberto contra ${fmt2(receivedIncome)} já recebidos. ${commitment >= 80 ? 'Risco alto de tensão de caixa — priorize os pagamentos urgentes.' : 'Planeje os pagamentos pendentes para não comprometer o saldo disponível.'}`,
      });
    }
  }

  return insights;
}
