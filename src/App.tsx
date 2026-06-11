import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { ProtectedRoute, AdminRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";

// Páginas carregadas sob demanda (code-splitting) — reduz o bundle inicial.
// Recharts, jsPDF, Framer e a landing pública deixam de pesar no primeiro acesso.
const DashboardPage     = lazy(() => import("@/pages/DashboardPage"));
const ReportsPage       = lazy(() => import("@/pages/ReportsPage"));
const TransactionsPage  = lazy(() => import("@/pages/TransactionsPage"));
const GoalsPage         = lazy(() => import("@/pages/GoalsPage"));
const AIInsightsPage    = lazy(() => import("@/pages/AIInsightsPage"));
const InvestmentsPage   = lazy(() => import("@/pages/InvestmentsPage"));
const ProfilePage       = lazy(() => import("@/pages/ProfilePage"));
const ConfiguracoesPage = lazy(() => import("@/pages/ConfiguracoesPage"));
const AdminPage         = lazy(() => import("@/pages/AdminPage"));
const LandingPage       = lazy(() => import("@/pages/LandingPage"));
const AjudaPage         = lazy(() => import("@/pages/AjudaPage"));
const PrivacidadePage   = lazy(() => import("@/pages/PrivacidadePage"));
const TermosPage        = lazy(() => import("@/pages/TermosPage"));
const LoginPage           = lazy(() => import("@/pages/LoginPage"));
const RegisterPage        = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage  = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage   = lazy(() => import("@/pages/ResetPasswordPage"));
const VerifyEmailPage     = lazy(() => import("@/pages/VerifyEmailPage"));
const NotFound            = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** Fallback do Suspense enquanto o chunk da rota carrega. */
function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <PeriodProvider>
            <FinanceProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ScrollToTop />
                <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Rotas públicas */}
                  <Route path="/home"    element={<LandingPage />} />
                  <Route path="/ajuda"      element={<AjudaPage />} />
                  <Route path="/privacidade" element={<PrivacidadePage />} />
                  <Route path="/termos"     element={<TermosPage />} />
                  <Route path="/login"           element={<LoginPage />} />
                  <Route path="/register"        element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password"  element={<ResetPasswordPage />} />
                  <Route path="/verify-email"    element={<VerifyEmailPage />} />

                  {/* Rota admin — layout próprio, sem sidebar */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>

                  {/* Rotas protegidas com sidebar */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                      <Route path="/"              element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                      <Route path="/relatorios"    element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
                      <Route path="/lancamentos"   element={<TransactionsPage />} />
                      <Route path="/metas"         element={<GoalsPage />} />
                      <Route path="/ia-insights"   element={<AIInsightsPage />} />
                      <Route path="/investimentos" element={<InvestmentsPage />} />
                      <Route path="/perfil"        element={<ProfilePage />} />
                      <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </FinanceProvider>
          </PeriodProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
