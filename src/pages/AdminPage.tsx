import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BarChart3, TrendingUp, Activity, RefreshCw, Crown, Calendar, Sun, Moon, LayoutDashboard, Shield } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

interface Metrics {
  users: { total: number; active30d: number; newThisMonth: number; plans: Record<string, number> };
  transactions: { total: number; thisMonth: number };
  growth: Array<{ month: string; registrations: string }>;
  topCategories: Array<{ category: string; count: string }>;
}

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Outfit,sans-serif' }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [m, u] = await Promise.all([
        apiFetch<{ success: boolean; data: Metrics }>('/api/admin/metrics'),
        apiFetch<{ success: boolean; data: any[] }>('/api/admin/users'),
      ]);
      setMetrics(m.data);
      setUsers(u.data);
    } catch (e: any) {
      setError(e.message ?? 'Acesso negado ou erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header Admin ── */}
      <header className="sticky top-0 z-40 border-b border-border/50"
        style={{ background: 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo + badge */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: 'hsl(228 42% 18%)', border: '1px solid hsl(193 100% 54% / 0.2)' }}>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Novux Admin</p>
              <p className="text-[10px] text-muted-foreground">Painel de controle</p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Link to="/lancamentos" className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <LayoutDashboard className="h-3.5 w-3.5" />
              App
            </Link>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => logout()} className="h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {loading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl skeleton" />)}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-destructive font-semibold">{error}</p>
            <button onClick={load} className="btn-novux px-4 py-2 text-xs rounded-xl">Tentar novamente</button>
          </div>
        )}

        {!loading && !error && metrics && (
          <>
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
                <p className="text-xs text-muted-foreground mt-1">Métricas da plataforma Novux</p>
              </div>
              <button onClick={load} className="h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard label="Total de Usuários"   value={metrics.users.total}         sub="cadastrados"              icon={Users}       color="#16C7FF" />
              <KPICard label="Ativos (30 dias)"    value={metrics.users.active30d}     sub="últimos 30 dias"          icon={Activity}    color="#19D38A" />
              <KPICard label="Novos este mês"      value={metrics.users.newThisMonth}  sub="cadastros no mês"         icon={TrendingUp}  color="#8B5CF6" />
              <KPICard label="Transações totais"   value={metrics.transactions.total}  sub={`${metrics.transactions.thisMonth} este mês`} icon={BarChart3} color="#F59E0B" />
            </div>

            {/* Planos + Categorias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Distribuição de Planos</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(metrics.users.plans).map(([plan, count]) => {
                    const pct = metrics.users.total > 0 ? Math.round((count / metrics.users.total) * 100) : 0;
                    return (
                      <div key={plan}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground capitalize">{plan}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: plan === 'premium' ? '#16C7FF' : '#64748B' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Top Categorias (despesas)</h3>
                </div>
                <div className="space-y-2.5">
                  {metrics.topCategories.slice(0, 6).map((c, i) => (
                    <div key={c.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-xs text-foreground">{c.category}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{c.count} tx</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Crescimento */}
            {metrics.growth.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Cadastros por Mês</h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[...metrics.growth].reverse().map(g => (
                    <div key={g.month} className="text-center">
                      <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'Outfit,sans-serif' }}>{g.registrations}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{g.month.slice(5)}/{g.month.slice(2, 4)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usuários */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Usuários ({users.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium">Nome</th>
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium">E-mail</th>
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium">Plano</th>
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`${i < users.length - 1 ? 'border-b border-border/50' : ''} hover:bg-secondary/20 transition-colors`}>
                        <td className="px-5 py-3 text-foreground font-medium">{u.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${u.plan === 'premium' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                            {u.plan === 'premium' && <Crown className="h-2.5 w-2.5" />}
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
