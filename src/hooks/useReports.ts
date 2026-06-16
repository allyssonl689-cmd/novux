import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reportsService';
import { transactionService, TransactionFilters } from '@/services/transactionService';
import { useAuth } from '@/contexts/AuthContext';

/** Converte um Date para string local YYYY-MM-DD (sem offset UTC — evita off-by-one). */
export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useEnabled() {
  const { user, isAuthenticated, tokenReady } = useAuth();
  return { userId: user?.id, enabled: isAuthenticated && tokenReady && !!user?.id };
}

/** Agregados do período (atual + anterior + categorias) vindos do servidor. */
export function useReportSummary(start: string, end: string) {
  const { userId, enabled } = useEnabled();
  return useQuery({
    queryKey: ['reports', 'summary', userId, start, end],
    queryFn: () => reportsService.summary(start, end),
    enabled,
    staleTime: 60_000,
  });
}

/** Série mensal de todo o histórico (com status de pagamento). */
export function useMonthlyBreakdown() {
  const { userId, enabled } = useEnabled();
  return useQuery({
    queryKey: ['reports', 'monthly-breakdown', userId],
    queryFn: () => reportsService.monthlyBreakdown(),
    enabled,
    staleTime: 60_000,
  });
}

/** As N transações mais recentes do período (lista paginada, página 1). */
export function useRecentTransactions(start: string, end: string, limit = 7) {
  const { userId, enabled } = useEnabled();
  return useQuery({
    queryKey: ['transactions', 'recent', userId, start, end, limit],
    queryFn: () => transactionService.list({ startDate: start, endDate: end, limit, page: 1 }),
    enabled,
    staleTime: 60_000,
  });
}

/** Catálogo de tags distintas do usuário (filtro da tela de lançamentos). */
export function useTransactionTags() {
  const { userId, enabled } = useEnabled();
  return useQuery({
    queryKey: ['transactions', 'tags', userId],
    queryFn: () => transactionService.tags(),
    enabled,
    staleTime: 60_000,
  });
}

/** Lista paginada server-side (infinita) com filtros aplicados no servidor. */
export function usePaginatedTransactions(
  filters: Omit<TransactionFilters, 'page' | 'limit'>,
  pageSize = 50,
) {
  const { userId, enabled } = useEnabled();
  return useInfiniteQuery({
    queryKey: ['transactions', 'page', userId, filters, pageSize],
    queryFn: ({ pageParam }) => transactionService.list({ ...filters, page: pageParam, limit: pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length + 1 : undefined,
    enabled,
    staleTime: 30_000,
  });
}
