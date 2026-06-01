import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleButton } from '@/components/auth/GoogleButton';

interface Rule { label: string; test: (p: string) => boolean }

const RULES: Rule[] = [
  { label: 'Mínimo 8 caracteres',       test: p => p.length >= 8 },
  { label: 'Letra maiúscula (A-Z)',      test: p => /[A-Z]/.test(p) },
  { label: 'Letra minúscula (a-z)',      test: p => /[a-z]/.test(p) },
  { label: 'Número (0-9)',               test: p => /[0-9]/.test(p) },
  { label: 'Caractere especial (!@#…)', test: p => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = RULES.filter(r => r.test(password)).length;
  if (password.length === 0) return { score: 0, label: '', color: '#e2e8f0' };
  if (passed <= 1) return { score: 1, label: 'Muito fraca', color: '#ef4444' };
  if (passed === 2) return { score: 2, label: 'Fraca',      color: '#f97316' };
  if (passed === 3) return { score: 3, label: 'Média',      color: '#f59e0b' };
  if (passed === 4) return { score: 4, label: 'Forte',      color: '#10b981' };
  return             { score: 5, label: 'Muito forte', color: '#0ea5e9' };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [consent, setConsent]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);

  const strength   = getStrength(password);
  const allPassed  = RULES.every(r => r.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allPassed) { setError('A senha não atende todos os requisitos de segurança.'); return; }
    if (!consent)   { setError('Você deve aceitar os Termos de Uso e a Política de Privacidade.'); return; }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.04em' }}>
            Novux <span className="font-semibold text-muted-foreground">Finance</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crie sua conta grátis</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Seu nome"
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>

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
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPwdFocused(true)}
                required
                autoComplete="new-password"
                placeholder="Crie uma senha segura"
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

            {/* Strength bar */}
            {password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 space-y-2"
              >
                {/* Bar track */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      className="flex-1 h-1 rounded-full"
                      animate={{ backgroundColor: i <= strength.score ? strength.color : '#e2e8f0' }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {RULES.filter(r => r.test(password)).length}/{RULES.length} critérios
                  </span>
                </div>

                {/* Rules checklist — shown when focused or has value */}
                {(pwdFocused || password.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1.5"
                  >
                    {RULES.map(rule => {
                      const ok = rule.test(password);
                      return (
                        <div key={rule.label} className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            ok ? 'bg-success-muted' : 'bg-secondary'
                          }`}>
                            {ok
                              ? <Check className="h-2.5 w-2.5 text-success" />
                              : <X className="h-2.5 w-2.5 text-muted-foreground" />
                            }
                          </div>
                          <span className={`text-[11px] transition-colors ${ok ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Consentimento LGPD */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border border-border accent-primary shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" className="text-primary hover:underline font-medium">Termos de Uso</Link>
              {' '}e a{' '}
              <Link to="/privacidade" target="_blank" className="text-primary hover:underline font-medium">Política de Privacidade</Link>
              , incluindo o tratamento dos meus dados pessoais conforme a LGPD.
            </span>
          </label>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (password.length > 0 && !allPassed) || !consent}
            className="btn-novux w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground font-medium">ou continue com</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <GoogleButton />

          <p className="text-center text-xs text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-semibold text-primary hover:opacity-80 transition-opacity">
              Entrar
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/home" className="hover:text-foreground transition-colors">
              ← Voltar ao início
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
