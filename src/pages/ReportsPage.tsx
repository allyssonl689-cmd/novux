import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';

const fmt  = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
const fmtK = (v: number) => v>=1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v));
const COLORS = ['hsl(161,100%,45%)','hsl(245,100%,72%)','hsl(43,95%,58%)','hsl(193,100%,50%)','hsl(4,86%,68%)','hsl(300,60%,65%)'];

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-[hsl(230_22%_11%)] p-3 text-xs shadow-2xl">
      <p className="font-bold text-foreground mb-2" style={{ fontFamily:'Outfit,sans-serif' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.fill||p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-semibold mono" style={{ color: p.fill||p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const TABS = [
  { id:'visao', label:'Visão Geral',  icon: BarChart3  },
  { id:'cats',  label:'Categorias',   icon: Activity   },
  { id:'trend', label:'Tendências',   icon: TrendingUp },
] as const;

function buildMonthlySummary(transactions: { type: string; value: number; date: string }[]) {
  const months: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const key = t.date.slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expense: 0 };
    if (t.type === 'income') months[key].income += t.value;
    else months[key].expense += t.value;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, { income, expense }]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const shortMonth = date.toLocaleDateString('pt-BR', { month: 'short' });
      return { shortMonth, income, expense, savings: income - expense };
    });
}

export default function ReportsPage() {
  const { transactions } = useFinance();
  const [tab, setTab] = useState<'visao'|'cats'|'trend'>('visao');

  const monthlySummary = useMemo(() => buildMonthlySummary(transactions), [transactions]);

  const stats = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth(), cy = now.getFullYear();
    const cur = transactions.filter(t => { const d=new Date(t.date); return d.getMonth()===cm&&d.getFullYear()===cy; });
    const income  = cur.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const expense = cur.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);
    const byCategory: Record<string,number> = {};
    cur.filter(t=>t.type==='expense').forEach(t => { byCategory[t.category]=(byCategory[t.category]||0)+t.value; });
    const categories = Object.entries(byCategory).map(([name,value],i)=>({ name, value, color: COLORS[i%COLORS.length], pct: expense>0?Math.round((value/expense)*100):0 })).sort((a,b)=>b.value-a.value);
    return { income, expense, balance: income-expense, count: cur.length, categories };
  }, [transactions]);

  const patrimony = useMemo(() =>
    monthlySummary.map((d, i) => ({
      ...d,
      patrimony: monthlySummary.slice(0, i + 1).reduce((s, m) => s + m.savings, 0),
    })),
  [monthlySummary]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily:'Outfit,sans-serif' }}>Relatórios</h1>
        <p className="text-xs text-muted-foreground mt-1">Análise detalhada do seu comportamento financeiro</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l:'Receitas',    v: fmt(stats.income),   c:'hsl(161,100%,45%)', Icon: TrendingUp   },
          { l:'Despesas',    v: fmt(stats.expense),  c:'hsl(4,86%,68%)',   Icon: TrendingDown },
          { l:'Saldo',       v: fmt(stats.balance),  c: stats.balance>=0?'hsl(193,100%,50%)':'hsl(4,86%,68%)', Icon: Activity },
          { l:'Transações',  v: String(stats.count), c:'hsl(245,100%,72%)', Icon: BarChart3    },
        ].map((s,i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}
            className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{s.l}</span>
              <s.Icon className="h-3.5 w-3.5" style={{ color: s.c }} />
            </div>
            <p className="text-xl font-bold mono" style={{ color: s.c, fontFamily:'Outfit,sans-serif' }}>{s.v}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/60 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${tab===t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'visao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Evolução do Patrimônio</h3>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={patrimony}>
                <defs>
                  <linearGradient id="gPat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(245,100%,72%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(245,100%,72%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 15%)" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="patrimony" name="Patrimônio" stroke="hsl(245,100%,72%)" fill="url(#gPat)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Fluxo Mensal</h3>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={monthlySummary} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 15%)" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="income"  name="Receita" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} barSize={14} />
                <Bar dataKey="expense" name="Despesa" fill="hsl(var(--chart-5))"   radius={[4,4,0,0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'cats' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 flex flex-col items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 self-start">Composição de Gastos</h3>
            <PieChart width={200} height={200}>
              <Pie data={stats.categories} dataKey="value" cx={95} cy={95} innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                {stats.categories.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v:number) => fmt(v)} />
            </PieChart>
            <p className="text-xs text-muted-foreground">Total: <span className="font-bold text-foreground mono">{fmt(stats.expense)}</span></p>
          </div>
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Por Categoria</h3>
            <div className="space-y-3.5">
              {stats.categories.map((cat,i) => (
                <motion.div key={cat.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.05 }}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-foreground font-medium">{cat.name}</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className="text-muted-foreground">{cat.pct}%</span>
                      <span className="font-bold text-foreground mono">{fmt(cat.value)}</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <motion.div className="progress-fill" initial={{ width:0 }} animate={{ width:`${cat.pct}%` }} transition={{ duration:0.8, delay: i*0.05 }}
                      style={{ background: cat.color }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'trend' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Receitas vs Despesas</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 15%)" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="income"  name="Receita" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r:4, fill:'hsl(161,100%,45%)' }} />
                <Line type="monotone" dataKey="expense" name="Despesa" stroke="hsl(var(--chart-5))"   strokeWidth={2.5} dot={{ r:4, fill:'hsl(4,86%,68%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Taxa de Poupança Mensal</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlySummary.map(m => ({ ...m, rate: m.income>0 ? Math.round(((m.income-m.expense)/m.income)*100) : 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 15%)" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="rate" name="Taxa de Poupança" fill="hsl(var(--chart-1))" radius={[6,6,0,0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
