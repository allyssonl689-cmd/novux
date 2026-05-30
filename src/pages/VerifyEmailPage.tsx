import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import { apiFetch } from '@/services/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token de verificação não encontrado.'); return; }

    apiFetch<{ success: boolean; message: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => { setStatus('success'); setMessage(res.message); })
      .catch((err: Error) => { setStatus('error'); setMessage(err.message ?? 'Link inválido ou expirado.'); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-4">

        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verificando seu e-mail...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-16 w-16 rounded-full bg-success-muted flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-bold text-foreground">E-mail verificado!</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/" className="btn-novux inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl">
              <MailCheck className="h-4 w-4" /> Acessar o app
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-16 w-16 rounded-full bg-alert-muted flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Link inválido</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Voltar ao login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
