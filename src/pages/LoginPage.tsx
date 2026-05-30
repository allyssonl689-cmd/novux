import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleButton } from '@/components/auth/GoogleButton';

/* N lettermark animado — gráfico de barras → logo Novux */
function IntroLogo({ done }: { done: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      {/* Glow ring de fundo */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, hsl(193 100% 54% / 0.15), hsl(258 87% 66% / 0.12))' }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      />
      {/* Borda com gradiente */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ border: '1px solid hsl(193 100% 54% / 0.3)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      />

      <AnimatePresence mode="wait">
        {!done ? (
          /* Fase 1: barras de gráfico crescendo */
          <motion.svg key="chart" viewBox="0 0 40 40" className="relative z-10 w-10 h-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}>
            <motion.rect x="4" y="28" width="6" height="8" rx="1.5" fill="hsl(193 100% 54% / 0.6)"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: 0.1, duration: 0.3, ease: 'backOut' }} style={{ transformOrigin: 'bottom' }} />
            <motion.rect x="13" y="20" width="6" height="16" rx="1.5" fill="hsl(193 100% 54% / 0.75)"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: 0.2, duration: 0.3, ease: 'backOut' }} style={{ transformOrigin: 'bottom' }} />
            <motion.rect x="22" y="13" width="6" height="23" rx="1.5" fill="hsl(193 100% 54% / 0.88)"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: 0.3, duration: 0.3, ease: 'backOut' }} style={{ transformOrigin: 'bottom' }} />
            <motion.rect x="31" y="7" width="6" height="29" rx="1.5" fill="hsl(193 100% 54%)"
              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ delay: 0.4, duration: 0.3, ease: 'backOut' }} style={{ transformOrigin: 'bottom' }} />
          </motion.svg>
        ) : (
          /* Fase 2: N lettermark Novux com gradiente */
          <motion.svg key="nmark" viewBox="0 0 40 40" fill="none" className="relative z-10 w-10 h-10"
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}>
            <defs>
              <linearGradient id="lg" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#16C7FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            {/* Glow suave atrás do N */}
            <path d="M10 30 L10 10 L30 30 L30 10" stroke="url(#lg)" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.25} />
            {/* N principal */}
            <path d="M10 30 L10 10 L30 30 L30 10" stroke="url(#lg)" strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  const { login, loginWith2FA } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* 2FA step */
  const [totpStep, setTotpStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  /* Intro states: 'chart' → 'morph' → 'done' */
  const [phase, setPhase] = useState<'chart' | 'morph' | 'done'>('chart');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('morph'), 900);
    const t2 = setTimeout(() => setPhase('done'), 1250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const formReady = phase === 'done';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result && 'requires2FA' in result) {
        setTempToken(result.tempToken);
        setTotpStep(true);
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWith2FA(tempToken, totpCode);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código inválido');
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">

      {/* Subtle background glow that fades in */}
      <motion.div
        className="pointer-events-none fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: formReady ? 1 : 0 }}
        transition={{ duration: 1 }}
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo + brand */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <IntroLogo done={phase !== 'chart'} />

          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1
              className="text-3xl font-black text-foreground"
              style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.04em' }}
            >
              Novux <span className="font-semibold text-muted-foreground">Finance</span>
            </h1>
            <motion.p
              className="text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Seu copiloto financeiro pessoal
            </motion.p>
          </motion.div>
        </div>

        {/* Form — springs in after morph completes */}
        <AnimatePresence mode="wait">
          {totpStep ? (
            <motion.form
              key="totp"
              onSubmit={handleTotpSubmit}
              className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Verificação em 2 etapas</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Abra seu app autenticador e insira o código de 6 dígitos.
              </p>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Código TOTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  placeholder="000000"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors tracking-[0.4em] text-center font-mono"
                />
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="btn-novux w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Verificar'}
              </button>

              <button
                type="button"
                onClick={() => { setTotpStep(false); setError(''); setTotpCode(''); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Voltar ao login
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="login"
              onSubmit={handleSubmit}
              className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={formReady
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 24, scale: 0.97 }
              }
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
            >
              <motion.p
                className="text-xs font-semibold text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={formReady ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.2 }}
              >
                Entre na sua conta
              </motion.p>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Senha</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:opacity-80 transition-opacity"
                  >
                    Esqueci a senha
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 pr-10 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-novux w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="relative flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium">ou continue com</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <GoogleButton />

              <p className="text-center text-xs text-muted-foreground">
                Não tem conta?{' '}
                <Link to="/register" className="font-semibold text-primary hover:opacity-80 transition-opacity">
                  Criar conta
                </Link>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
