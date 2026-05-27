import { LayoutDashboard, BarChart3, ArrowLeftRight, Target, BrainCircuit, TrendingUp, User, Sparkles, Wallet } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard',     url: '/',             icon: LayoutDashboard },
  { title: 'Relatórios',    url: '/relatorios',   icon: BarChart3 },
  { title: 'Lançamentos',   url: '/lancamentos',  icon: ArrowLeftRight },
  { title: 'Metas',         url: '/metas',        icon: Target },
  { title: 'IA Copiloto',   url: '/ia-insights',  icon: BrainCircuit, badge: 'AI' },
  { title: 'Investimentos', url: '/investimentos',icon: TrendingUp },
  { title: 'Perfil',        url: '/perfil',       icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed  = state === 'collapsed';
  const location   = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border"
      style={{ background: 'hsl(var(--sidebar-background))' }}>

      {/* ── Logo ── */}
      <div className={`flex items-center gap-3 border-b border-sidebar-border ${collapsed ? 'p-3 justify-center' : 'px-5 py-5'}`}>
        {/* Novux logomark */}
        <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
          <Wallet className="h-5 w-5" />
        </div>

        {!collapsed && (
          <div>
            <p className="text-base font-black leading-none"
              style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.04em', color: 'hsl(var(--sidebar-foreground))' }}>
              Novux
              <span className="font-semibold" style={{ color: 'hsl(var(--sidebar-foreground) / 0.5)' }}> Finance</span>
            </p>
            <p className="text-[10px] mt-0.5 leading-none" style={{ color: 'hsl(var(--sidebar-foreground) / 0.4)' }}>
              Sua vida financeira
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {navItems.map(item => {
                const isActive = item.url === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === '/'} activeClassName=""
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group ${
                          isActive ? 'nav-active' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`}>
                        <item.icon className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-[hsl(193_100%_62%)]' : 'text-sidebar-foreground/55 group-hover:text-sidebar-accent-foreground'
                        }`} />
                        {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                        {!collapsed && (item as any).badge && (
                          <span className="badge-cyan text-[9px] px-1.5">{(item as any).badge}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Upgrade strip ── */}
      {!collapsed && (
        <div className="m-3 rounded-xl border p-3.5"
          style={{ borderColor: 'hsl(245 100% 72% / 0.25)', background: 'hsl(245 100% 72% / 0.05)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'hsl(245 80% 78%)' }} />
            <span className="text-xs font-bold" style={{ color: 'hsl(245 80% 78%)' }}>Plano Pro</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed mb-2.5">
            IA ilimitada, relatórios avançados e muito mais.
          </p>
          <button className="btn-novux w-full rounded-lg py-1.5 text-[10px] font-bold">
            Conhecer Pro →
          </button>
        </div>
      )}
    </Sidebar>
  );
}
