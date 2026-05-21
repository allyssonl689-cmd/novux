import { useFinance } from '@/contexts/FinanceContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onEdit: (id: string) => void;
  limit?: number;
}

export function TransactionList({ onEdit, limit }: Props) {
  const { transactions, deleteTransaction } = useFinance();

  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const display = limit ? sorted.slice(0, limit) : sorted;

  if (display.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhuma transação registrada ainda.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <AnimatePresence>
        {display.map(tx => (
          <motion.div
            key={tx.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex items-center justify-between h-14 px-3 hover:bg-secondary/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
              <p className="text-xs text-muted-foreground">
                {tx.category} · {format(new Date(tx.date), "dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className={`text-sm font-semibold font-mono ${tx.type === 'income' ? 'text-success' : 'text-alert'}`}>
                {tx.type === 'income' ? '+' : '-'} R$ {tx.value.toFixed(2).replace('.', ',')}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(tx.id)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
