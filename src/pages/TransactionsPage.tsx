import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { Search, Plus, Trash2, Pencil, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { TransactionForm } from '@/components/TransactionForm';

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CAT_ICONS: Record<string, string> = {
  'Alimentação':'🍽️','Transporte':'🚗','Moradia':'🏠','Lazer':'🎮','Saúde':'💊',
  'Educação':'📚','Salário':'💼','Investimentos':'📈','Freelance':'💻',
  'Assinaturas':'📱','Outros':'📦',
};

export default function TransactionsPage() {
  const { transactions, deleteTransaction } = useFinance();
  const [search, setSearch] = useState('');
  const [tab, setTab]       = useState<'todos' | 'receitas' | 'despesas'>('todos');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);

  const now = new Date();
  const monthTotals = useMemo(() => {
    const m = transactions.filter(t => {
      const d = new Date(t.date); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    });
    return {
      income:  m.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0),
      expense: m.filter(t=>t.type==='expense').reduce((s,t)=>s+t.value,0),
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    let txs = [...transactions].sort((a,b) =>
      sortDir==='desc' ? new Date(b.date).getTime()-new Date(a.date).getTime() : new Date(a.date).getTime()-new Date(b.date).getTime()
    );
    if (tab==='receitas') txs = txs.filter(t=>t.type==='income');
    if (tab==='despesas') txs = txs.filter(t=>t.type==='expense');
    if (search) { const s=search.toLowerCase(); txs=txs.filter(t=>t.description.toLowerCase().includes(s)||t.category.toLowerCase().includes(s)); }
    return txs;
  }, [transactions, tab, search, sortDir]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    const today = new Date().toISOString().split('T')[0];
    const yest  = new Date(Date.now()-86400000).toISOString().split('T')[0];
    filtered.forEach(tx => {
      let label = tx.date===today ? 'Hoje' : tx.date===yest ? 'Ontem' : new Date(tx.date+'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
      if (!g[label]) g[label]=[];
      g[label].push(tx);
    });
    return g;
  }, [filtered]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>Lançamentos</h1>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} transações encontradas</p>
          </div>
          <button onClick={() => { setEditId(null); setFormOpen(true); }}
            className="btn-novux flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl">
            <Plus className="h-3.5 w-3.5" /> Novo Lançamento
          </button>
        </div>
      </motion.div>

      {/* Month totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Receitas do Mês',  v: fmt(monthTotals.income),                  c: 'hsl(161,100%,45%)', Icon: TrendingUp   },
          { l: 'Despesas do Mês',  v: fmt(monthTotals.expense),                 c: 'hsl(4,86%,68%)',   Icon: TrendingDown },
          { l: 'Saldo do Mês',     v: fmt(monthTotals.income-monthTotals.expense), c: monthTotals.income>=monthTotals.expense?'hsl(193,100%,50%)':'hsl(4,86%,68%)', Icon: ArrowUpDown },
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
              {txs.map((tx, i) => (
                <motion.div key={tx.id} layout
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/20 transition-colors group ${i<txs.length-1?'border-b border-border/50':''}`}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-base shrink-0 ${tx.type==='income'?'bg-success-muted':'bg-alert-muted'}`}>
                    {CAT_ICONS[tx.category] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tx.category}</p>
                  </div>
                  <span className={`text-sm font-bold mono ${tx.type==='income'?'text-success':'text-destructive'}`}>
                    {tx.type==='income'?'+':'−'}{fmt(tx.value)}
                  </span>
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
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      )}

      <TransactionForm open={formOpen} onClose={() => { setFormOpen(false); setEditId(null); }} editId={editId} />
    </div>
  );
}
