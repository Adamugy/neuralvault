import React from 'react';
import { LayoutDashboard, MessageSquareText, ScanEye, BrainCircuit, GraduationCap, Settings, ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';


interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggleCollapse, isMobileOpen = false, onMobileClose = () => {} }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const compact = isCollapsed && !isMobileOpen;

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Resources', icon: LayoutDashboard },
    { id: ViewState.CHAT, label: 'AI Tutor', icon: MessageSquareText },
    { id: ViewState.IMAGE_ANALYSIS, label: 'Image Analysis', icon: ScanEye },
    { id: ViewState.ACADEMIC_HELPER, label: 'Academic Helper', icon: GraduationCap },
  ];

  const hideWhenCompact = compact ? 'lg:sr-only' : '';

  const NavButton = ({ id, label, Icon }: { id: ViewState; label: string; Icon: React.ElementType }) => {
    const isActive = currentView === id;
    return (
      <button
        onClick={() => onNavigate(id)}
        aria-current={isActive ? 'page' : undefined}
        title={compact ? label : undefined}
        className={`w-full flex items-center gap-3 h-10 rounded-md text-sm font-medium transition-colors
          ${compact ? 'lg:justify-center lg:px-0 px-3' : 'px-3'}
          ${isActive
            ? 'bg-canvas text-ink shadow-soft'
            : 'text-muted hover:bg-surface-strong/60 hover:text-ink'
          }`}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary' : ''}`} aria-hidden="true" />
        <span className={hideWhenCompact}>{label}</span>
      </button>
    );
  };

  return (
    <>
        {/* Mobile Overlay */}
        {isMobileOpen && (
            <div
                className="fixed inset-0 bg-ink/40 z-40 lg:hidden"
                onClick={onMobileClose}
                aria-hidden="true"
            />
        )}

        {/* Sidebar Container */}
        <aside
          aria-label="Sidebar"
          className={`
            fixed inset-y-0 left-0 z-50 h-full
            lg:relative lg:translate-x-0
            transition-[transform,width] duration-300 ease-out
            bg-surface-soft border-r border-hairline
            flex flex-col justify-between overscroll-contain
            ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
            ${compact ? 'lg:w-[72px]' : 'w-64'}
        `}>
          <div>
            <div className={`h-16 flex items-center justify-between border-b border-hairline relative ${compact ? 'lg:justify-center px-5 lg:px-0' : 'px-5'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                 <BrainCircuit className="w-7 h-7 text-primary flex-shrink-0" aria-hidden="true" />
                 <span translate="no" className={`font-display text-2xl leading-none text-ink ${hideWhenCompact}`}>
                    NeuralVault
                 </span>
              </div>

              {/* Close Button Mobile */}
              <button
                onClick={onMobileClose}
                aria-label="Close menu"
                className="lg:hidden w-10 h-10 -mr-2 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-strong/60"
              >
                  <X className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Toggle Button Desktop */}
              <button
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!isCollapsed}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-canvas border border-hairline-strong rounded-full items-center justify-center text-muted hover:text-ink hover:border-ink hidden lg:flex z-50 transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            </div>

            <nav aria-label="Workspace" className="mt-5 flex flex-col gap-1 px-3">
              {navItems.map((item) => (
                <NavButton key={item.id} id={item.id} label={item.label} Icon={item.icon} />
              ))}
            </nav>
          </div>

          <div className="p-3 border-t border-hairline space-y-2">
            <NavButton id={ViewState.SETTINGS} label="Settings" Icon={Settings} />

            <div className={`flex items-center py-2 rounded-md ${compact ? 'lg:justify-center px-2 lg:px-0 gap-3 lg:gap-0' : 'px-2 gap-3'}`}>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || 'User'} width={32} height={32} className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden="true">{user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className={`min-w-0 ${hideWhenCompact}`}>
                <div className="text-sm font-medium text-ink truncate">
                  {user?.name || 'Account'}
                </div>
                <div className="text-xs text-muted truncate">
                  {user?.email || ''}
                </div>
              </div>
            </div>

            <button
              onClick={async () => { await signOut(); navigate('/'); }}
              aria-label={compact ? 'Log Out' : undefined}
              title={compact ? 'Log Out' : undefined}
              className={`w-full flex items-center justify-center gap-2 h-10 rounded-md border border-hairline-strong text-sm font-medium text-body hover:text-ink hover:border-ink hover:bg-canvas transition-colors`}
            >
              {compact ? <LogOut className="w-4 h-4" aria-hidden="true" /> : 'Log Out'}
            </button>
          </div>
        </aside>
    </>
  );
};
