import React, { useState } from 'react';
import { User, CreditCard, Shield, Layout, Bell, Check, Zap, Building, Lock } from 'lucide-react';
import { UserProfile, AppSettings, PlanTier } from '../types';

interface SettingsProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onOpenUpgrade?: () => void;
  onOpenBillingPortal?: () => Promise<void> | void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  userProfile, 
  setUserProfile, 
  appSettings, 
  setAppSettings,
  onOpenUpgrade,
  onOpenBillingPortal,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'appearance' | 'security'>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
    { id: 'appearance', label: 'Display & Layout', icon: Layout },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const plans: { id: PlanTier; name: string; price: string; features: string[] }[] = [
    {
      id: 'free',
      name: 'Student',
      price: '$0',
      features: ['Unlimited Links', 'Basic AI Chat', '5 File Uploads', 'Community Support']
    },
    {
      id: 'researcher',
      name: 'Researcher',
      price: '$9.90/mo',
      features: ['Unlimited Files', 'Gemini 1.5 Flash', 'Image Analysis', 'Doc Export', 'Priority Support']
    },
    {
      id: 'researcher_pro',
      name: 'Researcher Pro',
      price: '$24.90/mo',
      features: ['Everything in Researcher', 'Gemini 1.5 Pro', 'Extended Context', 'Faster Responses', 'Premium Support']
    }
  ];

  return (
    <div className="h-full bg-transparent flex flex-col md:flex-row overflow-hidden">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 glass-panel border-r border-white/10 p-6 flex-shrink-0 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white mb-6 px-2">Settings</h2>
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
      <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Profile Section */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Personal Information</h3>
                <p className="text-slate-400">Manage your user details and role.</p>
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
                  <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition-all"
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
              
              <div className="pt-6 border-t border-white/10 flex justify-end">
                <button className="px-6 py-2.5 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/80 text-white rounded-lg font-medium shadow-[0_0_15px_-5px_var(--neon-primary)] transition-all">
                    Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeTab === 'billing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div>
                <h3 className="text-2xl font-bold text-white mb-1">Subscription Plans</h3>
                <p className="text-slate-400">Upgrade your workspace for advanced AI features.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isCurrent = userProfile.plan === plan.id;
                    return (
                        <div key={plan.id} className={`relative p-6 rounded-2xl border flex flex-col transition-all duration-300 ${isCurrent ? 'bg-[var(--neon-primary)]/10 border-[var(--neon-primary)] shadow-[0_0_30px_-10px_var(--neon-primary)]' : 'glass-panel border-white/10 hover:border-white/20'}`}>
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--neon-primary)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                    CURRENT PLAN
                                </div>
                            )}
                            <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                            <div className="text-3xl font-bold text-white mt-2 mb-4">{plan.price}</div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feat, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                        <Check className="w-4 h-4 text-[var(--neon-primary)] mt-0.5 flex-shrink-0" />
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => {
                                  if (isCurrent) return;
                                  onOpenUpgrade?.();
                                }}
                                disabled={isCurrent}
                                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                                    isCurrent 
                                    ? 'bg-white/5 text-slate-500 cursor-default border border-white/10' 
                                    : 'bg-white text-slate-950 hover:bg-slate-200'
                                }`}
                            >
                                {isCurrent ? 'Active' : 'Upgrade'}
                            </button>
                        </div>
                    );
                })}
              </div>

              <div className="p-6 glass-panel border border-white/10 rounded-2xl flex items-center justify-between">
                 <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-slate-400" /> Billing
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">Subscriptions are managed securely via Stripe.</p>
                 </div>
                 <button
                   onClick={() => {
                     void onOpenBillingPortal?.();
                   }}
                   className="text-sm text-[var(--neon-primary)] hover:text-white font-medium transition-colors"
                 >
                   Manage
                 </button>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeTab === 'appearance' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-1">Display & Layout</h3>
                    <p className="text-slate-400">Customize how resources are presented.</p>
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
                    <h3 className="text-2xl font-bold text-white mb-1">Security & Privacy</h3>
                    <p className="text-slate-400">Manage your password and authentication methods.</p>
                </div>

                <div className="glass-panel border border-white/10 rounded-2xl p-6 space-y-6">
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