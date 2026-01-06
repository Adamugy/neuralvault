import React from 'react';
import { LayoutDashboard, MessageSquareText, ScanEye, BrainCircuit, Github, GraduationCap, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Resources', icon: LayoutDashboard },
    { id: ViewState.CHAT, label: 'AI Tutor', icon: MessageSquareText },
    { id: ViewState.IMAGE_ANALYSIS, label: 'Image Analysis', icon: ScanEye },
    { id: ViewState.ACADEMIC_HELPER, label: 'Academic Helper', icon: GraduationCap },
  ];

  return (
    <div className="w-20 lg:w-64 glass-panel border-r border-white/10 flex flex-col justify-between h-full transition-all duration-300 backdrop-blur-md">
      <div>
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10">
          <BrainCircuit className="w-8 h-8 text-[var(--neon-primary)] animate-pulse-glow" />
          <span className="ml-3 font-bold text-xl hidden lg:block neon-gradient-text">
            NeuralVault
          </span>
        </div>

        <nav className="mt-6 flex flex-col gap-2 px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center p-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-[var(--neon-primary)]/10 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20 shadow-[0_0_15px_-5px_var(--neon-primary)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:border hover:border-white/5'
                  }`}
              >
                <item.icon className={`w-6 h-6 z-10 ${isActive ? 'text-[var(--neon-primary)]' : 'group-hover:text-white'}`} />
                <span className={`ml-3 font-medium hidden lg:block z-10 ${isActive ? 'text-[var(--neon-primary)]' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--neon-primary)]/10 to-transparent opacity-50" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
        <button
            onClick={() => onNavigate(ViewState.SETTINGS)}
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group mb-4 relative overflow-hidden
            ${currentView === ViewState.SETTINGS
                ? 'bg-[var(--neon-primary)]/10 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20 shadow-[0_0_15px_-5px_var(--neon-primary)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white hover:border hover:border-white/5'
            }`}
        >
            <Settings className={`w-6 h-6 z-10 ${currentView === ViewState.SETTINGS ? 'text-[var(--neon-primary)]' : 'group-hover:text-white'}`} />
            <span className={`ml-3 font-medium hidden lg:block z-10 ${currentView === ViewState.SETTINGS ? 'text-[var(--neon-primary)]' : ''}`}>Settings</span>
        </button>

        <div className="hidden lg:flex items-center gap-3 mb-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-[var(--neon-primary)]/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">
              {user?.fullName || user?.firstName || 'Account'}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {user?.primaryEmailAddress?.emailAddress || ''}
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut(() => navigate('/'))}
          className="hidden lg:flex w-full items-center justify-center px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all mb-4 hover:shadow-[0_0_10px_-5px_rgba(255,255,255,0.3)]"
        >
          Sign Out
        </button>

        <div className="bg-black/40 rounded-lg p-3 hidden lg:block border border-white/5">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Deep Learning Hub</p>
          <div className="flex items-center gap-2 text-xs text-[var(--neon-secondary)]">
            <div className="w-2 h-2 bg-[var(--neon-secondary)] rounded-full animate-pulse shadow-[0_0_8px_var(--neon-secondary)]"></div>
            Online
          </div>
        </div>
        <div className="lg:hidden flex justify-center">
            <div className="w-2 h-2 bg-[var(--neon-secondary)] rounded-full animate-pulse shadow-[0_0_8px_var(--neon-secondary)]"></div>
        </div>
      </div>
    </div>
  );
};