import React, { useState } from 'react';
import { User, CreditCard, Shield, Layout, Bell, Check, Zap, Building, Lock, Loader2, Fingerprint, Mail, RefreshCcw } from 'lucide-react';
import { UserProfile, AppSettings, PlanTier } from '../types';
import { usePasskeys } from '../hooks/usePasskeys';
import { useAuth } from '../contexts/AuthContext';

interface SettingsProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ 
  userProfile, 
  setUserProfile, 
  appSettings, 
  setAppSettings,
  onSaveProfile
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'appearance' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { registerPasskey } = usePasskeys();
  const { refreshUser } = useAuth();

  const handleSave = async () => {
    if (!onSaveProfile) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveProfile(userProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    try {
      await registerPasskey(userProfile.email);
      alert('Passkey registrada com sucesso!');
    } catch (error: any) {
      console.error('Passkey error:', error);
      alert(error.message);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Display & Layout', icon: Layout },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="h-full bg-transparent flex flex-col md:flex-row overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 glass-panel border-r border-white/10 p-6 flex-shrink-0 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white mb-4 px-2">Settings</h2>
        <nav className="space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--neon-primary)]/10 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20 shadow-[0_0_10px_-5px_var(--neon-primary)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Personal Information</h3>
                <p className="text-slate-500 text-sm">Manage your user details and role.</p>
              </div>

              <div className="flex items-center gap-6 p-6 glass-panel rounded-2xl border border-white/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--neon-primary)] to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl overflow-hidden border border-white/10">
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userProfile.name.charAt(0)
                  )}
                </div>
                <div>
                    <button className="text-sm bg-white/5 border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors">
                        Change Avatar
                    </button>
                    <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max 1MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition-all"
                    placeholder="Your First Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={userProfile.lastName || ''}
                    onChange={(e) => setUserProfile({...userProfile, lastName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition-all"
                    placeholder="Your Last Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Role / Title</label>
                  <input 
                    type="text" 
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition-all"
                  />
                </div>
              </div>

              {!userProfile.emailVerified && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${resendSuccess ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                      {resendSuccess ? <Check className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`${resendSuccess ? 'text-emerald-500' : 'text-amber-500'} text-sm font-medium`}>
                        {resendSuccess ? 'E-mail enviado!' : 'E-mail não verificado'}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {resendSuccess ? 'Verifique sua caixa de entrada e spam.' : 'Verifique seu e-mail para garantir a segurança da sua conta.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={async () => {
                            await refreshUser();
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        title="Checar status de verificação"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={async () => {
                        setIsResending(true);
                        setResendSuccess(false);
                        try {
                            const res = await fetch('/api/auth/resend-verification', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: userProfile.email })
                            });
                            if (res.ok) {
                                setResendSuccess(true);
                                setTimeout(() => setResendSuccess(false), 5000);
                            } else {
                                const data = await res.json();
                                alert(data.message || 'Falha ao reenviar');
                            }
                        } catch (err) {
                            alert('Erro ao reenviar verificação.');
                        } finally {
                            setIsResending(false);
                        }
                        }}
                        disabled={isResending || resendSuccess}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-2 ${
                            resendSuccess 
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border border-amber-500/30'
                        }`}
                    >
                        {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                        {resendSuccess ? 'Enviado' : 'Reenviar Link'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="pt-6 border-t border-white/10 flex justify-end gap-3 items-center">
                {saveSuccess && (
                  <span className="text-emerald-500 text-sm flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                    <Check className="w-4 h-4" /> Changes saved!
                  </span>
                )}
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/80 text-white rounded-lg font-medium shadow-[0_0_15px_-5px_var(--neon-primary)] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeTab === 'appearance' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Display & Layout</h3>
                    <p className="text-slate-500 text-sm">Customize how resources are presented.</p>
                </div>

                <div className="glass-panel border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-medium">Resource Layout</h4>
                            <p className="text-sm text-slate-400">Choose between a grid card view or a compact list view.</p>
                        </div>
                        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                            <button 
                                onClick={() => setAppSettings({...appSettings, resourceLayout: 'grid'})}
                                className={`p-2 rounded flex items-center gap-2 text-sm transition-all ${
                                    appSettings.resourceLayout === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Layout className="w-4 h-4" /> Grid
                            </button>
                            <button 
                                onClick={() => setAppSettings({...appSettings, resourceLayout: 'list'})}
                                className={`p-2 rounded flex items-center gap-2 text-sm transition-all ${
                                    appSettings.resourceLayout === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                <Building className="w-4 h-4" /> List
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-center justify-between">
                         <div>
                            <h4 className="text-white font-medium">Compact Density</h4>
                            <p className="text-sm text-slate-400">Reduce padding and font size for more information density.</p>
                        </div>
                        <button 
                            onClick={() => setAppSettings({...appSettings, compactMode: !appSettings.compactMode})}
                            className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.compactMode ? 'bg-[var(--neon-primary)]' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${appSettings.compactMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
             </div>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Security & Privacy</h3>
                    <p className="text-slate-500 text-sm">Manage your password and authentication methods.</p>
                </div>

                <div className="glass-panel border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                         <div className="flex gap-4">
                             <div className="p-3 bg-[var(--neon-primary)]/10 rounded-lg text-[var(--neon-primary)] border border-[var(--neon-primary)]/20">
                                 <Fingerprint className="w-6 h-6" />
                             </div>
                             <div>
                                <h4 className="text-white font-medium">Passkeys (WebAuthn)</h4>
                                <p className="text-sm text-slate-400">Ative o login sem senha usando biometria ou chaves USB.</p>
                            </div>
                         </div>
                        <button 
                            onClick={handleRegisterPasskey}
                            disabled={passkeyLoading}
                            className="px-4 py-2 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/80 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                        >
                            {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Passkey'}
                        </button>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-center justify-between">
                         <div className="flex gap-4">
                             <div className="p-3 bg-teal-500/10 rounded-lg text-teal-500 border border-teal-500/20">
                                 <Lock className="w-6 h-6" />
                             </div>
                             <div>
                                <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                                <p className="text-sm text-slate-400">Add an extra layer of security to your account.</p>
                            </div>
                         </div>
                        <button 
                            onClick={() => setAppSettings({...appSettings, twoFactorEnabled: !appSettings.twoFactorEnabled})}
                            className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.twoFactorEnabled ? 'bg-teal-600' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${appSettings.twoFactorEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div>
                        <h4 className="text-white font-medium mb-4">Change Password</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="password" placeholder="Current Password" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-[var(--neon-primary)] outline-none" />
                            <input type="password" placeholder="New Password" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-[var(--neon-primary)] outline-none" />
                        </div>
                        <button className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium border border-white/10 transition-colors">
                            Update Password
                        </button>
                    </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                    <h4 className="text-red-400 font-bold mb-2">Danger Zone</h4>
                    <p className="text-sm text-slate-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                    <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors">
                        Delete Account
                    </button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};