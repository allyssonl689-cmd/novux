import { LayoutDashboard, BarChart3, ArrowLeftRight, Target, Cpu, TrendingUp, User, Sparkles } from 'lucide-react';
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
  { title: 'IA Copiloto',   url: '/ia-insights',  icon: Cpu, badge: 'AI' },
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
      <div className={`flex items-center gap-3 border-b border-sidebar-border ${collapsed ? 'p-3 justify-center' : 'px-5 py-4'}`}>
        {/* Novux logomark — N geometric */}
        <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: 'hsl(234 38% 8%)', border: '1px solid hsl(234 28% 16%)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="2" width="5" height="18" rx="1.5"
              style={{ fill: 'url(#ng)' }} />
            <rect x="15" y="2" width="5" height="18" rx="1.5"
              style={{ fill: 'url(#ng)' }} />
            <polygon points="2,2 7,2 20,18 15,18"
              style={{ fill: 'url(#ng2)' }} />
            <circle cx="19" cy="3.5" r="2.5" fill="#00D4FF" opacity="0.9"/>
            <defs>
              <linearGradient id="ng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF"/>
                <stop offset="100%" stopColor="#7B6FFF"/>
              </linearGradient>
              <linearGradient id="ng2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00D4FF"/>
                <stop offset="50%" stopColor="#7B6FFF"/>
                <stop offset="100%" stopColor="#FF6B9D"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {!collapsed && (
          <div>
            <p className="text-sm font-black text-foreground leading-none"
              style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.04em' }}>
              <span className="text-gradient">Novux</span>
              <span className="text-foreground/60 font-medium"> Finance</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
              Novo nível. Sua vida financeira.
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
