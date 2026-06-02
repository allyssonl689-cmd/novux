import { LayoutDashboard, ArrowLeftRight, Wallet, Target, BrainCircuit, TrendingUp, User, Sparkles, BarChart3, Settings, Crown, HelpCircle, ShieldCheck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

/* ── N lettermark SVG — adapta ao tema ── */
function NovuxMark({ size = 32, lightMode = false }: { size?: number; lightMode?: boolean }) {
  if (lightMode) {
    // Versão light: N em azul sólido (sem gradiente translúcido)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 24 L8 8 L24 24 L24 8" stroke="#0099FF" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nmg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16C7FF"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
      </defs>
      <path d="M8 24 L8 8 L24 24 L24 8" stroke="url(#nmg)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const navMain = [
  { title: 'Dashboard',     url: '/',             icon: LayoutDashboard },
  { title: 'Transações',    url: '/lancamentos',  icon: ArrowLeftRight },
  { title: 'Carteiras',     url: '/carteiras',    icon: Wallet,      soon: true },
  { title: 'Metas',         url: '/metas',        icon: Target },
  { title: 'Investimentos', url: '/investimentos',icon: TrendingUp },
  { title: 'IA Copilot',    url: '/ia-insights',  icon: BrainCircuit, badge: 'AI' },
];

const navBottom = [
  { title: 'Relatórios',    url: '/relatorios',   icon: BarChart3 },
  { title: 'Perfil',        url: '/perfil',       icon: User },
  { title: 'Configurações', url: '/configuracoes',icon: Settings },
  { title: 'Ajuda',         url: '/ajuda',        icon: HelpCircle },
];

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  soon?: boolean;
  external?: boolean;
};

function NavItem({ item, collapsed, isActive }: { item: NavItem; collapsed: boolean; isActive: boolean }) {
  const baseClass = `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group w-full ${
    isActive
      ? 'nav-active'
      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  } ${item.soon ? 'opacity-50 pointer-events-none' : ''}`;

  const iconClass = `h-4 w-4 shrink-0 transition-colors ${
    isActive
      ? 'text-[hsl(193_100%_65%)]'
      : 'text-sidebar-foreground/55 group-hover:text-sidebar-accent-foreground'
  }`;

  const target = item.external ? '_blank' : undefined;
  const rel    = item.external ? 'noopener noreferrer' : undefined;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={item.url} end={item.url === '/'} activeClassName="" className={baseClass} target={target} rel={rel}>
          <item.icon className={iconClass} />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.title}</span>
              {item.badge && <span className="badge-cyan">{item.badge}</span>}
              {item.soon && <span className="badge-soon">Em breve</span>}
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state }         = useSidebar();
  const { user }          = useAuth();
  const { theme }         = useTheme();
  const collapsed         = state === 'collapsed';
  const isLight           = theme === 'light';
  const location  = useLocation();

  function isActive(url: string) {
    return url === '/' ? location.pathname === '/' : location.pathname.startsWith(url);
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border"
      style={{ background: 'hsl(var(--sidebar-background))' }}>

      {/* ── Logo ── */}
      <div className={`flex items-center gap-3 border-b border-sidebar-border ${collapsed ? 'p-3 justify-center' : 'px-4 py-4'}`}>
        <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
          style={isLight
            ? { background: 'hsl(214 32% 94%)', border: '1px solid hsl(215 20% 82%)' }
            : { background: 'hsl(228 42% 18%)', border: '1px solid hsl(193 100% 54% / 0.2)' }}>
          <NovuxMark size={24} lightMode={isLight} />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="text-base font-black leading-none tracking-tight"
              style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.04em', color: 'hsl(var(--sidebar-accent-foreground))' }}>
              Novux
              <span className="font-light ml-1" style={{ color: 'hsl(var(--sidebar-foreground) / 0.5)' }}>Finance</span>
            </p>
            <p className="text-[10px] mt-0.5 leading-none" style={{ color: 'hsl(var(--sidebar-foreground) / 0.38)' }}>
              Seu copiloto financeiro
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <SidebarContent className="py-3 flex flex-col">

        {/* Main nav */}
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/35 px-3 mb-1.5">
                Principal
              </p>
            )}
            <SidebarMenu className="gap-0.5 px-2">
              {navMain.map(item => (
                <NavItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-4 my-1 h-px bg-sidebar-border" />

        {/* Bottom nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/35 px-3 mb-1.5">
                Conta
              </p>
            )}
            <SidebarMenu className="gap-0.5 px-2">
              {navBottom.map(item => (
                <NavItem key={item.title} item={item} collapsed={collapsed} isActive={isActive(item.url)} />
              ))}
              {/* Item Admin — visível apenas para administradores */}
              {user?.isAdmin && (
                <NavItem
                  item={{ title: 'Admin', url: '/admin', icon: ShieldCheck }}
                  collapsed={collapsed}
                  isActive={isActive('/admin')}
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Upgrade strip ── */}
        {!collapsed && (
          <div className="mx-3 mb-3 mt-2 rounded-xl p-3.5"
            style={{
              background: 'linear-gradient(135deg, hsl(258 87% 66% / 0.08) 0%, hsl(193 100% 54% / 0.06) 100%)',
              border: '1px solid hsl(258 87% 66% / 0.2)',
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #16C7FF, #8B5CF6)' }}>
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-bold text-gradient">Novux Pro</span>
            </div>
            <p className="text-[10px] leading-relaxed mb-2.5" style={{ color: 'hsl(var(--sidebar-foreground) / 0.65)' }}>
              IA ilimitada, relatórios avançados, carteiras e muito mais.
            </p>
            <button className="btn-novux w-full rounded-lg py-1.5 text-[10px] font-bold flex items-center justify-center gap-1.5">
              <Crown className="h-3 w-3" /> Seja Premium!
            </button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
