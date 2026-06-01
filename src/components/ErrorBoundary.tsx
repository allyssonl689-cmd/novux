import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-alert-muted flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Algo deu errado nesta seção</p>
            <p className="text-xs text-muted-foreground mt-1">
              {this.state.error?.message ?? 'Erro inesperado'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-novux px-5 py-2 text-xs font-bold rounded-xl">
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
