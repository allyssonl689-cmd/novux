import { Transaction } from '@/lib/types';

export type RiskLevel = 'high' | 'medium' | 'healthy';
export type ConsistencyLevel = 'positive' | 'negative' | null;

export interface FinancialIndicatorsData {
  income: number;
  expense: number;
  riskRatio: number;
  riskLevel: RiskLevel;
  riskText: string;
  forecast: number | null;
  forecastText: string | null;
  projectedBalance: number | null;
  projectedBalanceText: string | null;
  projectedBalanceLevel: 'positive' | 'negative' | null;
  actionCategory: string | null;
  actionAmount: number | null;
  actionProjectedBalance: number | null;
  actionText: string | null;
  top3: { name: string; value: number; pct: number }[];
  top3Pct: number;
  top3Text: string | null;
  consistencyChange: number | null;
  consistencyText: string | null;
  consistencyLevel: ConsistencyLevel;
}

function fmt(value: number) {
  return `R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
}

export function buildFinancialIndicators(transactions: Transaction[]): FinancialIndicatorsData | null {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const income = thisMonth
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.value, 0);

  const expense = thisMonth
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.value, 0);

  if (income === 0 && expense === 0) return null;

  const riskRatio = income > 0 ? expense / income : expense > 0 ? 1 : 0;

  let riskLevel: RiskLevel;
  let riskText: string;

  if (riskRatio > 0.9) {
    riskLevel = 'high';
    riskText = 'Você está no limite financeiro — quase toda sua renda está comprometida. Se nada mudar, qualquer gasto extra pode levar seu mês para o negativo.';
  } else if (riskRatio >= 0.7) {
    riskLevel = 'medium';
    riskText = 'Você já comprometeu grande parte da sua renda este mês. Se continuar assim, seu saldo final pode ficar apertado.';
  } else {
    riskLevel = 'healthy';
    riskText = '✅ Você está no controle financeiro — mantenha esse ritmo para fechar o mês positivo.';
  }

  const dayOfMonth = now.getDate();
  let forecast: number | null = null;
  let forecastText: string | null = null;

  // Só projeta a partir do dia 3 (evita previsões absurdas no dia 1-2 do mês)
  if (expense > 0 && dayOfMonth >= 3) {
    const averageDailyExpense = expense / dayOfMonth;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    forecast = averageDailyExpense * daysInMonth;
    forecastText = `Se continuar nesse ritmo, você gastará aproximadamente ${fmt(forecast)} este mês — isso pode reduzir seu saldo final.`;
  }

  let projectedBalance: number | null = null;
  let projectedBalanceText: string | null = null;
  let projectedBalanceLevel: 'positive' | 'negative' | null = null;

  if (forecast !== null) {
    projectedBalance = income - forecast;
    projectedBalanceLevel = projectedBalance >= 0 ? 'positive' : 'negative';
    projectedBalanceText = projectedBalance >= 0
      ? `Se continuar assim, você fechará o mês com aproximadamente ${fmt(projectedBalance)} de saldo.`
      : `⚠️ Nesse ritmo, você pode terminar o mês no negativo em ${fmt(projectedBalance)}.`;
  }

  const expensesByCategory: Record<string, number> = {};
  thisMonth
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      expensesByCategory[transaction.category] = (expensesByCategory[transaction.category] || 0) + transaction.value;
    });

  const sortedCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  const top3 = sortedCategories.slice(0, 3).map(([name, value]) => ({
    name,
    value,
    pct: expense > 0 ? Math.round((value / expense) * 100) : 0,
  }));
  const top3Pct = top3.reduce((sum, category) => sum + category.pct, 0);
  const top3Text = top3.length > 0
    ? `🔥 Seus maiores gastos estão concentrados nessas categorias. Se nada mudar, elas continuarão pressionando seu saldo no fim do mês.`
    : null;

  let actionCategory: string | null = null;
  let actionAmount: number | null = null;
  let actionProjectedBalance: number | null = null;
  let actionText: string | null = null;

  if (sortedCategories.length > 0) {
    actionCategory = sortedCategories[0][0];
    actionAmount = Math.round(sortedCategories[0][1] * 0.2);
    const baseProjectedBalance = projectedBalance ?? income - expense;
    actionProjectedBalance = baseProjectedBalance + actionAmount;

    if (actionAmount > 0) {
      actionText = `💡 Reduzindo ${fmt(actionAmount)} em ${actionCategory}: seu saldo pode subir para ${fmt(actionProjectedBalance)}.`;
    }
  }

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const previousExpense = transactions
    .filter((transaction) => {
      const date = new Date(transaction.date);
      return transaction.type === 'expense' && date.getMonth() === previousMonth && date.getFullYear() === previousYear;
    })
    .reduce((sum, transaction) => sum + transaction.value, 0);

  let consistencyChange: number | null = null;
  let consistencyText: string | null = null;
  let consistencyLevel: ConsistencyLevel = null;

  if (previousExpense > 0 && expense > 0) {
    consistencyChange = Math.round(((expense - previousExpense) / previousExpense) * 100);

    if (consistencyChange > 0) {
      consistencyLevel = 'negative';
      consistencyText = `⚠️ Seus gastos estão aumentando — isso pode impactar seu saldo no fim do mês. Hoje você já está ${consistencyChange}% acima do mês anterior.`;
    } else if (consistencyChange < 0) {
      consistencyLevel = 'positive';
      consistencyText = `Você melhorou seu controle financeiro em ${Math.abs(consistencyChange)}% 👏 Se mantiver esse ritmo, suas chances de fechar o mês com folga aumentam.`;
    }
  }

  return {
    income,
    expense,
    riskRatio,
    riskLevel,
    riskText,
    forecast,
    forecastText,
    projectedBalance,
    projectedBalanceText,
    projectedBalanceLevel,
    actionCategory,
    actionAmount,
    actionProjectedBalance,
    actionText,
    top3,
    top3Pct,
    top3Text,
    consistencyChange,
    consistencyText,
    consistencyLevel,
  };
}
