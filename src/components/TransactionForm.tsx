import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, TransactionType, RecurrenceType } from '@/lib/types';
import { X, TrendingUp, TrendingDown, Check, ChevronDown, Upload, RefreshCw } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; editId?: string | null; }

const EXPENSE_CATS = ['Alimentação','Transporte','Moradia','Lazer','Saúde','Educação','Assinaturas','Cartão','Vestuário','Saúde/Bem-estar','Outros'];
const INCOME_CATS  = ['Salário','Freelance','Investimentos','Presente','Reembolso','Outros'];
const CAT_ICONS: Record<string,string> = {
  'Alimentação':'🍽️','Transporte':'🚗','Moradia':'🏠','Lazer':'🎮','Saúde':'💊',
  'Educação':'📚','Salário':'💼','Investimentos':'📈','Freelance':'💻','Assinaturas':'📱',
  'Cartão':'💳','Vestuário':'👕','Saúde/Bem-estar':'🧘','Outros':'📦','Presente':'🎁','Reembolso':'↩️',
};
const RECURRENCE_OPTS: { value: RecurrenceType; label: string }[] = [
  { value: 'none',    label: 'Não repete' },
  { value: 'daily',   label: 'Diariamente' },
  { value: 'weekly',  label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
  { value: 'yearly',  label: 'Anualmente' },
];

export function TransactionForm({ open, onClose, editId }: Props) {
  const { transactions, addTransaction, updateTransaction, addTransactions } = useFinance();
  const editing = editId ? transactions.find(t => t.id === editId) : undefined;
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab,  setTab]  = useState<'manual'|'import'>('manual');
  const [type, setType] = useState<TransactionType>(editing?.type || 'expense');
  const [value, setValue]           = useState(editing?.value?.toString() || '');
  const [category, setCategory]     = useState(editing?.category || '');
  const [date, setDate]             = useState(editing?.date || new Date().toISOString().split('T')[0]);
  const [desc, setDesc]             = useState(editing?.description || '');
  const [notes, setNotes]           = useState(editing?.notes || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(editing?.recurrence || 'none');
  const [recMonths, setRecMonths]   = useState(editing?.recurrenceMonths || 3);
  const [errors, setErrors]         = useState<Record<string,string>>({});
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type); setValue(editing.value.toString());
      setCategory(editing.category); setDate(editing.date);
      setDesc(editing.description); setNotes(editing.notes || '');
      setRecurrence(editing.recurrence || 'none');
      setRecMonths(editing.recurrenceMonths || 3);
    } else {
      setType('expense'); setValue(''); setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setDesc(''); setNotes(''); setRecurrence('none'); setRecMonths(3);
    }
    setErrors({}); setTab('manual'); setImportResult('');
  }, [editId, open]);

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  function validate() {
    const e: Record<string,string> = {};
    if (!value || isNaN(Number(value)) || Number(value) <= 0) e.value = 'Valor inválido';
    if (!category) e.category = 'Selecione uma categoria';
    if (!desc.trim()) e.desc = 'Informe uma descrição';
    setErrors(e); return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const baseData = {
      type, value: parseFloat(value), category,
      date, description: desc.trim(),
      notes: notes.trim() || undefined,
      recurrence: recurrence === 'none' ? undefined : recurrence,
      recurrenceMonths: recurrence !== 'none' && recurrence === 'monthly' ? recMonths : undefined,
    };

    if (editing) {
      updateTransaction({ ...baseData, id: editing.id });
    } else if (recurrence === 'monthly' && recMonths > 1) {
      // Generate recurring transactions
      const txList = Array.from({ length: recMonths }, (_, i) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + i);
        return { ...baseData, date: d.toISOString().split('T')[0], isRecurring: i > 0 };
      });
      addTransactions(txList);
    } else {
      addTransaction(baseData);
    }
    onClose();
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const imported: Omit<Transaction,'id'>[] = [];
      let skipped = 0;

      // Auto-detect separator
      const sep = lines[0]?.includes(';') ? ';' : ',';
      const dataLines = lines[0]?.toLowerCase().includes('data') ? lines.slice(1) : lines;

      for (const line of dataLines) {
        const cols = line.split(sep).map(c => c.trim().replace(/"/g,''));
        if (cols.length < 3) { skipped++; continue; }

        const [dateCol, descCol, valueCol, catCol, typeCol] = cols;
        const parsedVal = parseFloat(valueCol?.replace(/[R$\s.]/g,'').replace(',','.'));
        if (isNaN(parsedVal) || !dateCol || !descCol) { skipped++; continue; }

        imported.push({
          type: typeCol?.toLowerCase().includes('receit') || parsedVal > 0 ? 'income' : 'expense',
          value: Math.abs(parsedVal),
          category: catCol || 'Outros',
          date: dateCol.includes('/') ? dateCol.split('/').reverse().join('-') : dateCol,
          description: descCol,
        });
      }

      if (imported.length > 0) {
        addTransactions(imported);
        setImportResult(`✅ ${imported.length} transações importadas${skipped > 0 ? ` (${skipped} linhas ignoradas)` : ''}.`);
      } else {
        setImportResult('⚠️ Nenhuma transação encontrada. Verifique o formato do arquivo.');
      }
    } catch {
      setImportResult('❌ Erro ao ler o arquivo. Tente um CSV simples.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const accentColor = type === 'income' ? 'hsl(161 90% 42%)' : 'hsl(343 90% 62%)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-lg rounded-2xl border border-border bg-card overflow-hidden"
            style={{ boxShadow: '0 24px 80px hsl(0 0% 0% / 0.45)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${accentColor}22` }}>
                  {type === 'income'
                    ? <TrendingUp className="h-4 w-4" style={{ color: accentColor }} />
                    : <TrendingDown className="h-4 w-4" style={{ color: accentColor }} />}
                </div>
                <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {editing ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
              </div>
              <button onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            {!editing && (
              <div className="flex border-b border-border">
                {(['manual', 'import'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-all ${tab === t ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t === 'manual' ? '✏️ Manual' : '📂 Importar CSV / Excel'}
                  </button>
                ))}
              </div>
            )}

            {/* Import tab */}
            {tab === 'import' && (
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground mb-1">Arraste ou selecione o arquivo</p>
                  <p className="text-xs text-muted-foreground mb-4">Suporta CSV e Excel (.csv, .xlsx) exportados do seu banco</p>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileImport}
                    className="hidden" />
                  <button onClick={() => fileRef.current?.click()}
                    className="btn-novux px-6 py-2 text-xs rounded-xl inline-flex items-center gap-2">
                    {importing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {importing ? 'Importando...' : 'Selecionar arquivo'}
                  </button>
                </div>
                {importResult && (
                  <p className="text-xs text-center font-medium" style={{ color: importResult.startsWith('✅') ? 'hsl(161 90% 42%)' : 'hsl(343 90% 62%)' }}>
                    {importResult}
                  </p>
                )}
                <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Formato esperado (CSV):</p>
                  <p className="font-mono text-[10px]">Data, Descrição, Valor, Categoria, Tipo</p>
                  <p className="font-mono text-[10px]">2025-05-01, Supermercado, -250.00, Alimentação, despesa</p>
                </div>
                <button onClick={onClose}
                  className="w-full rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                  Fechar
                </button>
              </div>
            )}

            {/* Manual tab */}
            {tab === 'manual' && (
              <>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Type toggle */}
                  <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
                    {(['expense','income'] as TransactionType[]).map(t => (
                      <button key={t} onClick={() => { setType(t); setCategory(''); }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all"
                        style={type === t ? {
                          background: t === 'income' ? 'hsl(161 90% 42% / 0.18)' : 'hsl(343 90% 62% / 0.18)',
                          color: t === 'income' ? 'hsl(161 80% 55%)' : 'hsl(343 80% 68%)',
                          border: `1px solid ${t === 'income' ? 'hsl(161 90% 42% / 0.4)' : 'hsl(343 90% 62% / 0.4)'}`,
                        } : { color: 'hsl(var(--muted-foreground))' }}>
                        {t === 'expense'
                          ? <><TrendingDown className="h-3.5 w-3.5" />Despesa</>
                          : <><TrendingUp className="h-3.5 w-3.5" />Receita</>}
                      </button>
                    ))}
                  </div>

                  {/* Value */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Valor (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                      <input type="number" step="0.01" min="0" placeholder="0,00"
                        value={value} onChange={e => setValue(e.target.value)}
                        className={`w-full rounded-xl border pl-10 pr-4 py-3 text-lg font-bold bg-secondary outline-none transition-all ${errors.value ? 'border-destructive' : 'border-border focus:border-primary/50'}`}
                        style={{ color: value ? accentColor : undefined }} />
                    </div>
                    {errors.value && <p className="text-[11px] text-destructive mt-1">{errors.value}</p>}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Categoria</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {cats.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-medium transition-all ${
                            category === c ? 'text-[hsl(232_35%_8%)] border-transparent' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                          }`}
                          style={category === c ? { background: 'linear-gradient(135deg, #00D4FF, #7B6FFF)' } : {}}>
                          <span className="text-base leading-none">{CAT_ICONS[c] || '📦'}</span>
                          <span className="truncate w-full text-center leading-tight">{c}</span>
                        </button>
                      ))}
                    </div>
                    {errors.category && <p className="text-[11px] text-destructive mt-1">{errors.category}</p>}
                  </div>

                  {/* Date + Description */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Data</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Descrição *</label>
                      <input type="text" placeholder="Ex: Supermercado" value={desc}
                        onChange={e => setDesc(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-xs bg-secondary outline-none transition-all text-foreground ${errors.desc ? 'border-destructive' : 'border-border focus:border-primary/50'}`} />
                    </div>
                  </div>
                  {errors.desc && <p className="text-[11px] text-destructive -mt-2">{errors.desc}</p>}

                  {/* Notes */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                      Observações <span className="text-muted-foreground/50">(opcional)</span>
                    </label>
                    <textarea placeholder="Anotações, detalhes, número do comprovante..." value={notes}
                      onChange={e => setNotes(e.target.value)} rows={2}
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors resize-none" />
                  </div>

                  {/* Recurrence */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">Recorrência</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {RECURRENCE_OPTS.map(opt => (
                        <button key={opt.value} onClick={() => setRecurrence(opt.value)}
                          className={`rounded-lg border px-2 py-2 text-[10px] font-medium transition-all ${
                            recurrence === opt.value ? 'text-[hsl(232_35%_8%)] border-transparent' : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                          style={recurrence === opt.value ? { background: 'linear-gradient(135deg, #00D4FF, #7B6FFF)' } : {}}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {recurrence === 'monthly' && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Repetir por</span>
                        <input type="number" min={2} max={60} value={recMonths}
                          onChange={e => setRecMonths(Number(e.target.value))}
                          className="w-20 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs text-foreground text-center outline-none focus:border-primary/50" />
                        <span className="text-xs text-muted-foreground">meses</span>
                        <span className="text-[10px] text-primary font-medium">
                          = {recMonths} lançamentos
                        </span>
                      </div>
                    )}
                    {recurrence !== 'none' && recurrence !== 'monthly' && (
                      <p className="text-[11px] text-muted-foreground">
                        Lançamento será marcado como recorrente {RECURRENCE_OPTS.find(o => o.value === recurrence)?.label.toLowerCase()}.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button onClick={onClose}
                    className="flex-1 rounded-xl border border-border py-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit}
                    className="btn-novux flex-1 py-3 text-xs rounded-xl flex items-center justify-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    {editing ? 'Salvar alterações' : recurrence === 'monthly' && recMonths > 1 ? `Criar ${recMonths} lançamentos` : 'Adicionar'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
