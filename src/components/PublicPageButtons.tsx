import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, HelpCircle } from 'lucide-react';

/**
 * Botões flutuantes para páginas públicas:
 * - Scroll to top (aparece após rolar 300px)
 * - Botão Ajuda fixo no canto inferior direito
 * Não exibe o botão Ajuda na própria página /ajuda.
 */
export function PublicPageButtons({ hideHelp = false }: { hideHelp?: boolean }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    function onScroll() { setShowTop(window.scrollY > 300); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Botão Ajuda — sempre visível (exceto na própria página de ajuda) */}
      {!hideHelp && (
        <Link to="/ajuda"
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-all hover:scale-105"
          style={{ background: 'hsl(258 87% 66%)', color: '#fff', boxShadow: '0 4px 20px hsl(258 87% 66% / 0.4)' }}>
          <HelpCircle className="h-4 w-4" />
          Ajuda
        </Link>
      )}

      {/* Voltar ao topo — aparece após 300px de scroll */}
      <button
        onClick={scrollToTop}
        aria-label="Voltar ao topo"
        className={`h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          showTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ background: 'hsl(193 100% 54%)', color: '#000', boxShadow: '0 4px 16px hsl(193 100% 54% / 0.4)' }}>
        <ChevronUp className="h-5 w-5" />
      </button>
    </div>
  );
}
