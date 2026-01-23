import React from 'react';
import { LayoutDashboard, MessageSquareText, ScanEye, BrainCircuit, Github, GraduationCap, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth, useUser } from '../contexts/AuthContext';
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

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Resources', icon: LayoutDashboard },
    { id: ViewState.CHAT, label: 'AI Tutor', icon: MessageSquareText },
    { id: ViewState.IMAGE_ANALYSIS, label: 'Image Analysis', icon: ScanEye },
    { id: ViewState.ACADEMIC_HELPER, label: 'Academic Helper', icon: GraduationCap },
  ];

  return (
    <>
        {/* Mobile Overlay */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                onClick={onMobileClose}
            />
        )}

        {/* Sidebar Container */}
        <div className={`
            fixed inset-y-0 left-0 z-50 h-full
            lg:relative lg:translate-x-0
            transition-transform duration-300 ease-out
            bg-slate-950/95 backdrop-blur-xl border-r border-white/10
            flex flex-col justify-between
            ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed && !isMobileOpen ? 'lg:w-20' : 'w-64'}
        `}>
          <div>
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 relative">
              <div className="flex items-center gap-3">
                 <BrainCircuit className="w-8 h-8 text-[var(--neon-primary)] animate-pulse-glow flex-shrink-0" />
                 <span className={`font-bold text-xl neon-gradient-text transition-all duration-300 ${isCollapsed && !isMobileOpen ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0' : 'opacity-100'}`}>
                    NeuralVault
                 </span>
              </div>
              
              {/* Close Button Mobile */}
              <button onClick={onMobileClose} className="lg:hidden text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
              </button>
              
              {/* Toggle Button Desktop */}
              <button 
                onClick={onToggleCollapse}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--neon-primary)] rounded-full items-center justify-center text-white hidden lg:flex shadow-[0_0_10px_var(--neon-primary)] z-50 hover:scale-110 transition-transform"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-2 px-2">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center py-2 px-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                      ${(isCollapsed && !isMobileOpen) ? 'justify-center' : 'px-4'}
                      ${isActive 
                        ? 'bg-[var(--neon-primary)]/10 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20 shadow-[0_0_15px_-10px_var(--neon-primary)]' 
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                      }`}
                  >
                    <item.icon className={`w-5 h-5 z-10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[var(--neon-primary)]' : 'group-hover:text-white'}`} />
                    <span className={`text-[13px] font-medium transition-all duration-300 z-10 ${isActive ? 'text-[var(--neon-primary)]' : ''} ${(isCollapsed && !isMobileOpen) ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0' : 'opacity-100 ml-3'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--neon-primary)] shadow-[0_0_10px_var(--neon-primary)]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-white/10">
            <button
                onClick={() => onNavigate(ViewState.SETTINGS)}
                className={`w-full flex items-center py-2 px-3 rounded-xl transition-all duration-200 group mb-4 relative overflow-hidden
                ${(isCollapsed && !isMobileOpen) ? 'justify-center' : 'px-4'}
                ${currentView === ViewState.SETTINGS
                    ? 'bg-[var(--neon-primary)]/10 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20 shadow-[0_0_15px_-10px_var(--neon-primary)]' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                }`}
            >
                <Settings className={`w-5 h-5 z-10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${currentView === ViewState.SETTINGS ? 'text-[var(--neon-primary)]' : 'group-hover:text-white'}`} />
                <span className={`text-[13px] font-medium transition-all duration-300 z-10 ${currentView === ViewState.SETTINGS ? 'text-[var(--neon-primary)]' : ''} ${(isCollapsed && !isMobileOpen) ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0' : 'opacity-100 ml-3'}`}>
                    Settings
                </span>
                {currentView === ViewState.SETTINGS && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-[var(--neon-primary)] shadow-[0_0_10px_var(--neon-primary)]" />
                )}
            </button>

            <div className={`flex items-center mb-3 py-2 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 ${(isCollapsed && !isMobileOpen) ? 'lg:px-0 lg:justify-center' : 'px-3 gap-3'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border border-[var(--neon-primary)]/30 flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={`min-w-0 transition-all duration-300 ${(isCollapsed && !isMobileOpen) ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0' : 'opacity-100'}`}>
                <div className="text-sm font-medium text-slate-200 truncate">
                  {user?.name || 'Account'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {user?.email || ''}
                </div>
              </div>
            </div>

            <button
              onClick={async () => { await signOut(); navigate('/'); }}
              className={`flex w-full items-center justify-center py-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10 hover:text-slate-200 transition-all mb-4 text-xs font-medium ${(isCollapsed && !isMobileOpen) ? 'lg:flex px-0' : 'flex px-4'}`}
            >
              {(isCollapsed && !isMobileOpen) ? <ChevronLeft className="rotate-180 w-4 h-4" /> : 'Log Out'}
            </button>
          </div>
        </div>
    </>
  );
};