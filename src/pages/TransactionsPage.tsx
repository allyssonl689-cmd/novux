import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { usePeriod } from '@/contexts/PeriodContext';
import {
  Search, Plus, Trash2, Pencil, TrendingUp, TrendingDown, ArrowUpDown,
  CheckCircle2, Circle, FileUp, Package, SlidersHorizontal, X, ChevronDown,
} from 'lucide-react';
import { TransactionForm, CAT_ICONS, EXPENSE_CATS, INCOME_CATS } from '@/components/TransactionForm';
import { CSVImportModal } from '@/components/CSVImportModal';
import { Transaction } from '@/lib/types';

const ALL_CATS = [...new Set([...EXPENSE_CATS, ...INCOME_CATS])];

/* ── Lista suspensa com múltipla seleção ── */
function MultiSelectFilter({
  label, options, selected, onChange, placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-[10px] text-primary hover:opacity-80 transition-opacity">
            Limpar ({selected.length})
          </button>
        )}
      </div>

      {/* Trigger */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-left transition-all hover:border-primary/30">
        <span className="text-muted-foreground truncate">
          {selected.length === 0
            ? placeholder
            : selected.length === 1
              ? selected[0]
              : `${selected.length} selecionados`}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Lista */}
      {open && (
        <div className="mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Busca interna */}
          <div className="p-2 border-b border-border/60">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Buscar em ${label.toLowerCase()}...`}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary outline-none focus:border-primary/40 transition-colors text-foreground placeholder:text-muted-foreground" />
          </div>
          {/* Opções */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-4">Nenhum resultado</p>
            )}
            {filtered.map(opt => {
              const sel = selected.includes(opt);
              return (
                <button key={opt} onClick={() => toggle(opt)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left transition-colors hover:bg-secondary/60 ${sel ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {/* Checkbox visual */}
                  <span className="h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-all"
                    style={sel
                      ? { background: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }
                      : { borderColor: 'hsl(var(--border))' }}>
                    {sel && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {/* Selecionar todos */}
          {filtered.length > 1 && (
            <div className="border-t border-border/60 p-2">
              <button onClick={() => {
                const allSelected = filtered.every(o => selected.includes(o));
                if (allSelected) onChange(selected.filter(s => !filtered.includes(s)));
                else onChange([...new Set([...selected, ...filtered])]);
              }} className="w-full text-[10px] text-primary hover:opacity-80 transition-opacity text-center py-1">
                {filtered.every(o => selected.includes(o)) ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


export default function TransactionsPage() {
  const { transactions, deleteTransaction, toggleTransactionPaid } = useFinance();
  const { getRange } = usePeriod();
  const [search, setSearch]       = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [tab, setTab]             = useState<'todos' | 'receitas' | 'despesas'>('todos');
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc');
  const [formOpen, setFormOpen]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [csvOpen, setCsvOpen]     = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Filtro lateral ────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  // Filtros pendentes (no painel, não aplicados ainda)
  const [pendingCats, setPendingCats]   = useState<string[]>([]);
  const [pendingTags, setPendingTags]   = useState<string[]>([]);
  const [pendingType, setPendingType]   = useState<'todos'|'receitas'|'despesas'>('todos');
  // Filtros aplicados
  const [activeCats, setActiveCats]     = useState<string[]>([]);
  const [activeTags, setActiveTags]     = useState<string[]>([]);

  function openFilter() {
    setPendingCats(activeCats);
    setPendingTags(activeTags);
    setPendingType(tab);
    setFilterOpen(true);
  }
  function applyFilter() {
    setActiveCats(pendingCats);
    setActiveTags(pendingTags);
    setTab(pendingType);
    setFilterOpen(false);
  }
  function clearFilter() {
    setPendingCats([]); setPendingTags([]); setPendingType('todos');
    setActiveCats([]); setActiveTags([]); setTab('todos');
    setFilterOpen(false);
  }

  // Tags únicas disponíveis nas transações
  const availableTags = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach(t => (t.tags ?? []).forEach(tag => s.add(tag)));
    return [...s].sort();
  }, [transactions]);

  const hasActiveFilter = activeCats.length > 0 || activeTags.length > 0 || tab !== 'todos';

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
    if (activeCats.length > 0) txs = txs.filter(t => activeCats.includes(t.category));
    if (activeTags.length > 0) txs = txs.filter(t => (t.tags ?? []).some(tag => activeTags.includes(tag)));
    if (search) { const s=search.toLowerCase(); txs=txs.filter(t=>t.description.toLowerCase().includes(s)||t.category.toLowerCase().includes(s)); }
    return txs;
  }, [periodTxs, tab, search, sortDir, activeCats, activeTags]);

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lançamentos</h1>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} transações encontradas</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Pesquisa inline */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearch(''))}
                    placeholder="Pesquisar..."
                    className="w-full rounded-xl border border-primary/40 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none" />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Botão lupa */}
            <button onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearch(''); }}
              title="Pesquisar" className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all ${searchOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
              <Search className="h-4 w-4" />
            </button>
            {/* Botão filtro */}
            <button onClick={openFilter} title="Filtros"
              className={`relative h-9 w-9 rounded-xl border flex items-center justify-center transition-all ${hasActiveFilter ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilter && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />}
            </button>
            {/* CSV + Novo */}
            <button onClick={() => setCsvOpen(true)} title="Importar CSV"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
              <FileUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setEditId(null); setFormOpen(true); }}
              className="btn-novux flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Painel lateral de filtro (slide-in da direita) ── */}
      <AnimatePresence>
        {filterOpen && (
          <>
            {/* Overlay */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setFilterOpen(false)} />
            {/* Painel */}
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-card border-l border-border flex flex-col shadow-2xl">
              {/* Header do painel */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-bold text-foreground">Filtros</h2>
                <button onClick={() => setFilterOpen(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Corpo */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Tipo */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Tipo</p>
                  <div className="flex gap-2">
                    {(['todos','receitas','despesas'] as const).map(t => (
                      <button key={t} onClick={() => setPendingType(t)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${pendingType===t ? 'text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground'}`}
                        style={pendingType===t ? { background: 'hsl(var(--primary))' } : {}}>
                        {t === 'todos' ? 'Todos' : t === 'receitas' ? 'Receitas' : 'Despesas'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categorias — lista suspensa com múltipla seleção */}
                <MultiSelectFilter
                  label="Categorias"
                  options={ALL_CATS}
                  selected={pendingCats}
                  onChange={setPendingCats}
                  placeholder="Selecionar categorias..."
                />

                {/* Tags — lista suspensa com múltipla seleção */}
                {availableTags.length > 0 && (
                  <MultiSelectFilter
                    label="Tags"
                    options={availableTags.map(t => `#${t}`)}
                    selected={pendingTags.map(t => `#${t}`)}
                    onChange={vals => setPendingTags(vals.map(v => v.replace(/^#/, '')))}
                    placeholder="Selecionar tags..."
                  />
                )}
              </div>

              {/* Rodapé — Limpar + Aplicar */}
              <div className="flex gap-2 p-4 border-t border-border">
                <button onClick={clearFilter}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
                  Limpar tudo
                </button>
                <button onClick={applyFilter}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                  Aplicar filtros
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Month totals — 1 col mobile, 3 cols sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { l: 'Receitas do Mês',  v: fmt(monthTotals.income),                     c: '#19D38A', Icon: TrendingUp   },
          { l: 'Despesas do Mês',  v: fmt(monthTotals.expense),                    c: '#FF5A5F', Icon: TrendingDown },
          { l: 'Saldo do Mês',     v: fmt(monthTotals.income-monthTotals.expense), c: monthTotals.income>=monthTotals.expense?'#16C7FF':'#FF5A5F', Icon: ArrowUpDown },
        ].map((s,i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}
            className="rounded-xl border border-border bg-card p-3.5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
            <div className="flex items-center gap-2">
              <s.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.c }} />
              <span className="text-[11px] text-muted-foreground">{s.l}</span>
            </div>
            <p className="text-base sm:text-lg font-bold mono ml-auto sm:ml-0" style={{ color: s.c, fontFamily:'Outfit,sans-serif' }}>{s.v}</p>
          </motion.div>
        ))}
      </div>

      {/* Sort + filtros ativos */}
      <div className="flex items-center gap-2">
        <button onClick={() => setSortDir(d=>d==='desc'?'asc':'desc')}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortDir==='desc' ? 'Mais recente' : 'Mais antigo'}
        </button>
        {/* Chips dos filtros ativos */}
        {tab !== 'todos' && (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}>
            {tab === 'receitas' ? '↑ Receitas' : '↓ Despesas'}
            <button onClick={() => setTab('todos')}><X className="h-2.5 w-2.5" /></button>
          </span>
        )}
        {activeCats.slice(0,2).map(c => (
          <span key={c} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border border-border text-muted-foreground">
            {c} <button onClick={() => setActiveCats(p => p.filter(x => x !== c))}><X className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        {activeCats.length > 2 && <span className="text-[10px] text-muted-foreground">+{activeCats.length-2}</span>}
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
