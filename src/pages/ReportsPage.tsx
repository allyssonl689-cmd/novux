import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { usePeriod } from '@/contexts/PeriodContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Activity, FileDown, Lock, CheckCircle2, Clock, AlertCircle, BadgeCheck, CircleDollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CHART } from '@/lib/tokens';

// Lazy import — jsPDF (~600KB) carregado somente quando o usuário clica em exportar
const loadGeneratePDF = () => import('@/lib/generatePDF').then(m => m.generateFinancialPDF);
const COLORS = CHART.pie;

const fmt  = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSigned = (v: number) => `${v < 0 ? '-' : ''}${fmt(v)}`;
const fmtK = (v: number) => v>=1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0);
const WRAPPER_STYLE = { background: 'transparent', border: 'none', padding: 0, outline: 'none' };
const GRID_COLOR = 'hsl(var(--border))';

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-2xl"
      style={{ boxShadow: '0 8px 32px hsl(0 0% 0% / 0.2)', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
      <p className="font-bold mb-2" style={{ fontFamily:'Outfit,sans-serif', color: 'hsl(var(--foreground))' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.fill||p.color }} />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{p.name}</span>
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

function buildMonthlySummary(txList: { type: string; value: number; date: string }[], limitMonths?: number) {
  const months: Record<string, { income: number; expense: number }> = {};
  txList.forEach(t => {
    const key = t.date.slice(0, 7);
    if (!months[key]) months[key] = { income: 0, expense: 0 };
    if (t.type === 'income') months[key].income += t.value;
    else months[key].expense += t.value;
  });
  let entries = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  if (limitMonths) entries = entries.slice(-limitMonths);
  return entries.map(([key, { income, expense }]) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const shortMonth = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    return { shortMonth, income, expense, savings: income - expense };
  });
}

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function ReportsPage() {
  const { transactions, insights } = useFinance();
  const { getRange, period, customRange } = usePeriod();
  const { user } = useAuth();
  const [tab, setTab] = useState<'visao'|'cats'|'trend'>('visao');
  const [pdfLoading, setPdfLoading] = useState(false);
  // PDF disponível para todos até billing ser implementado; quando ativo, usar user?.plan === 'premium'
  const isPremium = true;

  const periodTxs = useMemo(() => {
    const { start, end } = getRange();
    const s = toLocalDate(start);
    const e = toLocalDate(end);
    return transactions.filter(t => t.date >= s && t.date <= e);
  }, [transactions, period, customRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // History charts use ALL transactions (not period-filtered) to show full timeline
  const allMonthlySummary = useMemo(() => buildMonthlySummary(transactions), [transactions]);

  // Period-filtered summary (used only where period filter matters)
  const monthlySummary = useMemo(() => buildMonthlySummary(periodTxs), [periodTxs]);

  // Total acumulado — todo o histórico, independe do filtro de período
  const allTimeStats = useMemo(() => {
    const income  = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Status de pagamento — baseado no período selecionado
  const payStats = useMemo(() => {
    const received   = periodTxs.filter(t=>t.type==='income'  && t.paid===true ).reduce((s,t)=>s+t.value,0);
    const toReceive  = periodTxs.filter(t=>t.type==='income'  && t.paid!==true ).reduce((s,t)=>s+t.value,0);
    const paid       = periodTxs.filter(t=>t.type==='expense' && t.paid===true ).reduce((s,t)=>s+t.value,0);
    const pending    = periodTxs.filter(t=>t.type==='expense' && t.paid!==true ).reduce((s,t)=>s+t.value,0);
    const totalInc   = received + toReceive;
    const totalExp   = paid + pending;
    return { received, toReceive, paid, pending, totalInc, totalExp,
      receiptRate:  totalInc > 0 ? Math.round(received  / totalInc * 100) : 0,
      paymentRate:  totalExp > 0 ? Math.round(paid      / totalExp * 100) : 0,
      realBalance:  received - paid,
    };
  }, [periodTxs]);

  // Histórico mensal de status de pagamento — independe do filtro (todo o histórico)
  const monthlyPaySummary = useMemo(() =>
    buildMonthlySummary(transactions).map(m => {
      const monthKey = transactions.filter(t => {
        const d = new Date(t.date+'T12:00:00');
        return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) === m.shortMonth;
      });
      const received  = monthKey.filter(t=>t.type==='income'  && t.paid===true ).reduce((s,t)=>s+t.value,0);
      const toReceive = monthKey.filter(t=>t.type==='income'  && t.paid!==true ).reduce((s,t)=>s+t.value,0);
      const paid      = monthKey.filter(t=>t.type==='expense' && t.paid===true ).reduce((s,t)=>s+t.value,0);
      const pending   = monthKey.filter(t=>t.type==='expense' && t.paid!==true ).reduce((s,t)=>s+t.value,0);
      return { ...m, received, toReceive, paid, pending };
    }),
  [transactions]);

  const stats = useMemo(() => {
    const income  = periodTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const expense = periodTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0);
    const byCategory: Record<string,number> = {};
    periodTxs.filter(t=>t.type==='expense').forEach(t => { byCategory[t.category]=(byCategory[t.category]||0)+t.value; });
    const categories = Object.entries(byCategory).map(([name,value],i)=>({ name, value, color: COLORS[i%COLORS.length], pct: expense>0?Math.round((value/expense)*100):0 })).sort((a,b)=>b.value-a.value);
    return { income, expense, balance: income-expense, count: periodTxs.length, categories };
  }, [periodTxs]);

  const patrimony = useMemo(() =>
    allMonthlySummary.map((d, i) => ({
      ...d,
      patrimony: allMonthlySummary.slice(0, i + 1).reduce((s, m) => s + m.savings, 0),
    })),
  [allMonthlySummary]);

  async function handleExportPDF() {
    if (!isPremium) return;
    setPdfLoading(true);
    try {
      const generateFinancialPDF = await loadGeneratePDF();
      const { start, end } = getRange();
      generateFinancialPDF({
        userName: user?.name ?? 'Usuário',
        period: `${start.toLocaleDateString('pt-BR')} — ${end.toLocaleDateString('pt-BR')}`,
        income: stats.income,
        expense: stats.expense,
        balance: stats.balance,
        savingsRate: stats.income > 0 ? ((stats.income - stats.expense) / stats.income) * 100 : 0,
        transactionCount: stats.count,
        categories: stats.categories,
        monthlySummary: allMonthlySummary,
        insights: insights.map(i => ({ title: i.label, description: i.text, level: i.level })),
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Erro ao gerar o PDF. Verifique o console para detalhes.');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" >Relatórios</h1>
          <p className="text-xs text-muted-foreground mt-1">Análise detalhada do seu comportamento financeiro</p>
        </div>

        {/* PDF Export button */}
        <div className="relative group shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={!isPremium || pdfLoading}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
              isPremium
                ? 'btn-novux border-transparent'
                : 'border-border bg-card text-muted-foreground cursor-not-allowed opacity-70'
            }`}
          >
            {isPremium ? (
              <FileDown className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {pdfLoading ? 'Gerando...' : 'Exportar PDF'}
          </button>

          {!isPremium && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              <p className="text-xs font-semibold text-foreground mb-1">Recurso Premium</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Exporte relatórios completos em PDF com gráficos e insights financeiros.
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                Upgrade para Premium →
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l:'Receitas',    v: fmt(stats.income),   c:'#10B981', Icon: TrendingUp   },
          { l:'Despesas',    v: fmt(stats.expense),  c:'#EF4444', Icon: TrendingDown },
          { l:'Saldo', v: (stats.balance < 0 ? '-' : '') + fmt(Math.abs(stats.balance)), c: stats.balance>=0?'#0EA5E9':'#EF4444', Icon: Activity },
          { l:'Transações',  v: String(stats.count), c:'#8B5CF6', Icon: BarChart3    },
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

      {/* Total Acumulado — todo o histórico, independe do filtro */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Acumulado — Todo o Histórico
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
          {[
            { l: 'Receitas totais',   v: fmt(allTimeStats.income),   c: '#10B981', icon: '↑' },
            { l: 'Despesas totais',   v: fmt(allTimeStats.expense),  c: '#EF4444', icon: '↓' },
            { l: 'Patrimônio líquido',v: fmt(Math.abs(allTimeStats.balance)), c: allTimeStats.balance >= 0 ? '#0EA5E9' : '#EF4444', icon: allTimeStats.balance >= 0 ? '=' : '−' },
          ].map(s => (
            <div key={s.l} className="px-5 py-4 flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
              <p className="text-[11px] text-muted-foreground">{s.l}</p>
              <p className="text-lg font-bold mono" style={{ color: s.c, fontFamily: 'Outfit,sans-serif' }}>
                <span className="text-sm mr-1 opacity-70">{s.icon}</span>{s.v}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Status de Pagamentos do Período */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status de Pagamentos do Período</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Recebido',   val: fmt(payStats.received),  pct: payStats.receiptRate,      color: '#19D38A', Icon: BadgeCheck,       sub: 'das receitas' },
            { label: 'A receber',  val: fmt(payStats.toReceive), pct: 100-payStats.receiptRate,  color: '#F59E0B', Icon: Clock,            sub: 'das receitas' },
            { label: 'Pago',       val: fmt(payStats.paid),      pct: payStats.paymentRate,      color: '#16C7FF', Icon: CircleDollarSign, sub: 'das despesas' },
            { label: 'Em aberto',  val: fmt(payStats.pending),   pct: 100-payStats.paymentRate,  color: '#FF5A5F', Icon: AlertCircle,      sub: 'das despesas' },
          ].map((s, i) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
                <div className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <s.Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-base font-bold" style={{ color: s.color, fontFamily: 'Outfit,sans-serif' }}>{s.val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.pct}% {s.sub}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Saldo Real de Caixa</p>
            <p className="text-lg font-bold" style={{ fontFamily:'Outfit,sans-serif', color: payStats.realBalance>=0?'#16C7FF':'#FF5A5F' }}>{fmtSigned(payStats.realBalance)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">recebido − pago efetivamente</p>
          </div>
          <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Taxa de Recebimento</p>
            <p className="text-lg font-bold text-success" style={{ fontFamily:'Outfit,sans-serif' }}>{payStats.receiptRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">das receitas já recebidas</p>
          </div>
          <div className="rounded-xl border border-border bg-card/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Taxa de Pagamento</p>
            <p className="text-lg font-bold text-primary" style={{ fontFamily:'Outfit,sans-serif' }}>{payStats.paymentRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">das despesas já pagas</p>
          </div>
        </div>
      </motion.div>

      {/* Gráfico empilhado — Recebido/A receber vs Pago/Em aberto — independe do filtro */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Recebido × Pago por Mês</h3>
        <p className="text-[10px] text-muted-foreground mb-4">Histórico completo — todos os meses</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyPaySummary} barGap={4} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<Tip />} wrapperStyle={WRAPPER_STYLE} cursor={{ fill: 'hsl(var(--secondary))' }} />
            <Bar dataKey="received"  name="Recebido"   stackId="inc" fill="#19D38A" radius={[4,4,0,0]} barSize={10} />
            <Bar dataKey="toReceive" name="A receber"  stackId="inc" fill="#F59E0B" radius={[4,4,0,0]} barSize={10} />
            <Bar dataKey="paid"      name="Pago"       stackId="exp" fill="#16C7FF" radius={[4,4,0,0]} barSize={10} />
            <Bar dataKey="pending"   name="Em aberto"  stackId="exp" fill="#FF5A5F" radius={[4,4,0,0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

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
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} wrapperStyle={WRAPPER_STYLE} cursor={{ fill: 'hsl(var(--secondary))' }} />
                <Area type="monotone" dataKey="patrimony" name="Patrimônio" stroke="#8B5CF6" fill="url(#gPat)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Fluxo Mensal</h3>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={allMonthlySummary} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} wrapperStyle={WRAPPER_STYLE} cursor={{ fill: 'hsl(var(--secondary))' }} />
                <Bar dataKey="income"  name="Receita" fill="#10B981" radius={[4,4,0,0]} barSize={14} />
                <Bar dataKey="expense" name="Despesa" fill="#EF4444" radius={[4,4,0,0]} barSize={14} />
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
              <Pie
                data={stats.categories.map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] }))}
                dataKey="value" cx={95} cy={95} innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}
              />
              <Tooltip formatter={(v:number) => fmt(v)} wrapperStyle={WRAPPER_STYLE} />
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
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Receitas vs Despesas</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Histórico completo de todos os meses</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={allMonthlySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<Tip />} wrapperStyle={WRAPPER_STYLE} cursor={{ stroke: 'hsl(var(--border))' }} />
                <Line type="monotone" dataKey="income"  name="Receita" stroke="#10B981" strokeWidth={2.5} dot={{ r:4, fill:'#10B981' }} />
                <Line type="monotone" dataKey="expense" name="Despesa" stroke="#EF4444" strokeWidth={2.5} dot={{ r:4, fill:'#EF4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Taxa de Poupança Mensal</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Histórico completo de todos os meses</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={allMonthlySummary.map(m => ({
                ...m,
                rate: m.income > 0 ? parseFloat(((m.income-m.expense)/m.income*100).toFixed(1)) : 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(220 12% 42%)' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                <Tooltip
                  formatter={(v: number) => [`${Number(v).toFixed(1)}%`, 'Taxa de Poupança']}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }}
                  wrapperStyle={WRAPPER_STYLE}
                  cursor={{ fill: 'hsl(var(--secondary))' }}
                />
                <Bar dataKey="rate" name="Taxa de Poupança" fill="#0EA5E9" radius={[6,6,0,0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
