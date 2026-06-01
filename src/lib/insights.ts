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
      label: 'Você está gastando mais do que ganha',
      text: `Seu mês já está ${deficit.toFixed(2).replace('.', ',')} acima da sua renda. Se nada mudar, seu saldo pode continuar encolhendo até o fechamento.`,
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
          label: `Seus gastos estão puxados por ${category}`,
          text: `${category} já representa ${Math.round(percentage)}% das suas despesas. Se esse padrão continuar, essa categoria pode pressionar ainda mais seu saldo final.`,
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
          label: 'Você está gastando mais que no mês passado',
          text: `Se continuar assim, seus gastos podem fugir ainda mais do controle. Hoje você já está ${Math.round(change)}% acima do mês anterior.`,
        });
      } else if (change < -10) {
        insights.push({
          id: 'decrease',
          level: 'positive',
          label: 'Seu controle financeiro melhorou',
          text: `Você reduziu seus gastos em ${Math.round(Math.abs(change))}% versus o mês anterior. Mantendo esse ritmo, suas chances de fechar o mês com folga aumentam.`,
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
    insights.push({
      id: 'surplus',
      level: 'positive',
      label: 'Você terminou o mês com saldo positivo — ótimo sinal',
      text: `Hoje sobram R$ ${surplus.toFixed(2).replace('.', ',')}. Se mantiver esse ritmo, você fecha o mês com mais espaço para investir ou guardar.`,
    });
  }

  return insights;
}
