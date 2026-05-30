import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';

function StrengthDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-border'}`} />
  );
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const token     = params.get('token') ?? '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const rules = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
  };
  const strength = Object.values(rules).filter(Boolean).length;
  const allRules = strength === 4;
  const matches  = password === confirm && confirm.length > 0;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl text-center space-y-3 max-w-sm w-full">
          <p className="text-sm text-destructive font-medium">Link inválido ou expirado.</p>
          <Link to="/forgot-password" className="text-xs text-primary hover:opacity-80">
            Solicitar um novo link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRules || !matches) return;
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Senha redefinida!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua senha foi alterada com sucesso. Redirecionando para o login…
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-base font-bold text-foreground">Nova senha</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha uma senha forte para proteger sua conta.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoFocus
                      autoComplete="new-password"
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

                  {/* Barra de força */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength >= i
                                ? strength <= 1 ? 'bg-destructive'
                                : strength <= 2 ? 'bg-yellow-500'
                                : strength <= 3 ? 'bg-blue-400'
                                : 'bg-primary'
                                : 'bg-border'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {[
                          { key: 'length', label: '8+ caracteres' },
                          { key: 'upper',  label: 'Maiúscula' },
                          { key: 'lower',  label: 'Minúscula' },
                          { key: 'number', label: 'Número' },
                        ].map(r => (
                          <span key={r.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <StrengthDot active={rules[r.key as keyof typeof rules]} />
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Confirmar senha</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full rounded-xl border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none transition-colors ${
                      confirm.length > 0
                        ? matches ? 'border-primary/50' : 'border-destructive/50'
                        : 'border-border'
                    }`}
                  />
                  {confirm.length > 0 && !matches && (
                    <p className="text-[10px] text-destructive mt-1">As senhas não coincidem</p>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !allRules || !matches}
                  className="btn-novux w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>

              <div className="text-center">
                <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
