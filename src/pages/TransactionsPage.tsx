import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { usePeriod } from '@/contexts/PeriodContext';
import {
  Search, Plus, Trash2, Pencil, TrendingUp, TrendingDown, ArrowUpDown,
  Utensils, Car, Home, Smile, HeartPulse, BookOpen, Briefcase,
  BarChart2, Laptop, Smartphone, CreditCard, Shirt, Activity,
  Package, Gift, RotateCcw, CheckCircle2, Circle, LucideIcon, FileUp,
} from 'lucide-react';
import { TransactionForm } from '@/components/TransactionForm';
import { CSVImportModal } from '@/components/CSVImportModal';
import { Transaction } from '@/lib/types';

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CAT_ICONS: Record<string, LucideIcon> = {
  'Alimentação': Utensils,
  'Transporte': Car,
  'Moradia': Home,
  'Lazer': Smile,
  'Saúde': HeartPulse,
  'Educação': BookOpen,
  'Salário': Briefcase,
  'Investimentos': BarChart2,
  'Freelance': Laptop,
  'Assinaturas': Smartphone,
  'Cartão': CreditCard,
  'Vestuário': Shirt,
  'Saúde/Bem-estar': Activity,
  'Outros': Package,
  'Presente': Gift,
  'Reembolso': RotateCcw,
};

export default function TransactionsPage() {
  const { transactions, deleteTransaction, toggleTransactionPaid } = useFinance();
  const { getRange } = usePeriod();
  const [search, setSearch] = useState('');
  const [tab, setTab]       = useState<'todos' | 'receitas' | 'despesas'>('todos');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const periodTxs = useMemo(() => {
    const { start, end } = getRange();
    const s = start.toISOString().split('T')[0];
    const e = end.toISOString().split('T')[0];
    return transactions.filter(t => t.date >= s && t.date <= e);
  }, [transactions, getRange]);

  const monthTotals = useMemo(() => ({
    income:  periodTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0),
    expense: periodTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0),
  }), [periodTxs]);

  const filtered = useMemo(() => {
    let txs = [...periodTxs].sort((a,b) =>
      sortDir==='desc' ? new Date(b.date).getTime()-new Date(a.date).getTime() : new Date(a.date).getTime()-new Date(b.date).getTime()
    );
    if (tab==='receitas') txs = txs.filter(t=>t.type==='income');
    if (tab==='despesas') txs = txs.filter(t=>t.type==='expense');
    if (search) { const s=search.toLowerCase(); txs=txs.filter(t=>t.description.toLowerCase().includes(s)||t.category.toLowerCase().includes(s)); }
    return txs;
  }, [periodTxs, tab, search, sortDir]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    const today = new Date().toISOString().split('T')[0];
    const yest  = new Date(Date.now()-86400000).toISOString().split('T')[0];
    filtered.forEach(tx => {
      const label = tx.date===today ? 'Hoje' : tx.date===yest ? 'Ontem' : new Date(tx.date+'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
      if (!g[label]) g[label]=[];
      g[label].push(tx);
    });
    return g;
  }, [filtered]);

  async function handleTogglePaid(tx: Transaction) {
    setTogglingId(tx.id);
    try {
      await toggleTransactionPaid(tx.id, !tx.paid);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  const paidLabel = (tx: Transaction) =>
    tx.type === 'income'
      ? tx.paid ? 'Recebido' : 'A receber'
      : tx.paid ? 'Pago' : 'Em aberto';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>Lançamentos</h1>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} transações encontradas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCsvOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
              <FileUp className="h-3.5 w-3.5" /> Importar CSV
            </button>
            <button onClick={() => { setEditId(null); setFormOpen(true); }}
              className="btn-novux flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl">
              <Plus className="h-3.5 w-3.5" /> Novo Lançamento
            </button>
          </div>
        </div>
      </motion.div>

      {/* Month totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Receitas do Mês',  v: fmt(monthTotals.income),                     c: '#10B981', Icon: TrendingUp   },
          { l: 'Despesas do Mês',  v: fmt(monthTotals.expense),                    c: '#EF4444', Icon: TrendingDown },
          { l: 'Saldo do Mês',     v: fmt(monthTotals.income-monthTotals.expense), c: monthTotals.income>=monthTotals.expense?'#0EA5E9':'#EF4444', Icon: ArrowUpDown },
        ].map((s,i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}
            className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <s.Icon className="h-3.5 w-3.5" style={{ color: s.c }} />
              <span className="text-[11px] text-muted-foreground">{s.l}</span>
            </div>
            <p className="text-lg font-bold mono" style={{ color: s.c, fontFamily:'Outfit,sans-serif' }}>{s.v}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="Buscar descrição ou categoria..." value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors" />
        </div>
        <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
          {(['todos','receitas','despesas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize transition-all ${tab===t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t==='todos'?'Todos':t==='receitas'?'↑ Receitas':'↓ Despesas'}
            </button>
          ))}
        </div>
        <button onClick={() => setSortDir(d=>d==='desc'?'asc':'desc')}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortDir==='desc' ? 'Recente' : 'Antigo'}
        </button>
      </div>

      {/* List */}
      <AnimatePresence>
        {Object.entries(grouped).map(([date, txs]) => (
          <motion.div key={date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">{date}</span>
              <div className="flex-1 h-px bg-border" />
              <span className={`text-[11px] font-semibold mono ${txs.reduce((s,t)=>t.type==='income'?s+t.value:s-t.value,0)>=0?'text-success':'text-destructive'}`}>
                {txs.reduce((s,t)=>t.type==='income'?s+t.value:s-t.value,0)>=0?'+':''}{fmt(Math.abs(txs.reduce((s,t)=>t.type==='income'?s+t.value:s-t.value,0)))}
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {txs.map((tx, i) => {
                const Icon = CAT_ICONS[tx.category] ?? Package;
                const isPaid = tx.paid ?? false;
                const isToggling = togglingId === tx.id;
                return (
                  <motion.div key={tx.id} layout
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/20 transition-colors group ${i<txs.length-1?'border-b border-border/50':''}`}>
                    {/* Icon */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type==='income'?'bg-success-muted':'bg-alert-muted'}`}>
                      <Icon className={`h-4 w-4 ${tx.type==='income'?'text-success':'text-destructive'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{tx.category}</span>
                        {tx.tags && tx.tags.length > 0 && (
                          <>
                            <span className="text-[10px] text-muted-foreground/40">·</span>
                            {tx.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary/80">
                                #{tag}
                              </span>
                            ))}
                            {tx.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{tx.tags.length - 3}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <button
                      onClick={() => handleTogglePaid(tx)}
                      disabled={isToggling}
                      title={isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
                      className={`hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all shrink-0 ${
                        isPaid
                          ? 'bg-success-muted border-success/30 text-success hover:opacity-70'
                          : 'bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}>
                      {isPaid
                        ? <><CheckCircle2 className="h-3 w-3" />{paidLabel(tx)}</>
                        : <><Circle className="h-3 w-3" />{paidLabel(tx)}</>}
                    </button>

                    {/* Value */}
                    <span className={`text-sm font-bold mono shrink-0 ${tx.type==='income'?'text-success':'text-destructive'} ${!isPaid?'opacity-60':''}`}>
                      {tx.type==='income'?'+':'−'}{fmt(tx.value)}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(tx.id); setFormOpen(true); }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteTransaction(tx.id)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-alert-muted transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      )}

      <TransactionForm open={formOpen} onClose={() => { setFormOpen(false); setEditId(null); }} editId={editId} />
      <CSVImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
    </div>
  );
}
