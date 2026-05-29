import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { OnboardingModal, useOnboarding } from '@/components/OnboardingModal';
import { Bell, Plus, Sun, Moon, Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { TransactionForm } from '@/components/TransactionForm';
import { useFinance } from '@/contexts/FinanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePeriod, PERIOD_LABELS, type PeriodPreset } from '@/contexts/PeriodContext';
import { useAuth } from '@/contexts/AuthContext';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

/* Rotas que usam header simplificado (sem navegador de mês e sem botão Lançamento) */
const SIMPLE_HEADER_ROUTES = ['/perfil', '/configuracoes', '/admin'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function MonthNavigator() {
  const { setCustomRange, setPeriod } = usePeriod();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const applyMonth = useCallback((m: number, y: number) => {
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0, 23, 59, 59);
    setCustomRange({ start, end });
    setPeriod('custom');
  }, [setCustomRange, setPeriod]);

  // Apply current month on mount
  useEffect(() => { applyMonth(month, year); }, []); // eslint-disable-line

  function prev() {
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    setMonth(m); setYear(y); applyMonth(m, y);
  }

  function next() {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    setMonth(m); setYear(y); applyMonth(m, y);
  }

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); applyMonth(now.getMonth(), now.getFullYear()); }}
        title="Voltar para o mês atual"
        className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 px-2.5 sm:px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-all min-w-[90px] sm:min-w-[130px] justify-center"
        style={isCurrentMonth ? { borderColor: 'hsl(193 100% 50% / 0.4)', color: 'hsl(193 100% 65%)' } : {}}>
        <span className="hidden sm:inline">{MONTH_NAMES[month]}</span>
        <span className="sm:hidden">{MONTH_NAMES[month].slice(0, 3)}</span>
        {' '}{year}
      </button>

      <button
        onClick={next}
        className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

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

function NotificationPanel({ onClose, dismissed, setDismissed }: {
  onClose: () => void;
  dismissed: Set<number>;
  setDismissed: (s: Set<number>) => void;
}) {
  const { insights } = useFinance();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const visible = insights.filter((_, i) => !dismissed.has(i));

  const levelIcon = (level: string) => {
    if (level === 'critical' || level === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    if (level === 'positive') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    return <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
  };

  const levelBg = (level: string) => {
    if (level === 'critical' || level === 'warning') return 'bg-amber-500/8 border-amber-500/20';
    if (level === 'positive') return 'bg-emerald-500/8 border-emerald-500/20';
    return 'bg-blue-500/8 border-blue-500/20';
  };

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Notificações</span>
          {visible.length > 0 && (
            <span className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{visible.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {visible.length > 0 && (
            <button
              onClick={() => setDismissed(new Set(insights.map((_, i) => i)))}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium">
              Limpar tudo
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Tudo em ordem!</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Você não tem notificações no momento.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {insights.map((insight, i) => dismissed.has(i) ? null : (
              <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${levelBg(insight.level)}`}>
                {levelIcon(insight.level)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-snug">{insight.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{insight.text}</p>
                </div>
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, i]))}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border bg-secondary/30">
        <p className="text-[10px] text-muted-foreground text-center">Insights gerados pela IA com base nas suas transações</p>
      </div>
    </div>
  );
}

export function MainLayout() {
  const [formOpen, setFormOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [showOnb, setShowOnb]     = useState(false);
  const { insights, transactions, isPremiumPreview } = useFinance();
  const { theme, toggleTheme } = useTheme();
  const { showOnboarding } = useOnboarding();
  const { logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const isSimpleHeader = SIMPLE_HEADER_ROUTES.some(r => location.pathname.startsWith(r));

  useInactivityLogout(logout, isAuthenticated);

  // Mostra onboarding após 1s se for primeiro acesso
  useState(() => { if (showOnboarding) setTimeout(() => setShowOnb(true), 1000); });
  const alertCount = insights.filter((i, idx) =>
    !dismissed.has(idx) && (i.level === 'critical' || i.level === 'warning')
  ).length;

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
          <header className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-border px-2 sm:px-4 py-2"
            style={{ background: 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(12px)' }}>

            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors shrink-0" />

            {/* Month navigator — oculto em páginas sem contexto de período */}
            {!isSimpleHeader && (
              <div className="flex-1 flex justify-center">
                <MonthNavigator />
              </div>
            )}

            {/* Spacer para header simples */}
            {isSimpleHeader && <div className="flex-1" />}

            {/* Period selector — oculto em xs e em páginas simples */}
            {!isSimpleHeader && (
              <div className="hidden sm:block">
                <PeriodSelector />
              </div>
            )}

            {/* Theme toggle */}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0">
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Export (premium) — oculto em xs e em páginas simples */}
            {!isSimpleHeader && isPremiumPreview && (
              <button onClick={exportCSV} title="Exportar CSV"
                className="hidden sm:flex h-8 w-8 rounded-xl border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <Download className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Alert bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <Bell className="h-3.5 w-3.5" />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} dismissed={dismissed} setDismissed={setDismissed} />}
            </div>

            {/* New transaction CTA — oculto em páginas simples */}
            {!isSimpleHeader && (
              <button onClick={() => setFormOpen(true)}
                className="btn-novux flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl shrink-0">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="hidden sm:inline">Lançamento</span>
              </button>
            )}
          </header>

          {/* ── Page ── */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} editId={null} />
      {showOnb && <OnboardingModal onClose={() => setShowOnb(false)} />}
    </SidebarProvider>
  );
}
