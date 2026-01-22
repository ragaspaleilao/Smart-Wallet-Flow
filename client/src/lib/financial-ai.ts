import { Transaction, Account, Investment, TransactionType } from "./store";
import { startOfMonth, subMonths, isSameMonth, endOfMonth, eachDayOfInterval, format, parseISO, isAfter, isBefore, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface AIInsight {
  id: string;
  type: 'alert' | 'success' | 'info' | 'prediction';
  title: string;
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export function generateFinancialInsights(
  transactions: Transaction[],
  accounts: Account[],
  investments: Investment[],
  budget: { spendingLimit: number; income: number }
): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date();
  
  // 1. Burn Rate Analysis (Spending vs Income)
  const currentMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), now));
  const currentMonthExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const currentMonthIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (currentMonthExpense > currentMonthIncome && currentMonthIncome > 0) {
    insights.push({
      id: 'burn-rate',
      type: 'alert',
      title: 'Atenção ao Saldo',
      message: `Você já gastou R$ ${(currentMonthExpense - currentMonthIncome).toFixed(2)} a mais do que recebeu este mês.`,
      priority: 'high'
    });
  }

  // 2. Budget Alert
  if (budget.spendingLimit > 0) {
    const percentageUsed = (currentMonthExpense / budget.spendingLimit) * 100;
    if (percentageUsed > 90) {
      insights.push({
        id: 'budget-limit',
        type: 'alert',
        title: 'Limite de Gastos Próximo',
        message: `Você já usou ${percentageUsed.toFixed(0)}% do seu limite mensal definido.`,
        priority: 'high'
      });
    }
  }

  // 3. Category Spikes (vs Last Month)
  const lastMonth = subMonths(now, 1);
  const lastMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), lastMonth));
  
  const getCategoryTotals = (txs: Transaction[]) => {
    return txs.reduce((acc, curr) => {
      if (curr.type === 'expense') {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  const currentCats = getCategoryTotals(currentMonthTransactions);
  const lastCats = getCategoryTotals(lastMonthTransactions);

  Object.keys(currentCats).forEach(cat => {
    const current = currentCats[cat];
    const last = lastCats[cat] || 0;
    if (last > 0 && current > last * 1.2 && current > 100) { // 20% increase and absolute value > 100
      const increase = ((current - last) / last) * 100;
      insights.push({
        id: `spike-${cat}`,
        type: 'info',
        title: `Aumento em ${cat}`,
        message: `Seus gastos com ${cat} subiram ${increase.toFixed(0)}% em comparação ao mês passado.`,
        priority: 'medium'
      });
    }
  });

  // 4. Investment Opportunity (High Balance check)
  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const monthlyAvgExpense = 3000; // Mock average, in real app calculate from history
  
  if (totalLiquidity > monthlyAvgExpense * 3) { // If > 3 months runway
     insights.push({
        id: 'invest-opportunity',
        type: 'success',
        title: 'Oportunidade de Investimento',
        message: 'Você tem um bom saldo em conta. Que tal investir o excedente para render mais?',
        priority: 'low'
     });
  }

  // 5. Prediction (Runway)
  if (totalLiquidity > 0 && currentMonthExpense > currentMonthIncome) {
      const burnRate = currentMonthExpense - currentMonthIncome;
      const monthsLeft = totalLiquidity / burnRate;
      if (monthsLeft < 3) {
          insights.push({
              id: 'runway-warning',
              type: 'alert',
              title: 'Projeção de Caixa',
              message: `Nesse ritmo, seu saldo atual cobrirá apenas mais ${monthsLeft.toFixed(1)} meses de despesas.`,
              priority: 'high'
          });
      }
  }

  return insights;
}

export function getChartData(transactions: Transaction[], days = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    // Daily Balance Evolution
    const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Find transactions up to this day
        // Ideally we would calculate running balance from the beginning of time, 
        // but for this chart we can just look at activity in the period or simulate running balance
        // Simplified: Daily Income vs Expense
        const dayTxs = transactions.filter(t => t.date.startsWith(dateStr));
        const income = dayTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const expense = dayTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        
        return {
            date: format(date, 'dd/MM'),
            income,
            expense,
            net: income - expense
        };
    });

    return dailyData;
}

export function getCategoryDistribution(transactions: Transaction[]) {
    const totals = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {} as Record<string, number>);
        
    return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}
