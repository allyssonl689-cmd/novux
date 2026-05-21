import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Shield, Download, ChevronRight, Sparkles, Sun, Moon, CheckCircle2, Zap, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { transactions, isPremiumPreview, setPremiumPreview } = useFinance();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [notifs, setNotifs] = useState({ weekly: true, insights: true, goals: false, budget: true });
  const [saved, setSaved] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('light', next === 'light');
  }

  function exportCSV() {
    const csv = ['Data,Tipo,Categoria,Descrição,Valor',
      ...transactions.map(t=>`${t.date},${t.type},${t.category},"${t.description}",${t.value}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'novux-transacoes.csv'; a.click();
  }

  function handleSave() { setSaved(true); setTimeout(()=>setSaved(false), 2500); }

  const stats = [
    { l:'Transações', v: transactions.length },
    { l:'Meses monitorados', v: new Set(transactions.map(t=>t.date.substring(0,7))).size },
    { l:'Categorias', v: new Set(transactions.map(t=>t.category)).size },
    { l:'Plano atual', v: isPremiumPreview ? 'Pro' : 'Free' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily:'Outfit,sans-serif' }}>Perfil & Configurações</h1>
        <p className="text-xs text-muted-foreground mt-1">Personalize sua experiência</p>
      </motion.div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 0%, hsl(158 64% 52% / 0.06) 0%, transparent 60%)' }} />
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, hsl(158 64% 52% / 0.2), hsl(265 85% 70% / 0.2))', border: '1px solid hsl(158 64% 52% / 0.2)' }}>
          <span className="text-gradient">{(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-foreground" style={{ fontFamily:'Outfit,sans-serif' }}>{user?.name ?? 'Usuário'}</p>
          <p className="text-xs text-muted-foreground">{user?.email ?? '—'}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPremiumPreview ? 'badge-purple' : 'bg-secondary text-muted-foreground'}`}>
              <Sparkles className="h-2.5 w-2.5" />
              {isPremiumPreview ? 'PRO' : 'FREE'}
            </span>
          </div>
        </div>
        <button onClick={() => setPremiumPreview(!isPremiumPreview)}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${isPremiumPreview ? 'bg-secondary text-muted-foreground hover:text-foreground' : 'btn-novux'}`}>
          {isPremiumPreview ? 'Voltar ao Free' : 'Testar Pro'}
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s,i) => (
          <motion.div key={s.l} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 + i*0.04 }}
            className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">{s.l}</p>
            <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily:'Outfit,sans-serif' }}>{s.v}</p>
          </motion.div>
        ))}
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aparência</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme==='dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-warning" />}
              <div>
                <p className="text-sm font-semibold text-foreground">{theme==='dark'?'Modo Escuro':'Modo Claro'}</p>
                <p className="text-[11px] text-muted-foreground">Tema da interface</p>
              </div>
            </div>
            <button onClick={toggleTheme}
              className="relative w-12 h-6 rounded-full transition-all duration-300"
              style={{ background: theme==='dark' ? 'hsl(161,100%,45%)' : 'hsl(230 18% 22%)' }}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${theme==='dark'?'translate-x-6':'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notificações</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { k:'weekly',   l:'Relatório semanal',    d:'Resumo todo domingo' },
            { k:'insights', l:'Insights de IA',        d:'Alertas personalizados' },
            { k:'goals',    l:'Progresso de metas',    d:'Atualizações das metas' },
            { k:'budget',   l:'Alertas de orçamento',  d:'Ao atingir 80% do limite' },
          ].map(n => (
            <div key={n.k} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">{n.l}</p>
                <p className="text-[11px] text-muted-foreground">{n.d}</p>
              </div>
              <button onClick={() => setNotifs(p=>({...p,[n.k]:!p[n.k as keyof typeof p]}))}
                className="relative w-10 h-5 rounded-full transition-all duration-300"
                style={{ background: (notifs as any)[n.k] ? 'hsl(161,100%,45%)' : 'hsl(230 18% 22%)' }}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${(notifs as any)[n.k]?'translate-x-5':'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Data & Account */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dados & Conta</p>
        </div>
        <div className="divide-y divide-border">
          <button onClick={exportCSV} className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">Exportar dados</p>
                <p className="text-[11px] text-muted-foreground">Baixar transações em CSV</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 px-5 py-4">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Versão</p>
              <p className="text-[11px] text-muted-foreground">Novux Finance v2.0 · Powered by Claude AI</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        onClick={handleSave}
        className="w-full rounded-2xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: saved ? 'hsl(158,64%,42%)' : 'linear-gradient(135deg, hsl(161,100%,45%), hsl(193,100%,50%))' }}>
        {saved ? <><CheckCircle2 className="h-4 w-4" /> Configurações salvas!</> : 'Salvar configurações'}
      </motion.button>

      {/* Logout */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
        onClick={handleLogout}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-destructive border border-destructive/30 flex items-center justify-center gap-2 hover:bg-destructive/10 transition-all">
        <LogOut className="h-4 w-4" /> Sair da conta
      </motion.button>
    </div>
  );
}
