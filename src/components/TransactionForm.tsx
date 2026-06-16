import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, TransactionType, RecurrenceType, CURRENCIES, paymentMethodsFor } from '@/lib/types';
import {
  X, TrendingUp, TrendingDown, Check, Upload, RefreshCw,
  Utensils, Car, Home, Smile, HeartPulse, BookOpen, Briefcase,
  BarChart2, Laptop, Smartphone, CreditCard, Shirt, Activity,
  Package, Gift, RotateCcw, CheckCircle2, Circle, LucideIcon,
  Tag, Paperclip, DollarSign, Plane, PawPrint, Banknote,
  Shield, Receipt, Heart, ChefHat, Tv, Phone, Building2,
} from 'lucide-react';
import { transactionService } from '@/services/transactionService';
import { toast } from 'sonner';

interface Props { open: boolean; onClose: () => void; editId?: string | null }

export const EXPENSE_CATS = [
  'Alimentação','Restaurantes','Transporte','Moradia','Lazer','Viagens',
  'Saúde','Saúde Mental','Educação','Assinaturas','Streaming','Telefone',
  'Cartão','Vestuário','Pets','Empréstimos','Seguros','Impostos',
  'Doações','Presente','Reembolso','Outros',
];
export const INCOME_CATS = ['Salário','Freelance','Investimentos','Aluguel recebido','Presente','Reembolso','Outros'];

export const CAT_ICONS: Record<string, LucideIcon> = {
  'Alimentação':     Utensils,   'Restaurantes':     ChefHat,
  'Transporte':      Car,        'Moradia':          Home,
  'Lazer':           Smile,      'Viagens':          Plane,
  'Saúde':           HeartPulse, 'Saúde Mental':     Activity,
  'Educação':        BookOpen,   'Assinaturas':      Smartphone,
  'Streaming':       Tv,         'Telefone':         Phone,
  'Cartão':          CreditCard, 'Vestuário':        Shirt,
  'Pets':            PawPrint,   'Empréstimos':      Banknote,
  'Seguros':         Shield,     'Impostos':         Receipt,
  'Doações':         Heart,      'Presente':         Gift,
  'Reembolso':       RotateCcw,  'Outros':           Package,
  'Salário':         Briefcase,  'Freelance':        Laptop,
  'Investimentos':   BarChart2,  'Aluguel recebido': Building2,
  'Saúde/Bem-estar': Activity,
};
const RECURRENCE_OPTS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Não repete' }, { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' }, { value: 'monthly', label: 'Mensalmente' },
  { value: 'yearly', label: 'Anualmente' },
];

const SUGGESTED_TAGS = ['urgente','fixo','variável','alimentação','lazer','trabalho','pessoal','imposto'];

/**
 * Adiciona `months` meses a uma data no formato 'YYYY-MM-DD' sem overflow.
 * Ex: addMonthsClamped('2026-01-31', 1) → '2026-02-28' (não Mar 3)
 */
function addMonthsClamped(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetYear  = y + Math.floor((m - 1 + months) / 12);
  const targetMonth = ((m - 1 + months) % 12) + 1;          // 1-based
  const lastDay     = new Date(targetYear, targetMonth, 0).getDate(); // dia 0 do próx. mês
  const day         = Math.min(d, lastDay);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Converte um valor digitado (pt-BR) em número. Aceita "1.234,56", "1234,56",
 * "1234.56" e "1234". Quando há vírgula, pontos são tratados como separador de
 * milhar. `type=number` rejeitava vírgula — por isso o campo agora é texto.
 */
function parseCurrencyInput(raw: string): number {
  if (!raw) return NaN;
  let s = raw.replace(/[^\d.,-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s);
}

/** Formata um número como moeda pt-BR sem símbolo (ex.: 1234.5 → "1.234,50"). */
function formatCurrencyInput(n: number): string {
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransactionForm({ open, onClose, editId }: Props) {
  const { transactions, addTransaction, updateTransaction, addTransactions } = useFinance();
  const editing = editId ? transactions.find(t => t.id === editId) : undefined;
  const attachRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>(editing?.type || 'expense');
  const [value, setValue]           = useState(editing ? formatCurrencyInput(editing.value) : '');
  const [currency, setCurrency]     = useState(editing?.currency || 'BRL');
  const [category, setCategory]     = useState(editing?.category || '');
  const [date, setDate]             = useState(editing?.date || new Date().toISOString().split('T')[0]);
  const [desc, setDesc]             = useState(editing?.description || '');
  const [notes, setNotes]           = useState(editing?.notes || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(editing?.recurrence || 'none');
  const [recMonths, setRecMonths]   = useState(editing?.recurrenceMonths || 3);
  const [paid, setPaid]             = useState(editing?.paid ?? false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(editing?.paymentMethod ?? null);
  const [paidAt, setPaidAt]         = useState(editing?.paidAt || '');
  const [paymentNotes, setPaymentNotes]   = useState(editing?.paymentNotes || '');
  const [tags, setTags]             = useState<string[]>(editing?.tags || []);
  const [tagInput, setTagInput]     = useState('');
  const [errors, setErrors]         = useState<Record<string,string>>({});
  const [saving, setSaving]         = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(editing?.attachmentUrl || '');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type); setValue(formatCurrencyInput(editing.value));
      setCurrency(editing.currency || 'BRL');
      setCategory(editing.category); setDate(editing.date);
      setDesc(editing.description); setNotes(editing.notes || '');
      setRecurrence(editing.recurrence || 'none'); setRecMonths(editing.recurrenceMonths || 3);
      setPaid(editing.paid ?? false); setTags(editing.tags || []);
      setPaymentMethod(editing.paymentMethod ?? null); setPaidAt(editing.paidAt || ''); setPaymentNotes(editing.paymentNotes || '');
      setAttachmentUrl(editing.attachmentUrl || '');
    } else {
      setType('expense'); setValue(''); setCurrency('BRL'); setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
      setDesc(''); setNotes(''); setRecurrence('none'); setRecMonths(3);
      setPaid(false); setTags([]); setAttachmentUrl('');
      setPaymentMethod(null); setPaidAt(''); setPaymentNotes('');
    }
    setErrors({}); setTagInput('');
  }, [editId, open]);

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? 'R$';

  function validate() {
    const e: Record<string,string> = {};
    const num = parseCurrencyInput(value);
    if (!value || isNaN(num) || num <= 0) e.value = 'Valor inválido';
    if (!category) e.category = 'Selecione uma categoria';
    if (!desc.trim()) e.desc = 'Informe uma descrição';
    setErrors(e); return Object.keys(e).length === 0;
  }

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 5) setTags(p => [...p, t]);
    setTagInput('');
  }

  function removeTag(t: string) { setTags(p => p.filter(x => x !== t)); }

  async function handleViewAttachment() {
    if (!editing) return;
    try {
      await transactionService.openAttachment(editing.id);
    } catch {
      setErrors(p => ({ ...p, attach: 'Não foi possível abrir o comprovante.' }));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    // Validação no frontend antes de enviar ao servidor
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const MAX_SIZE_MB = 5;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors(p => ({ ...p, attach: 'Tipo inválido. Use JPG, PNG, WEBP ou PDF.' }));
      if (attachRef.current) attachRef.current.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrors(p => ({ ...p, attach: `Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB.` }));
      if (attachRef.current) attachRef.current.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      const updated = await transactionService.uploadAttachment(editing.id, file);
      setAttachmentUrl(updated.attachmentUrl || '');
      setErrors(p => { const n = { ...p }; delete n.attach; return n; });
    } catch { setErrors(p => ({ ...p, attach: 'Erro ao enviar arquivo. Tente novamente.' })); }
    finally { setUploadingFile(false); if (attachRef.current) attachRef.current.value = ''; }
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const baseData = {
      type, value: parseCurrencyInput(value), category, date,
      description: desc.trim(), notes: notes.trim() || undefined,
      recurrence: recurrence === 'none' ? undefined : recurrence,
      recurrenceMonths: recurrence === 'monthly' ? recMonths : undefined,
      paid, tags, currency,
      // Detalhes do pagamento só quando pago; ao desmarcar, limpa (null)
      paymentMethod: paid ? paymentMethod : null,
      paidAt:        paid ? (paidAt || todayStr) : null,
      paymentNotes:  paid ? (paymentNotes.trim() || null) : null,
    };
    try {
      if (editing) {
        await updateTransaction({ ...baseData, id: editing.id });
      } else if (recurrence === 'monthly' && recMonths > 1) {
        const txList = Array.from({ length: recMonths }, (_, i) => ({
          ...baseData,
          date: addMonthsClamped(date, i),
          isRecurring: i > 0,
        }));
        await addTransactions(txList);
      } else {
        await addTransaction(baseData);
      }
      toast.success(editing ? 'Transação atualizada' : 'Transação adicionada');
      onClose();
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : 'Erro ao salvar' });
    } finally { setSaving(false); }
  }

  const accentColor = type === 'income' ? 'hsl(161 90% 42%)' : 'hsl(343 90% 62%)';

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/* Radix Content fornece focus trap, Escape, aria-modal e restauração de foco */}
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card overflow-hidden outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ boxShadow: '0 24px 80px hsl(0 0% 0% / 0.45)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}22` }}>
                  {type === 'income'
                    ? <TrendingUp className="h-4 w-4" style={{ color: accentColor }} />
                    : <TrendingDown className="h-4 w-4" style={{ color: accentColor }} />}
                </div>
                <Dialog.Title className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {editing ? 'Editar Lançamento' : 'Novo Lançamento'}
                </Dialog.Title>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Type */}
              <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
                {(['expense','income'] as TransactionType[]).map(t => (
                  <button key={t} onClick={() => { setType(t); setCategory(''); }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all"
                    style={type === t ? {
                      background: t === 'income' ? 'hsl(161 90% 42% / 0.18)' : 'hsl(343 90% 62% / 0.18)',
                      color: t === 'income' ? 'hsl(161 80% 55%)' : 'hsl(343 80% 68%)',
                      border: `1px solid ${t === 'income' ? 'hsl(161 90% 42% / 0.4)' : 'hsl(343 90% 62% / 0.4)'}`,
                    } : { color: 'hsl(var(--muted-foreground))' }}>
                    {t === 'expense' ? <><TrendingDown className="h-3.5 w-3.5" />Despesa</> : <><TrendingUp className="h-3.5 w-3.5" />Receita</>}
                  </button>
                ))}
              </div>

              {/* Value + Currency */}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{currencySymbol}</span>
                    <input type="text" inputMode="decimal" placeholder="0,00"
                      value={value}
                      onChange={e => setValue(e.target.value.replace(/[^\d.,]/g, ''))}
                      onBlur={() => { const n = parseCurrencyInput(value); if (Number.isFinite(n)) setValue(formatCurrencyInput(n)); }}
                      className={`w-full rounded-xl border pl-10 pr-4 py-3 text-lg font-bold bg-secondary outline-none transition-all ${errors.value ? 'border-destructive' : 'border-border focus:border-primary/50'}`}
                      style={{ color: value ? accentColor : undefined }} />
                  </div>
                  {errors.value && <p className="text-[11px] text-destructive mt-1">{errors.value}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />Moeda
                  </label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="h-[52px] rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-foreground outline-none focus:border-primary/50 transition-colors">
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Categoria</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {cats.map(c => {
                    const Icon = CAT_ICONS[c] ?? Package;
                    return (
                      <button key={c} onClick={() => setCategory(c)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[10px] font-medium transition-all ${
                          category === c
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5'
                        }`}>
                        <Icon className="h-4 w-4" />
                        <span className="truncate w-full text-center leading-tight">{c}</span>
                      </button>
                    );
                  })}
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
                  <input type="text" placeholder="Ex: Supermercado" value={desc} onChange={e => setDesc(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-xs bg-secondary outline-none transition-all text-foreground ${errors.desc ? 'border-destructive' : 'border-border focus:border-primary/50'}`} />
                </div>
              </div>
              {errors.desc && <p className="text-[11px] text-destructive -mt-2">{errors.desc}</p>}

              {/* Notes */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Observações <span className="opacity-50">(opcional)</span></label>
                <textarea placeholder="Anotações, detalhes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors resize-none" />
              </div>

              {/* Tags */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Tags</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{tags.length}/5</span>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary">
                        #{t}
                        <button onClick={() => removeTag(t)} className="hover:text-destructive transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Adicionar tag..."
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-[11px] text-foreground outline-none focus:border-primary/40 transition-colors"
                    disabled={tags.length >= 5}
                  />
                  <button onClick={() => addTag(tagInput)} disabled={!tagInput.trim() || tags.length >= 5}
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-40">
                    +
                  </button>
                </div>
                {SUGGESTED_TAGS.filter(t => !tags.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground self-center">Sugestões:</span>
                    {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 6).map(t => (
                      <button key={t} onClick={() => addTag(t)} disabled={tags.length >= 5}
                        className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-40">
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Paid status */}
              <button type="button" onClick={() => setPaid(p => !p)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                  paid ? 'bg-success-muted border-success/40 text-success' : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/30'
                }`}>
                <div className="flex items-center gap-2">
                  {paid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  <span className="text-xs font-semibold">
                    {paid ? (type === 'income' ? 'Recebido' : 'Pago') : (type === 'income' ? 'Marcar como recebido' : 'Marcar como pago')}
                  </span>
                </div>
                <span className="text-[10px] font-medium opacity-60">{paid ? 'Clique para desfazer' : 'Em aberto'}</span>
              </button>

              {/* Detalhes do pagamento — só quando marcado como pago/recebido */}
              {paid && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {type === 'income' ? 'Forma de recebimento' : 'Forma de pagamento'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {paymentMethodsFor(type).map(m => (
                      <button key={m.code} type="button" onClick={() => setPaymentMethod(m.code)}
                        className={`rounded-lg border px-3 py-2 text-[11px] font-medium text-left transition-all ${
                          paymentMethod === m.code
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                        {type === 'income' ? 'Data do recebimento' : 'Data do pagamento'}
                      </label>
                      <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
                        className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Observações do pagamento <span className="opacity-50">(opcional)</span></label>
                      <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} maxLength={500}
                        placeholder="Ex: cartão final 1234, parcela 2/3..."
                        className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* Attachment — only when editing existing transaction */}
              {editing && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Comprovante</span>
                  </div>
                  {attachmentUrl ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleViewAttachment}
                        className="text-[11px] text-primary underline truncate flex-1 text-left">
                        Ver comprovante anexado
                      </button>
                      <button onClick={() => attachRef.current?.click()}
                        className="text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 transition-all">
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => attachRef.current?.click()} disabled={uploadingFile}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50">
                      {uploadingFile
                        ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Enviando...</>
                        : <><Upload className="h-3.5 w-3.5" />Anexar comprovante (JPG, PNG, PDF · max 5MB)</>
                      }
                    </button>
                  )}
                  <input ref={attachRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" className="hidden" onChange={handleFileUpload} />
                  {errors.attach && <p className="text-[11px] text-destructive">{errors.attach}</p>}
                </div>
              )}

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
                        recurrence === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {recurrence === 'monthly' && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Repetir por</span>
                    <input type="number" min={2} max={60} step={1} value={recMonths} onChange={e => setRecMonths(Math.max(2, Math.min(60, Math.floor(Number(e.target.value)))))}
                      className="w-20 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs text-foreground text-center outline-none focus:border-primary/50" />
                    <span className="text-xs text-muted-foreground">meses</span>
                    <span className="text-[10px] text-primary font-medium">= {recMonths} lançamentos</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {errors.submit && <p className="mx-5 mb-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{errors.submit}</p>}
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={onClose} disabled={saving}
                className="flex-1 rounded-xl border border-border py-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saving || uploadingFile}
                className="btn-novux flex-1 py-3 text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {saving
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Salvando...</>
                  : <><Check className="h-3.5 w-3.5" />{editing ? 'Salvar alterações' : recurrence === 'monthly' && recMonths > 1 ? `Criar ${recMonths} lançamentos` : 'Adicionar'}</>
                }
              </button>
            </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
