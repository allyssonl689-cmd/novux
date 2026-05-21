import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  'hsl(225, 70%, 50%)',  // primary
  'hsl(150, 60%, 35%)',  // success
  'hsl(10, 80%, 55%)',   // alert
  'hsl(45, 80%, 50%)',   // amber
  'hsl(280, 60%, 50%)',  // purple
  'hsl(190, 70%, 45%)',  // teal
  'hsl(340, 65%, 50%)',  // rose
  'hsl(100, 50%, 40%)',  // green
];

export function CategoryChart() {
  const { transactions } = useFinance();

  const data = useMemo(() => {
    const now = new Date();
    const expenses = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const byCategory: Record<string, number> = {};
    expenses.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.value;
    });

    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Sem dados de despesas para exibir
      </div>
    );
  }

  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(220, 15%, 90%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-foreground">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{((item.value / total) * 100).toFixed(0)}%</span>
              <span className="font-mono font-medium text-foreground">R$ {item.value.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
