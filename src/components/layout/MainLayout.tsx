import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Plus, Sun, Moon, Calendar, ChevronDown, Download, Upload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TransactionForm } from '@/components/TransactionForm';
import { useFinance } from '@/contexts/FinanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePeriod, PERIOD_LABELS, type PeriodPreset } from '@/contexts/PeriodContext';

function PeriodSelector() {
  const { period, setPeriod, label, setCustomRange } = usePeriod();
  const [open, setOpen]         = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const presets = Object.entries(PERIOD_LABELS).filter(([k]) => k !== 'custom') as [PeriodPreset, string][];

  function applyCustom() {
    if (!startDate || !endDate) return;
    setCustomRange({ start: new Date(startDate), end: new Date(endDate) });
    setPeriod('custom');
    setOpen(false); setShowCalendar(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-all">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {presets.map(([key, lbl]) => (
            <button key={key} onClick={() => { setPeriod(key); setOpen(false); }}
              className={`flex w-full items-center px-4 py-2.5 text-xs transition-colors ${
                period === key ? 'text-[hsl(193_100%_65%)] font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              style={period === key ? { borderLeft: '2px solid hsl(193 100% 50%)', background: 'hsl(193 100% 50% / 0.06)' } : {}}>
              {lbl}
            </button>
          ))}
          <div className="border-t border-border">
            <button onClick={() => setShowCalendar(v => !v)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Calendar className="h-3.5 w-3.5" />
              Período personalizado
            </button>
            {showCalendar && (
              <div className="px-4 pb-3 space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Fim</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <button onClick={applyCustom}
                  className="btn-novux w-full py-1.5 text-[11px] font-bold rounded-lg">
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MainLayout() {
  const [formOpen, setFormOpen] = useState(false);
  const { insights, transactions, isPremiumPreview } = useFinance();
  const { theme, toggleTheme } = useTheme();
  const alertCount = insights.filter(i => i.level === 'critical' || i.level === 'warning').length;

  function exportCSV() {
    const csv = ['Data,Tipo,Categoria,Descrição,Valor',
      ...transactions.map(t => `${t.date},${t.type},${t.category},"${t.description}",${t.value}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `novux-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full mesh-bg">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ── Header ── */}
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border px-4 py-2.5"
            style={{ background: 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(12px)' }}>

            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors shrink-0" />

            <div className="flex-1" />

            {/* Period selector */}
            <PeriodSelector />

            {/* Theme toggle */}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Export (premium) */}
            {isPremiumPreview && (
              <button onClick={exportCSV} title="Exportar CSV"
                className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <Download className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Alert bell */}
            <button className="relative h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <Bell className="h-3.5 w-3.5" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </button>

            {/* New transaction CTA */}
            <button onClick={() => setFormOpen(true)}
              className="btn-novux flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">Lançamento</span>
            </button>

            {/* Avatar */}
            <div className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black border border-border shrink-0"
              style={{ background: 'hsl(var(--card))' }}>
              <span className="text-gradient" style={{ fontFamily: 'Syne, sans-serif' }}>N</span>
            </div>
          </header>

          {/* ── Page ── */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} editId={null} />
    </SidebarProvider>
  );
}
