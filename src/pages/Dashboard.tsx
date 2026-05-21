import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { InsightCard } from '@/components/InsightCard';
import { StatCard } from '@/components/StatCard';
import { SmartIndicators } from '@/components/SmartIndicators';
import { TransactionList } from '@/components/TransactionList';
import { CategoryChart } from '@/components/CategoryChart';
import { TransactionForm } from '@/components/TransactionForm';
import { CSVUpload } from '@/components/CSVUpload';
import { EmptyDashboard } from '@/components/EmptyDashboard';
import { Wallet, TrendingUp, TrendingDown, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { transactions, insights, isPremiumPreview, setPremiumPreview } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const now = new Date();
  const stats = useMemo(() => {
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const income = thisMonth.filter(t => t.type === 'income').reduce((a, t) => a + t.value, 0);
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((a, t) => a + t.value, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const fmt = (v: number) => `R$ ${Math.abs(v).toFixed(2).replace('.', ',')}`;

  if (transactions.length === 0) {
    return (
      <>
        <EmptyDashboard onAddTransaction={() => setFormOpen(true)} />
        <TransactionForm open={formOpen} onClose={() => { setFormOpen(false); setEditId(null); }} editId={editId} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Sapiens Finance</h1>
            <p className="text-xs text-muted-foreground">Sua saúde financeira em 12 segundos.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Preview premium
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPremiumPreview ? 'Mostrando indicadores desbloqueados' : 'Mostrando experiência gratuita com bloqueios'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={isPremiumPreview ? 'default' : 'outline'}
                className="shrink-0"
                onClick={() => setPremiumPreview(!isPremiumPreview)}
                aria-pressed={isPremiumPreview}
                aria-label="Alternar pré-visualização premium"
              >
                {isPremiumPreview ? 'Premium ativo' : 'Ver premium'}
              </Button>
            </div>

            <Button onClick={() => { setEditId(null); setFormOpen(true); }} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Nova Transação
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SmartIndicators />

        {insights.length > 0 && (
          <section>
            <h2 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Diagnóstico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={insight.id} insight={insight} index={i} />
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Saldo do Mês" value={fmt(stats.balance)} icon={Wallet} variant={stats.balance >= 0 ? 'income' : 'expense'} />
          <StatCard label="Receitas" value={fmt(stats.income)} icon={TrendingUp} variant="income" />
          <StatCard label="Despesas" value={fmt(stats.expense)} icon={TrendingDown} variant="expense" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-card p-6"
          >
            <h2 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-4">Despesas por Categoria</h2>
            <CategoryChart />
          </motion.section>

          <div className="space-y-4">
            <CSVUpload />
          </div>
        </div>

        <section className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Últimas Transações</h2>
          </div>
          <TransactionList onEdit={(id) => { setEditId(id); setFormOpen(true); }} limit={15} />
        </section>
      </main>

      <TransactionForm open={formOpen} onClose={() => { setFormOpen(false); setEditId(null); }} editId={editId} />
    </div>
  );
}
