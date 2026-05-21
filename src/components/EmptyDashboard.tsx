import { motion } from 'framer-motion';
import { CSVUpload } from '@/components/CSVUpload';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';

interface Props {
  onAddTransaction: () => void;
}

export function EmptyDashboard({ onAddTransaction }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl font-bold text-foreground">Sapiens Finance</h1>
          <p className="text-xs text-muted-foreground">Sua saúde financeira em 12 segundos.</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Comece seu diagnóstico financeiro</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              Adicione sua primeira transação ou importe um extrato CSV para que o sistema analise seu comportamento financeiro.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onAddTransaction} size="lg" className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Transação
            </Button>
          </div>

          <div className="max-w-md mx-auto">
            <CSVUpload />
          </div>

          {/* Skeleton preview */}
          <div className="grid grid-cols-3 gap-3 opacity-30 pointer-events-none mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
