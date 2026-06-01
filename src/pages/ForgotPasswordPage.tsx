import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, MailCheck, Sun, Moon } from 'lucide-react';
import { authService } from '@/services/authService';
import { useTheme } from '@/contexts/ThemeContext';

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme toggle fixo */}
      <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        className="fixed top-4 right-4 h-8 w-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10">
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Verifique seu e-mail</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Se <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
                  Verifique também a caixa de spam.
                </p>
              </div>
              <Link
                to="/login"
                className="text-xs text-primary hover:opacity-80 transition-opacity flex items-center gap-1 mt-2"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-base font-bold text-foreground">Esqueceu a senha?</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                  />
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
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar ao login
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
