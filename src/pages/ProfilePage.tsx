import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Bell, Shield, Download, ChevronRight, Sparkles, Sun, Moon,
  CheckCircle2, Zap, LogOut, Smartphone, Lock, QrCode, X,
  RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { twoFactorService, notificationService } from '@/services/twoFactorService';

export default function ProfilePage() {
  const { transactions, isPremiumPreview, setPremiumPreview } = useFinance();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [saved, setSaved] = useState(false);
  const [notifGranted, setNotifGranted] = useState(notificationService.isGranted());

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [qrUrl, setQrUrl]       = useState('');
  const [secret, setSecret]     = useState('');
  const [token2FA, setToken2FA] = useState('');
  const [show2FAToken, setShow2FAToken] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError]     = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');

  useEffect(() => {
    twoFactorService.status().then(s => setTwoFAEnabled(s.enabled)).catch(() => {});
  }, []);

  async function handleLogout() { await logout(); navigate('/login'); }

  function exportCSV() {
    const csv = ['Data,Tipo,Categoria,Descrição,Valor,Moeda,Tags',
      ...transactions.map(t =>
        `${t.date},${t.type},${t.category},"${t.description}",${t.value},${t.currency ?? 'BRL'},"${(t.tags ?? []).join('|')}"`
      )
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'novux-transacoes.csv'; a.click();
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  async function handleRequestNotif() {
    const granted = await notificationService.requestPermission();
    setNotifGranted(granted);
    if (granted) notificationService.show('Notificações ativadas!', 'Você receberá lembretes do Novux Finance.');
  }

  async function handle2FASetup() {
    setTwoFALoading(true); setTwoFAError('');
    try {
      const data = await twoFactorService.setup();
      setQrUrl(data.qrDataUrl); setSecret(data.secret); setShowSetup(true);
    } catch (e: any) { setTwoFAError(e.message); }
    finally { setTwoFALoading(false); }
  }

  async function handle2FAVerify() {
    setTwoFALoading(true); setTwoFAError('');
    try {
      await twoFactorService.verify(token2FA);
      setTwoFAEnabled(true); setShowSetup(false); setToken2FA('');
      setTwoFASuccess('2FA ativado com sucesso!');
      setTimeout(() => setTwoFASuccess(''), 3000);
    } catch (e: any) { setTwoFAError(e.message ?? 'Token inválido'); }
    finally { setTwoFALoading(false); }
  }

  async function handle2FADisable() {
    setTwoFALoading(true); setTwoFAError('');
    try {
      await twoFactorService.disable(token2FA);
      setTwoFAEnabled(false); setShowDisable(false); setToken2FA('');
      setTwoFASuccess('2FA desativado.');
      setTimeout(() => setTwoFASuccess(''), 3000);
    } catch (e: any) { setTwoFAError(e.message ?? 'Token inválido'); }
    finally { setTwoFALoading(false); }
  }

  const stats = [
    { l: 'Transações', v: transactions.length },
    { l: 'Meses monitorados', v: new Set(transactions.map(t => t.date.substring(0, 7))).size },
    { l: 'Categorias', v: new Set(transactions.map(t => t.category)).size },
    { l: 'Plano atual', v: isPremiumPreview ? 'Pro' : 'Free' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>Perfil & Configurações</h1>
        <p className="text-xs text-muted-foreground mt-1">Personalize sua experiência</p>
      </motion.div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: 'hsl(var(--primary) / 0.15)', border: '1px solid hsl(var(--primary) / 0.25)' }}>
          <span style={{ color: 'hsl(var(--primary))' }}>{(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'Syne,sans-serif' }}>{user?.name ?? 'Usuário'}</p>
          <p className="text-xs text-muted-foreground">{user?.email ?? '—'}</p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPremiumPreview ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground'}`}>
              <Sparkles className="h-2.5 w-2.5" />{isPremiumPreview ? 'PRO' : 'FREE'}
            </span>
            {twoFAEnabled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-muted text-success border border-success/20">
                <Shield className="h-2.5 w-2.5" />2FA Ativo
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setPremiumPreview(!isPremiumPreview)}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${isPremiumPreview ? 'bg-secondary text-muted-foreground hover:text-foreground' : 'btn-novux'}`}>
          {isPremiumPreview ? 'Voltar ao Free' : 'Testar Pro'}
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 + i * 0.04 }}
            className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">{s.l}</p>
            <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: 'Outfit,sans-serif' }}>{s.v}</p>
          </motion.div>
        ))}
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aparência</p>
        </div>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-warning" />}
            <div>
              <p className="text-sm font-semibold text-foreground">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</p>
              <p className="text-[11px] text-muted-foreground">Tema da interface</p>
            </div>
          </div>
          <button onClick={toggleTheme}
            className="relative w-12 h-6 rounded-full transition-all duration-300"
            style={{ background: theme === 'dark' ? '#10b981' : 'hsl(230 18% 22%)' }}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.13 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notificações</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Browser permission */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Notificações do navegador</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {notifGranted ? 'Permissão concedida' : 'Clique para ativar lembretes'}
              </p>
            </div>
            {notifGranted ? (
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            ) : (
              <button onClick={handleRequestNotif}
                className="btn-novux text-[11px] px-3 py-1.5 rounded-lg font-semibold">
                Ativar
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground px-1">
            As notificações aparecem quando o aplicativo está aberto. Suporte a push em segundo plano será adicionado em breve.
          </p>
        </div>
      </motion.div>

      {/* Security — 2FA */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Segurança</p>
        </div>

        {/* 2FA section */}
        <div className="p-5 space-y-4">
          {twoFASuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-muted px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-xs font-semibold text-success">{twoFASuccess}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${twoFAEnabled ? 'bg-success-muted' : 'bg-secondary'}`}>
                <Smartphone className={`h-4 w-4 ${twoFAEnabled ? 'text-success' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Autenticação de dois fatores</p>
                <p className="text-[11px] text-muted-foreground">
                  {twoFAEnabled ? 'Protegido com Google Authenticator' : 'Adicione uma camada extra de segurança'}
                </p>
              </div>
            </div>
            {twoFAEnabled ? (
              <button onClick={() => { setShowDisable(true); setTwoFAError(''); setToken2FA(''); }}
                className="text-[11px] font-semibold text-muted-foreground border border-border px-3 py-1.5 rounded-lg hover:text-destructive hover:border-destructive/40 transition-all">
                Desativar
              </button>
            ) : (
              <button onClick={handle2FASetup} disabled={twoFALoading}
                className="btn-novux text-[11px] px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60 flex items-center gap-1.5">
                {twoFALoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                Ativar 2FA
              </button>
            )}
          </div>

          {/* 2FA Setup flow */}
          {showSetup && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold text-foreground">Escaneie com Google Authenticator</p>
                </div>
                <button onClick={() => setShowSetup(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {qrUrl && <img src={qrUrl} alt="QR Code 2FA" className="w-36 h-36 rounded-xl mx-auto border border-border" />}
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Ou insira a chave manualmente:</p>
                <code className="text-[11px] font-mono bg-secondary px-3 py-1.5 rounded-lg text-foreground break-all">{secret}</code>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Insira o código de 6 dígitos para confirmar
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={show2FAToken ? 'text' : 'password'}
                      value={token2FA} onChange={e => setToken2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000" maxLength={6}
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground font-mono tracking-widest outline-none focus:border-primary/50 transition-colors pr-10"
                    />
                    <button type="button" onClick={() => setShow2FAToken(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {show2FAToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button onClick={handle2FAVerify} disabled={token2FA.length !== 6 || twoFALoading}
                    className="btn-novux px-4 py-2.5 text-xs font-bold rounded-xl disabled:opacity-60 flex items-center gap-1.5">
                    {twoFALoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Verificar
                  </button>
                </div>
              </div>
              {twoFAError && <p className="text-xs text-destructive">{twoFAError}</p>}
            </motion.div>
          )}

          {/* 2FA Disable flow */}
          {showDisable && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">Confirmar desativação do 2FA</p>
                <button onClick={() => setShowDisable(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Insira o código atual do seu app autenticador.</p>
              <div className="flex gap-2">
                <input type="text" value={token2FA} onChange={e => setToken2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6}
                  className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground font-mono tracking-widest outline-none focus:border-destructive/50 transition-colors" />
                <button onClick={handle2FADisable} disabled={token2FA.length !== 6 || twoFALoading}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-60 flex items-center gap-1.5">
                  {twoFALoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Desativar
                </button>
              </div>
              {twoFAError && <p className="text-xs text-destructive">{twoFAError}</p>}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Data & Account */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
        className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dados & Conta</p>
        </div>
        <div className="divide-y divide-border">
          <button onClick={exportCSV} className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">Exportar dados</p>
                <p className="text-[11px] text-muted-foreground">Baixar transações em CSV (com tags e moeda)</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 px-5 py-4">
            <Zap className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Versão</p>
              <p className="text-[11px] text-muted-foreground">Novux Finance v2.1 · Powered by Claude AI</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        onClick={handleSave}
        className="w-full rounded-2xl py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
        style={{ background: saved ? '#10b981' : 'hsl(var(--primary))' }}>
        {saved ? <><CheckCircle2 className="h-4 w-4" />Configurações salvas!</> : 'Salvar configurações'}
      </motion.button>

      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
        onClick={handleLogout}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold text-destructive border border-destructive/30 flex items-center justify-center gap-2 hover:bg-destructive/10 transition-all">
        <LogOut className="h-4 w-4" />Sair da conta
      </motion.button>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
