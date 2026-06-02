import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Garante que toda navegação começa no topo da página */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);
  return null;
}
