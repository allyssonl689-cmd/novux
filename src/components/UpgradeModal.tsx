import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { Check, Crown, Sparkles, TrendingUp, BarChart3, Wallet } from 'lucide-react';

const benefits = [
  { icon: Wallet, text: 'Saldo projetado para o fim do mês' },
  { icon: Sparkles, text: 'Dicas de economia personalizadas' },
  { icon: TrendingUp, text: 'Tendência de gastos com variação %' },
  { icon: BarChart3, text: 'Vilões financeiros — categorias que mais pesam' },
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { setPremiumPreview } = useFinance();

  const handleUnlock = () => {
    setPremiumPreview(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pt-8 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <DialogHeader className="mt-4">
            <DialogTitle className="text-xl font-extrabold text-primary-foreground">
              Desbloqueie todo o potencial
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
              Veja além dos números — entenda o que fazer com o seu dinheiro agora.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Benefits */}
        <div className="px-6 py-5 space-y-3">
          {benefits.map((b) => (
            <div key={b.text} className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <b.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{b.text}</p>
              <Check className="ml-auto h-4 w-4 shrink-0 text-success" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="border-t border-border px-6 py-5 space-y-3">
          <Button onClick={handleUnlock} className="w-full gap-2 text-base font-bold" size="lg">
            <Sparkles className="h-4 w-4" />
            Desbloquear versão completa
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Pré-visualização gratuita • Sem compromisso
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
