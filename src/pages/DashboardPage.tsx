import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight, ChevronRight, Sparkles, AlertTriangle, CheckCircle2, Info, Clock, AlertCircle, BadgeCheck, CircleDollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { buildFinancialIndicators } from '@/lib/financial-indicators';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART } from '@/lib/tokens';

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSigned = (v: number) => `${v < 0 ? '-' : ''}${fmt(v)}`;
const fmtK = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v));

const PIE_COLORS = CHART.pie;

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-2xl text-xs min-w-[140px]" style={{ boxShadow: '0 8px 32px hsl(0 0% 0% / 0.25)' }}>
      <p className="font-semibold text-foreground mb-2" >{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.fill || p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-mono font-semibold" style={{ color: p.fill || p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function KPI({ label, value, sub, icon: Icon, color, delta, idx }: {
  label: string; value: string; sub?: string; icon: any; color: string; delta?: number; idx: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-2xl border border-border bg-card p-4 card-hover relative overflow-hidden group"
      style={{ boxShadow: '0 2px 12px hsl(0 0% 0% / 0.4), 0 0 0 1px hsl(var(--border))' }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 20%, ${color}08 0%, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
        <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-foreground leading-none break-all" style={{ fontFamily: 'Outfit,sans-serif' }}>{value}</p>
      {(sub || delta !== undefined) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px]">
          {delta !== undefined && (
            delta >= 0
              ? <ArrowUpRight className="h-3 w-3 text-success" />
              : <ArrowDownRight className="h-3 w-3 text-destructive" />
          )}
          {delta !== undefined && (
            <span className={delta >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      )}
    </motion.div>
  );
}

const INSIGHT_CFG: Record<string, { color: string; Icon: any }> = {
  critical: { color: 'hsl(var(--destructive))', Icon: AlertTriangle },
  warning:  { color: 'hsl(var(--warning))',     Icon: AlertTriangle },
  positive: { color: 'hsl(var(--success))',     Icon: CheckCircle2 },
  info:     { color: 'hsl(var(--primary))',     Icon: Info },
};

function buildMonthlySummary(transactions: { type: string; value: number; date: string }[]) {
  const months: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const key = t.date.slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expense: 0 };
    if (t.type === 'income') months[key].income += t.value;
    else months[key].expense += t.value;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))   // ordem cronológica — sem slice
    .map(([key, { income, expense }]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      // Inclui o ano abreviado quando há múltiplos anos no histórico
      const shortMonth = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      return { shortMonth, income, expense, savings: income - expense };
    });
}

function DashboardSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-7 w-48" /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-3 h-80 rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { transactions, insights, isLoading } = useFinance();
  const { getRange, period, customRange } = usePeriod();
  const [chartMode, setChartMode] = useState<'bar' | 'area'>('bar');

  // Converte Date para string local YYYY-MM-DD (sem offset UTC — evita off-by-one em fusos)
  function toLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  const periodTxs = useMemo(() => {
    const { start, end } = getRange();
    const s = toLocalDate(start);
    const e = toLocalDate(end);
    return transactions.filter(t => t.date >= s && t.date <= e);
    // deps explícitas em period/customRange em vez de getRange (função nova a cada render)
  }, [transactions, period, customRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fluxo de Caixa mostra todos os meses (histórico completo independente do filtro)
  const monthlySummary = useMemo(() => buildMonthlySummary(transactions), [transactions]);

  // Totais gerais acumulados (todo o histórico, ignora filtro propositalmente)
  const allTimeStats = useMemo(() => ({
    income:  transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0),
    expense: transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0),
  }), [transactions]);

  // Status de pagamento — baseado no período selecionado
  const payStats = useMemo(() => {
    const received   = periodTxs.filter(t=>t.type==='income'  && t.paid===true ).reduce((s,t)=>s+t.value,0);
    const toReceive  = periodTxs.filter(t=>t.type==='income'  && t.paid!==true ).reduce((s,t)=>s+t.value,0);
    const paid       = periodTxs.filter(t=>t.type==='expense' && t.paid===true ).reduce((s,t)=>s+t.value,0);
    const pending    = periodTxs.filter(t=>t.type==='expense' && t.paid!==true ).reduce((s,t)=>s+t.value,0);
    const realBalance = received - paid;
    const commitment = received > 0 ? Math.round((pending / received) * 100) : 0;
    return { received, toReceive, paid, pending, realBalance, commitment };
  }, [periodTxs]);

  const stats = useMemo(() => {
    const cur = periodTxs;
    // compare against equivalent previous period
    const { start, end } = getRange();
    const dur = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - dur);
    const ps = toLocalDate(prevStart);
    const pe = toLocalDate(prevEnd);
    const prev = transactions.filter(t => t.date >= ps && t.date <= pe);

    const income  = cur.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const expense = cur.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);
    const pIncome = prev.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const pExpense= prev.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);

    const byCategory: Record<string,number> = {};
    cur.filter(t=>t.type==='expense').forEach(t => { byCategory[t.category]=(byCategory[t.category]||0)+t.value; });
    const totalExpenses = cur.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);
    const categories = Object.entries(byCategory)
      .map(([name,value],i) => ({ name, value, color: PIE_COLORS[i%PIE_COLORS.length], pct: totalExpenses>0 ? Math.round((value/totalExpenses)*100) : 0 }))
      .sort((a,b)=>b.value-a.value);

    // Saldo em regime de CAIXA: considera apenas lançamentos realizados (paid).
    // Receitas/Despesas (KPIs) seguem brutas — mostram a movimentação do período.
    const realIncome   = cur.filter(t=>t.type==='income'  && t.paid===true).reduce((s,t)=>s+t.value,0);
    const realExpense  = cur.filter(t=>t.type==='expense' && t.paid===true).reduce((s,t)=>s+t.value,0);
    const pRealIncome  = prev.filter(t=>t.type==='income'  && t.paid===true).reduce((s,t)=>s+t.value,0);
    const pRealExpense = prev.filter(t=>t.type==='expense' && t.paid===true).reduce((s,t)=>s+t.value,0);
    const curBalance  = realIncome - realExpense;
    const prevBalance = pRealIncome - pRealExpense;
    const hasPrevData = pRealIncome > 0 || pRealExpense > 0;

    // Variação real do saldo (usa |prevBalance| como base para evitar divisão negativa estranha)
    const balanceDelta = !hasPrevData || Math.abs(prevBalance) < 0.01
      ? 0
      : Math.max(-999, Math.min(999, Math.round(((curBalance - prevBalance) / Math.abs(prevBalance)) * 100)));

    return {
      income, expense, balance: curBalance, categories,
      incDelta:     pIncome>0  ? Math.round(((income-pIncome)/pIncome)*100)   : 0,
      expDelta:     pExpense>0 ? Math.round(((expense-pExpense)/pExpense)*100) : 0,
      balanceDelta,
    };
  }, [periodTxs, transactions, getRange]);

  const indicators = useMemo(() => buildFinancialIndicators(periodTxs), [periodTxs]);
  // Score hiperbólico: 500/riskRatio — nunca zera, reflete gradualmente a saúde financeira
  // riskRatio 0.5 (poupou 50%) → ~950  | riskRatio 1.0 (break-even) → ~500
  // riskRatio 1.5 (déficit 50%) → ~333 | riskRatio 2.0 (déficit 100%) → ~250
  const score = indicators
    ? (indicators.riskRatio <= 0
        ? 950
        : Math.max(30, Math.min(950, Math.round(500 / indicators.riskRatio))))
    : 720;
  const scoreLabel = score>=800?'Excelente':score>=650?'Muito Bom':score>=450?'Regular':score>=250?'Atenção':'Crítico';
  const scoreColor = score>=650 ? 'hsl(var(--success))' : score>=400 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  const recent = useMemo(() => [...periodTxs].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,7), [periodTxs]);
  // Taxa de poupança em regime de caixa: saldo realizado sobre o que foi recebido
  const savingsRate = payStats.received > 0 ? (payStats.realBalance / payStats.received * 100).toFixed(1) : '0';

  // Título dinâmico baseado no período selecionado
  const periodLabel = useMemo(() => {
    const { start, end } = getRange();
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameYear) return String(start.getFullYear());
    return `${start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })} — ${end.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`;
  }, [period, customRange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Painel Financeiro</p>
            <h1 className="text-2xl font-bold text-foreground leading-none" >
              {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-[11px] text-muted-foreground">Dados em tempo real</span>
          </div>
        </div>
      </motion.div>

      {/* KPIs — Saldo Total, Receitas, Despesas, Patrimônio Líquido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI idx={0} label="Saldo do Mês"       value={fmtSigned(stats.balance)}              delta={stats.balanceDelta}             sub="vs mês anterior" icon={Wallet}      color={CHART.investment} />
        <KPI idx={1} label="Receitas"            value={fmt(stats.income)}                     delta={stats.incDelta}                  sub="vs mês anterior" icon={TrendingUp}  color={CHART.income}     />
        <KPI idx={2} label="Despesas"            value={fmt(stats.expense)}                    delta={stats.expDelta}                  sub="vs mês anterior" icon={TrendingDown} color={CHART.expense}   />
        <KPI idx={3} label="Patrimônio Líquido"  value={fmtSigned(stats.income - stats.expense)} sub="acumulado no período"            icon={PiggyBank}      color={CHART.goal}                         />
      </div>

      {/* Summary strip — 1 col mobile, 3 cols sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: 'Taxa de poupança', val: `${savingsRate}%`, note: Number(savingsRate)>=20?'✓ Acima da meta':'Meta: 20%', ok: Number(savingsRate)>=20 },
          { label: 'Saldo livre estimado', val: fmtSigned(stats.income - stats.expense), note: stats.balance >= 0 ? 'disponível para investir' : 'despesas acima da receita', ok: stats.balance >= 0 },
          { label: 'Categorias ativas', val: `${stats.categories.length}`, note: `top: ${stats.categories[0]?.name||'—'}`, ok: true },
        ].map((s,i) => (
          <div key={i} className="rounded-xl border border-border bg-card/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5" style={{ fontFamily: 'Outfit,sans-serif' }}>{s.val}</p>
            <p className={`text-[11px] mt-0.5 ${s.ok ? 'text-success' : 'text-warning'}`}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* Status de Pagamentos — pago / em aberto / a receber / recebido */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status de Pagamentos do Período</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Recebido',    val: fmt(payStats.received),  sub: `de ${fmt(stats.income)} em receitas`,    color: CHART.income,     Icon: BadgeCheck    },
            { label: 'A receber',   val: fmt(payStats.toReceive), sub: `${stats.income>0?Math.round(payStats.toReceive/stats.income*100):0}% das receitas`,  color: CHART.warning,    Icon: Clock         },
            { label: 'Pago',        val: fmt(payStats.paid),      sub: `de ${fmt(stats.expense)} em despesas`,   color: CHART.investment, Icon: CircleDollarSign },
            { label: 'Em aberto',   val: fmt(payStats.pending),   sub: `${stats.expense>0?Math.round(payStats.pending/stats.expense*100):0}% das despesas`,  color: CHART.expense,    Icon: AlertCircle   },
          ].map((s,i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i*0.05 }}
              className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
                <div className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <s.Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: s.color, fontFamily: 'Outfit,sans-serif' }}>{s.val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Saldo Real vs Projetado + Comprometimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl border border-border bg-card/50 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Saldo Real de Caixa</p>
              <p className="text-xl font-bold mt-0.5" style={{ fontFamily: 'Outfit,sans-serif', color: payStats.realBalance >= 0 ? CHART.income : CHART.expense }}>
                {fmtSigned(payStats.realBalance)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">recebido − pago efetivamente</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Saldo Projetado</p>
              <p className="text-lg font-bold mt-0.5" style={{ fontFamily: 'Outfit,sans-serif', color: stats.balance >= 0 ? 'hsl(var(--muted-foreground))' : CHART.expense }}>
                {fmtSigned(stats.balance)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">total receitas − total despesas</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Comprometimento do Caixa</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                payStats.commitment >= 80 ? 'bg-destructive/15 text-destructive' :
                payStats.commitment >= 50 ? 'bg-warning/15 text-warning' : 'bg-success-muted text-success'
              }`}>{payStats.commitment}%</span>
            </div>
            <div className="progress-track h-2 mb-2">
              <div className="progress-fill" style={{
                width: `${Math.min(payStats.commitment, 100)}%`,
                background: payStats.commitment>=80 ? CHART.expense : payStats.commitment>=50 ? CHART.warning : CHART.income,
              }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {payStats.commitment >= 80 ? '⚠️ Alto comprometimento — revise os pendentes' :
               payStats.commitment >= 50 ? 'Atenção: mais da metade do caixa em abertos' :
               '✓ Comprometimento saudável do caixa disponível'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Total Geral acumulado — independe do filtro de período */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border bg-card px-5 py-3 flex flex-wrap items-center gap-4">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total Acumulado (todo o histórico)</span>
        <div className="flex flex-wrap gap-4 ml-auto">
          <span className="text-sm font-bold" style={{ color: CHART.income }}>↑ {fmt(allTimeStats.income)}</span>
          <span className="text-sm font-bold" style={{ color: CHART.expense }}>↓ {fmt(allTimeStats.expense)}</span>
          <span className={`text-sm font-bold ${allTimeStats.income >= allTimeStats.expense ? 'text-success' : 'text-destructive'}`}>
            = {fmtSigned(allTimeStats.income - allTimeStats.expense)}
          </span>
        </div>
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Flow chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground" >Fluxo de Caixa</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Histórico completo — todos os meses</p>
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-secondary/60">
              {(['bar','area'] as const).map(m => (
                <button key={m} onClick={() => setChartMode(m)}
                  className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all ${chartMode===m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {m==='bar' ? 'Barras' : 'Área'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            {chartMode === 'bar' ? (
              <BarChart data={monthlySummary} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} cursor={{ fill: 'hsl(var(--secondary))' }} wrapperStyle={{ background: 'transparent', border: 'none', padding: 0, outline: 'none' }} />
                <Bar dataKey="income"  name="Receitas" fill={CHART.income}     radius={[5,5,0,0]} barSize={14} />
                <Bar dataKey="expense" name="Despesas" fill={CHART.expense}    radius={[5,5,0,0]} barSize={14} />
                <Bar dataKey="savings" name="Economia" fill={CHART.goal}       radius={[5,5,0,0]} barSize={14} />
              </BarChart>
            ) : (
              <AreaChart data={monthlySummary}>
                <defs>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.income}  stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART.income}  stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.expense} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={CHART.expense} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} cursor={{ fill: 'hsl(var(--secondary))' }} wrapperStyle={{ background: 'transparent', border: 'none', padding: 0, outline: 'none' }} />
                <Area type="monotone" dataKey="income"  name="Receitas" stroke={CHART.income}  fill="url(#gInc)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Despesas" stroke={CHART.expense} fill="url(#gExp)" strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Categories donut */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-4" >Gastos por Categoria</h3>

          {stats.categories.length > 0 && (
            <div className="flex justify-center mb-4">
              <PieChart width={140} height={140}>
                <Pie data={stats.categories.slice(0,5)} dataKey="value" cx={65} cy={65} innerRadius={40} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                  {stats.categories.slice(0,5).map((c,i) => <Cell key={i} fill={c.color} />)}
                </Pie>
              </PieChart>
            </div>
          )}

          <div className="space-y-3">
            {stats.categories.slice(0,5).map(cat => {
              const barColor = cat.pct>=90 ? 'hsl(var(--destructive))' : cat.pct>=70 ? 'hsl(var(--warning))' : cat.color;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-foreground font-medium">{cat.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{cat.pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(cat.pct,100)}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Insights da IA</h3>
            <span className="badge-violet">LIVE</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.slice(0,6).map((ins, i) => {
              const cfg = INSIGHT_CFG[ins.level] || INSIGHT_CFG.info;
              return (
                <motion.div key={ins.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="rounded-2xl border p-4 card-hover"
                  style={{ borderColor: `${cfg.color}30`, background: `${cfg.color}0d` }}>
                  <div className="flex items-start gap-3">
                    <cfg.Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{ins.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{ins.text}</p>
                      <button className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-80" style={{ color: cfg.color }}>
                        Ação recomendada <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Bottom row: recent + score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Últimas Transações</h3>
            <Link to="/lancamentos" className="flex items-center gap-1 text-[11px] text-primary font-medium hover:opacity-80 transition-opacity">
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div>
            {recent.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors ${i < recent.length-1 ? 'border-b border-border/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${tx.type==='income' ? 'bg-success-muted text-success' : 'bg-alert-muted text-destructive'}`}>
                    {tx.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tx.category} · {new Date(tx.date+'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold mono ${tx.type==='income' ? 'text-success' : 'text-destructive'}`}>
                  {tx.type==='income' ? '+' : '−'}{fmt(tx.value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Financial health */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Saúde Financeira</h3>

          {/* Score ring */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <svg width="120" height="72" viewBox="0 0 120 72">
                <path d="M 10 68 A 50 50 0 0 1 110 68" fill="none" strokeWidth="10" strokeLinecap="round" stroke="hsl(230 18% 15%)" />
                <path d="M 10 68 A 50 50 0 0 1 110 68" fill="none" strokeWidth="10" strokeLinecap="round"
                  stroke={scoreColor} strokeDasharray={`${(score/1000)*157} 157`}
                  style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }} />
              </svg>
              <div className="absolute bottom-0 inset-x-0 text-center -mb-1">
                <span className="text-2xl font-bold leading-none" style={{ fontFamily:'Outfit,sans-serif', color: scoreColor }}>{score}</span>
                <p className="text-[9px] text-muted-foreground mt-0.5">{scoreLabel}</p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            {[
              { label: 'Controle de gastos', val: Math.round(score*0.3), max: 300, color: 'hsl(var(--chart-1))' },
              { label: 'Taxa de poupança',   val: Math.round(score*0.25),max: 250, color: 'hsl(var(--success))' },
              { label: 'Regularidade',       val: Math.round(score*0.2), max: 200, color: 'hsl(var(--accent))' },
              { label: 'Diversificação',     val: Math.round(score*0.25),max: 250, color: 'hsl(var(--warning))' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-semibold text-foreground mono">{m.val}/{m.max}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(m.val/m.max)*100}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>

          <Link to="/ia-insights" className="btn-novux flex items-center justify-center gap-2 w-full mt-5 py-2.5 text-xs font-bold rounded-xl">
            <Sparkles className="h-3.5 w-3.5" />
            Analisar com IA
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
