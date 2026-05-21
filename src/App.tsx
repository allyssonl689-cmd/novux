import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import DashboardPage    from "@/pages/DashboardPage";
import ReportsPage      from "@/pages/ReportsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import GoalsPage        from "@/pages/GoalsPage";
import AIInsightsPage   from "@/pages/AIInsightsPage";
import InvestmentsPage  from "@/pages/InvestmentsPage";
import ProfilePage      from "@/pages/ProfilePage";
import LoginPage        from "@/pages/LoginPage";
import RegisterPage     from "@/pages/RegisterPage";
import NotFound         from "./pages/NotFound";

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
                  <Route path="/login"    element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Rotas protegidas */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                      <Route path="/"              element={<DashboardPage />} />
                      <Route path="/relatorios"    element={<ReportsPage />} />
                      <Route path="/lancamentos"   element={<TransactionsPage />} />
                      <Route path="/metas"         element={<GoalsPage />} />
                      <Route path="/ia-insights"   element={<AIInsightsPage />} />
                      <Route path="/investimentos" element={<InvestmentsPage />} />
                      <Route path="/perfil"        element={<ProfilePage />} />
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
