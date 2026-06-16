import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { usePeriod } from '@/contexts/PeriodContext';
import {
  Search, Plus, Trash2, Pencil, TrendingUp, TrendingDown, ArrowUpDown,
  CheckCircle2, Circle, FileUp, Package, SlidersHorizontal, X, ChevronDown,
  BadgeCheck, Clock, AlertCircle, CircleDollarSign,
} from 'lucide-react';
import { TransactionForm, CAT_ICONS, EXPENSE_CATS, INCOME_CATS } from '@/components/TransactionForm';
import { CSVImportModal } from '@/components/CSVImportModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PaymentDetailsModal, PaymentDetails } from '@/components/PaymentDetailsModal';
import { Transaction, paymentMethodLabel } from '@/lib/types';
import { toast } from 'sonner';
import { useReportSummary, usePaginatedTransactions, useTransactionTags, toLocalDate } from '@/hooks/useReports';

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

const fmt     = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSigned = (v: number) => `${v < 0 ? '-' : ''}${fmt(v)}`;


export default function TransactionsPage() {
  const { deleteTransaction, updateTransactionFields } = useFinance();
  const { getRange } = usePeriod();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]       = useState('');     // valor com debounce → enviado ao servidor
  const [searchOpen, setSearchOpen] = useState(false);
  const [tab, setTab]             = useState<'todos' | 'receitas' | 'despesas'>('todos');
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc');
  const [formOpen, setFormOpen]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [csvOpen, setCsvOpen]     = useState(false);
  const [paymentTx, setPaymentTx]       = useState<Transaction | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

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

  // Debounce da busca textual — evita uma requisição por tecla digitada
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { start, end } = getRange();
  const s = toLocalDate(start);
  const e = toLocalDate(end);

  // Catálogo de tags vindo do servidor (não depende de carregar o histórico)
  const tagsQuery = useTransactionTags();
  const availableTags = tagsQuery.data ?? [];

  const hasActiveFilter = activeCats.length > 0 || activeTags.length > 0 || tab !== 'todos';

  // Totais do período (regime de caixa) — agregados server-side (#4 Etapa B)
  const summaryQuery = useReportSummary(s, e);
  const sum = summaryQuery.data?.summary;
  const monthTotals = {
    income:    sum?.totalIncome      ?? 0,
    expense:   sum?.totalExpenses    ?? 0,
    received:  sum?.realizedIncome   ?? 0,
    toReceive: sum?.pendingIncome    ?? 0,
    paid:      sum?.realizedExpenses ?? 0,
    pending:   sum?.pendingExpenses  ?? 0,
  };

  // Lista paginada server-side: período + tipo + categorias + tags + busca + ordenação.
  // O servidor já filtra e ordena; o cliente apenas agrupa por data o que foi carregado.
  const listQuery = usePaginatedTransactions({
    startDate: s,
    endDate:   e,
    type:       tab === 'receitas' ? 'income' : tab === 'despesas' ? 'expense' : undefined,
    categories: activeCats.length ? activeCats.join(',') : undefined,
    tags:       activeTags.length ? activeTags.join(',') : undefined,
    search:     search || undefined,
    sort:       sortDir,
  });

  const filtered = useMemo(
    () => listQuery.data?.pages.flatMap(p => p.data) ?? [],
    [listQuery.data],
  );
  const totalFound = listQuery.data?.pages[0]?.total ?? 0;

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

  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(pendingDelete.id);
      toast.success('Transação excluída');
      setPendingDelete(null);
    } catch {
      toast.error('Erro ao excluir transação. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  // Confirma o pagamento/recebimento (marca como pago + forma/data/observações)
  async function confirmPayment(details: PaymentDetails) {
    if (!paymentTx) return;
    setPaymentSaving(true);
    try {
      await updateTransactionFields(paymentTx.id, {
        paid: true,
        paymentMethod: details.paymentMethod,
        paidAt: details.paidAt,
        paymentNotes: details.paymentNotes,
      });
      toast.success(paymentTx.type === 'income' ? 'Recebimento registrado' : 'Pagamento registrado');
      setPaymentTx(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setPaymentSaving(false);
    }
  }

  // Desfaz o pagamento (volta para em aberto e limpa forma/data/observações)
  async function unmarkPayment() {
    if (!paymentTx) return;
    setPaymentSaving(true);
    try {
      await updateTransactionFields(paymentTx.id, {
        paid: false,
        paymentMethod: null,
        paidAt: null,
        paymentNotes: null,
      });
      toast.success('Marcado como em aberto');
      setPaymentTx(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar. Tente novamente.');
    } finally {
      setPaymentSaving(false);
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
            <p className="text-xs text-muted-foreground mt-1">{totalFound} transações encontradas</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Pesquisa inline */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <input autoFocus value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearchInput(''))}
                    placeholder="Pesquisar..."
                    className="w-full rounded-xl border border-primary/40 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none" />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Botão lupa */}
            <button onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearchInput(''); }}
              title="Pesquisar" aria-label="Pesquisar" className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all ${searchOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
              <Search className="h-4 w-4" />
            </button>
            {/* Botão filtro */}
            <button onClick={openFilter} title="Filtros" aria-label="Filtros"
              className={`relative h-9 w-9 rounded-xl border flex items-center justify-center transition-all ${hasActiveFilter ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilter && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />}
            </button>
            {/* CSV + Novo */}
            <button onClick={() => setCsvOpen(true)} title="Importar CSV" aria-label="Importar CSV"
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

      {/* Totais do período — 3 cols com breakdown de pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Receitas */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: '#19D38A' }} />
            <span className="text-[11px] text-muted-foreground">Receitas do Mês</span>
          </div>
          <p className="text-lg font-bold mb-2" style={{ color: '#19D38A', fontFamily:'Outfit,sans-serif' }}>{fmt(monthTotals.income)}</p>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-success"><BadgeCheck className="h-3 w-3" />{fmt(monthTotals.received)} recebido</span>
            <span className="flex items-center gap-1 text-warning"><Clock className="h-3 w-3" />{fmt(monthTotals.toReceive)} a receber</span>
          </div>
        </motion.div>

        {/* Despesas */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingDown className="h-3.5 w-3.5 shrink-0" style={{ color: '#FF5A5F' }} />
            <span className="text-[11px] text-muted-foreground">Despesas do Mês</span>
          </div>
          <p className="text-lg font-bold mb-2" style={{ color: '#FF5A5F', fontFamily:'Outfit,sans-serif' }}>{fmt(monthTotals.expense)}</p>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-primary"><CircleDollarSign className="h-3 w-3" />{fmt(monthTotals.paid)} pago</span>
            <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" />{fmt(monthTotals.pending)} em aberto</span>
          </div>
        </motion.div>

        {/* Saldo */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" style={{ color: monthTotals.income>=monthTotals.expense?'#16C7FF':'#FF5A5F' }} />
            <span className="text-[11px] text-muted-foreground">Saldo do Mês</span>
          </div>
          <p className="text-lg font-bold mb-2" style={{ color: monthTotals.income>=monthTotals.expense?'#16C7FF':'#FF5A5F', fontFamily:'Outfit,sans-serif' }}>
            {fmtSigned(monthTotals.income-monthTotals.expense)}
          </p>
          <div className="flex gap-2 text-[10px]">
            <span className="text-foreground/70">Real: {fmtSigned(monthTotals.received-monthTotals.paid)}</span>
            <span className={(monthTotals.income-monthTotals.expense) < 0 ? 'text-destructive' : 'text-foreground/70'}>
              Proj: {fmtSigned(monthTotals.income-monthTotals.expense)}
            </span>
          </div>
        </motion.div>
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

                    {/* Status badge — abre o modal de pagamento/recebimento */}
                    <button
                      onClick={() => setPaymentTx(tx)}
                      title={isPaid ? 'Editar pagamento' : (tx.type === 'income' ? 'Registrar recebimento' : 'Registrar pagamento')}
                      aria-label={isPaid ? 'Editar pagamento' : 'Registrar pagamento'}
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all shrink-0 ${
                        isPaid
                          ? 'bg-success-muted border-success/30 text-success hover:opacity-70'
                          : 'bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}>
                      {isPaid
                        ? <><CheckCircle2 className="h-3 w-3" />{paidLabel(tx)}{tx.paymentMethod ? ` · ${paymentMethodLabel(tx.paymentMethod)}` : ''}</>
                        : <><Circle className="h-3 w-3" />{paidLabel(tx)}</>}
                    </button>

                    {/* Value */}
                    <span className={`text-sm font-bold mono shrink-0 ${tx.type==='income'?'text-success':'text-destructive'} ${!isPaid?'opacity-60':''}`}>
                      {tx.type==='income'?'+':'−'}{fmt(tx.value)}
                    </span>

                    {/* Actions — visíveis em touch (mobile); revelam no hover só no desktop */}
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditId(tx.id); setFormOpen(true); }}
                        aria-label="Editar transação"
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setPendingDelete(tx)}
                        aria-label="Excluir transação"
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

      {/* Carregar mais — paginação server-side */}
      {listQuery.hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => listQuery.fetchNextPage()}
            disabled={listQuery.isFetchingNextPage}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-wait">
            {listQuery.isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}

      {filtered.length === 0 && !listQuery.isLoading && (
        <div className="text-center py-16">
          <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      )}

      <TransactionForm open={formOpen} onClose={() => { setFormOpen(false); setEditId(null); }} editId={editId} />
      <CSVImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Excluir transação?"
        description={pendingDelete ? `"${pendingDelete.description || pendingDelete.category}" será excluída permanentemente. Esta ação não pode ser desfeita.` : undefined}
        loading={deleting}
        onConfirm={confirmDelete}
      />
      <PaymentDetailsModal
        open={!!paymentTx}
        type={paymentTx?.type ?? 'expense'}
        isPaid={paymentTx?.paid ?? false}
        initial={paymentTx ? { paymentMethod: paymentTx.paymentMethod, paidAt: paymentTx.paidAt, paymentNotes: paymentTx.paymentNotes } : undefined}
        loading={paymentSaving}
        onConfirm={confirmPayment}
        onUnmark={unmarkPayment}
        onClose={() => { if (!paymentSaving) setPaymentTx(null); }}
      />
    </div>
  );
}
