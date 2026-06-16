import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, X, RefreshCw, CircleOff, Wallet } from 'lucide-react';
import { TransactionType, paymentMethodsFor } from '@/lib/types';

export interface PaymentDetails {
  paymentMethod: string | null;
  paidAt: string | null;
  paymentNotes: string | null;
}

interface Props {
  open: boolean;
  type: TransactionType;
  isPaid: boolean; // se já está pago (modo edição → mostra "Marcar como não pago")
  initial?: Partial<PaymentDetails>;
  loading?: boolean;
  onConfirm: (details: PaymentDetails) => void;
  onUnmark: () => void;
  onClose: () => void;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PaymentDetailsModal({ open, type, isPaid, initial, loading, onConfirm, onUnmark, onClose }: Props) {
  const isIncome = type === 'income';
  const methods = paymentMethodsFor(type);

  const [method, setMethod] = useState<string | null>(null);
  const [date, setDate]     = useState<string>(todayLocal());
  const [notes, setNotes]   = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setMethod(initial?.paymentMethod ?? null);
    setDate(initial?.paidAt || todayLocal());
    setNotes(initial?.paymentNotes ?? '');
  }, [open, initial]);

  const title = isIncome ? 'Registrar recebimento' : 'Registrar pagamento';
  const methodLabel = isIncome ? 'Forma de recebimento' : 'Forma de pagamento';
  const dateLabel = isIncome ? 'Data do recebimento' : 'Data do pagamento';

  function handleConfirm() {
    onConfirm({
      paymentMethod: method,
      paidAt: date || null,
      paymentNotes: notes.trim() || null,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ boxShadow: '0 24px 80px hsl(0 0% 0% / 0.45)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.15)' }}>
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <Dialog.Title className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                {title}
              </Dialog.Title>
            </div>
            <button onClick={onClose} aria-label="Fechar" className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Forma de pagamento/recebimento */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-2">{methodLabel}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {methods.map(m => (
                  <button key={m.code} type="button" onClick={() => setMethod(m.code)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-medium text-left transition-all ${
                      method === m.code
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">{dateLabel}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors" />
            </div>

            {/* Observações */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Observações <span className="opacity-50">(opcional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
                placeholder="Ex: cartão final 1234, parcela 2/3..."
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 transition-colors resize-none" />
            </div>

            {isPaid && (
              <button type="button" onClick={onUnmark} disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all disabled:opacity-50">
                <CircleOff className="h-3.5 w-3.5" />
                {isIncome ? 'Marcar como não recebido' : 'Marcar como não pago'}
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-border py-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={loading}
              className="btn-novux flex-1 py-3 text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              {loading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Salvando...</>
                : <><Check className="h-3.5 w-3.5" />Salvar</>}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
