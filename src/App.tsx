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
import DashboardPage    from "@/pages/DashboardPage";
import ReportsPage      from "@/pages/ReportsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import GoalsPage        from "@/pages/GoalsPage";
import AIInsightsPage   from "@/pages/AIInsightsPage";
import InvestmentsPage  from "@/pages/InvestmentsPage";
import ProfilePage      from "@/pages/ProfilePage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import AdminPage        from "@/pages/AdminPage";
import LandingPage      from "@/pages/LandingPage";
import AjudaPage        from "@/pages/AjudaPage";
import PrivacidadePage  from "@/pages/PrivacidadePage";
import TermosPage       from "@/pages/TermosPage";
import LoginPage           from "@/pages/LoginPage";
import RegisterPage        from "@/pages/RegisterPage";
import ForgotPasswordPage  from "@/pages/ForgotPasswordPage";
import ResetPasswordPage   from "@/pages/ResetPasswordPage";
import VerifyEmailPage     from "@/pages/VerifyEmailPage";
import NotFound            from "./pages/NotFound";

const queryClient = new QueryClient();

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
              </BrowserRouter>
            </FinanceProvider>
          </PeriodProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
