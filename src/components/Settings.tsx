import React, { useState } from 'react';
import { User, CreditCard, Shield, Layout, Bell, Check, Zap, Building, Lock, Loader2, Fingerprint, Mail, RefreshCcw } from 'lucide-react';
import { UserProfile, AppSettings, PlanTier } from '../types';
import { usePasskeys } from '../hooks/usePasskeys';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

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
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  // 2FA states
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [twoFactorQRCode, setTwoFactorQRCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { registerPasskey } = usePasskeys();
  const { refreshUser, getToken } = useAuth();
  const { showToast, confirm, prompt } = useNotification();

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
      showToast('Failed to save profile changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    try {
      await registerPasskey(userProfile.email);
      setUserProfile(prev => ({ ...prev, hasPasskey: true }));
      showToast('Passkey registered successfully!', 'success');
    } catch (error: any) {
      console.error('Passkey error:', error);
      showToast(error.message, 'error');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast('File too large. Max 1MB allowed.', 'warning');
      return;
    }

    setAvatarLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Upload failed');
      }

      const data = await res.json();
      setUserProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
      await refreshUser(); // Update AuthContext state
      showToast('Avatar updated successfully!', 'success');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      showToast(error.message || 'Failed to update avatar', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate2FA = async () => {
    setIsVerifying2FA(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/auth/2fa/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTwoFactorQRCode(data.qrCodeUrl);
      setTwoFactorSecret(data.secret);
      setIsSettingUp2FA(true);
    } catch (err: any) {
      showToast(err.message || 'Error generating 2FA', 'error');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleEnable2FA = async () => {
    setIsVerifying2FA(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: twoFactorVerifyCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setUserProfile(prev => ({ ...prev, twoFactorEnabled: true }));
      setAppSettings(prev => ({ ...prev, twoFactorEnabled: true }));
      setIsSettingUp2FA(false);
      setTwoFactorVerifyCode('');
      showToast('2FA enabled successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error enabling 2FA', 'error');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    const confirmed = await confirm('Are you sure you want to disable two-factor authentication? Your account will be less secure.', 'Disable 2FA');
    if (!confirmed) return;
    
    const code = await prompt('Enter your 6-digit code to disable:', '000000', 'Verify 2FA Code');
    if (!code) return;

    setIsVerifying2FA(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setUserProfile(prev => ({ ...prev, twoFactorEnabled: false }));
      setAppSettings(prev => ({ ...prev, twoFactorEnabled: false }));
      showToast('2FA disabled.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error disabling 2FA', 'error');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Display & Layout', icon: Layout },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="h-full bg-transparent flex flex-col md:flex-row overflow-hidden">
      {/* Settings Sidebar / Mobile Tabs */}
      <div className="w-full md:w-64 glass-panel border-b md:border-b-0 md:border-r border-hairline p-4 md:p-6 flex-shrink-0 z-10">
        <h2 className="text-lg font-bold text-ink mb-4 px-2 hidden md:block">Settings</h2>
        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[var(--neon-primary)]/10 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20'
                  : 'text-muted hover:bg-surface-soft hover:text-ink border border-transparent'
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
                <h3 className="text-xl font-bold text-ink mb-1">Personal Information</h3>
                <p className="text-muted text-sm">Manage your user details and role.</p>
              </div>

              <div className="flex items-center gap-6 p-6 glass-panel rounded-xl border border-hairline">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-medium text-white shadow-lift overflow-hidden border border-hairline">
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
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAvatarChange} 
                      className="hidden" 
                      accept="image/*"
                    />
                    <button 
                      onClick={handleAvatarSelect}
                      disabled={avatarLoading}
                      className="text-sm bg-surface-soft border border-hairline text-body px-3 py-1.5 rounded-lg hover:text-ink hover:bg-surface-card transition-colors flex items-center gap-2"
                    >
                        {avatarLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Change Avatar'}
                    </button>
                    <p className="text-xs text-muted mt-2">JPG, GIF or PNG. Max 1MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    className="w-full bg-surface-soft border border-hairline rounded-lg px-4 py-2.5 text-ink focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition"
                    placeholder="Your First Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={userProfile.lastName || ''}
                    onChange={(e) => setUserProfile({...userProfile, lastName: e.target.value})}
                    className="w-full bg-surface-soft border border-hairline rounded-lg px-4 py-2.5 text-ink focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition"
                    placeholder="Your Last Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    className="w-full bg-surface-soft border border-hairline rounded-lg px-4 py-2.5 text-ink focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Role / Title</label>
                  <input 
                    type="text" 
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                    className="w-full bg-surface-soft border border-hairline rounded-lg px-4 py-2.5 text-ink focus:ring-2 focus:ring-[var(--neon-primary)] outline-none transition"
                  />
                </div>
              </div>

              {!userProfile.emailVerified && (
                <div className="p-4 bg-amber/15 border border-amber/40 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${resendSuccess ? 'bg-success/15 text-success-ink' : 'bg-amber/15 text-amber-ink'}`}>
                      {resendSuccess ? <Check className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`${resendSuccess ? 'text-success-ink' : 'text-amber-ink'} text-sm font-medium`}>
                        {resendSuccess ? 'Email sent!' : 'Email not verified'}
                      </p>
                      <p className="text-muted text-xs">
                        {resendSuccess ? 'Check your inbox and spam folder.' : 'Verify your email to ensure your account security.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={async () => {
                            await refreshUser();
                        }}
                        className="p-2 text-muted hover:text-ink hover:bg-surface-soft rounded-lg transition-colors"
                        title="Check verification status"
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
                                alert(data.message || 'Failed to resend');
                            }
                        } catch (err) {
                            alert('Error resending verification.');
                        } finally {
                            setIsResending(false);
                        }
                        }}
                        disabled={isResending || resendSuccess}
                        className={`text-xs px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-2 ${
                            resendSuccess 
                            ? 'bg-success/15 text-success-ink border border-success/40' 
                            : 'bg-amber/15 hover:bg-amber/15 text-amber-ink border border-amber/40'
                        }`}
                    >
                        {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                        {resendSuccess ? 'Sent' : 'Resend Link'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="pt-6 border-t border-hairline flex justify-end gap-3 items-center">
                {saveSuccess && (
                  <span className="text-success-ink text-sm flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                    <Check className="w-4 h-4" /> Changes saved!
                  </span>
                )}
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[var(--neon-primary)] hover:bg-primary-active text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
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
                    <h3 className="text-xl font-bold text-ink mb-1">Display & Layout</h3>
                    <p className="text-muted text-sm">Customize how resources are presented.</p>
                </div>

                <div className="glass-panel rounded-xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-ink font-medium">Resource Layout</h4>
                            <p className="text-sm text-muted">Choose between a grid card view or a compact list view.</p>
                        </div>
                        <div className="flex bg-surface-soft p-1 rounded-lg border border-hairline">
                            <button 
                                onClick={() => setAppSettings({...appSettings, resourceLayout: 'grid'})}
                                className={`p-2 rounded flex items-center gap-2 text-sm transition ${
                                    appSettings.resourceLayout === 'grid' ? 'bg-surface-card text-ink shadow-sm' : 'text-muted hover:text-ink'
                                }`}
                            >
                                <Layout className="w-4 h-4" /> Grid
                            </button>
                            <button 
                                onClick={() => setAppSettings({...appSettings, resourceLayout: 'list'})}
                                className={`p-2 rounded flex items-center gap-2 text-sm transition ${
                                    appSettings.resourceLayout === 'list' ? 'bg-surface-card text-ink shadow-sm' : 'text-muted hover:text-ink'
                                }`}
                            >
                                <Building className="w-4 h-4" /> List
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-surface-card" />

                    <div className="flex items-center justify-between">
                         <div>
                            <h4 className="text-ink font-medium">Compact Density</h4>
                            <p className="text-sm text-muted">Reduce padding and font size for more information density.</p>
                        </div>
                        <button 
                            onClick={() => setAppSettings({...appSettings, compactMode: !appSettings.compactMode})}
                            className={`w-12 h-6 rounded-full transition-colors relative ${appSettings.compactMode ? 'bg-[var(--neon-primary)]' : 'bg-surface-card'}`}
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
                    <h3 className="text-xl font-bold text-ink mb-1">Security & Privacy</h3>
                    <p className="text-muted text-sm">Manage your password and authentication methods.</p>
                </div>

                <div className="glass-panel rounded-xl p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="flex gap-4">
                             <div className="p-3 bg-[var(--neon-primary)]/10 rounded-lg text-[var(--neon-primary)] border border-[var(--neon-primary)]/20 flex-shrink-0">
                                 <Fingerprint className="w-6 h-6" />
                             </div>
                             <div>
                                <h4 className="text-ink font-medium">Passkeys (WebAuthn)</h4>
                                <p className="text-sm text-muted">Enable passwordless login using biometrics or USB keys.</p>
                                <div className="flex flex-wrap gap-3 mt-2 text-muted">
                                    <div className="flex items-center gap-1.5 transition-colors hover:text-[#0078d4]" title="Windows Hello">
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M0 0v11.408h11.408V0zm12.592 0v11.408H24V0zM0 12.592V24h11.408V12.592zm12.592 0V24H24V12.592z"/></svg>
                                        <span className="text-xs font-bold uppercase tracking-tighter">Windows</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 transition-colors hover:text-ink" title="Apple FaceID/TouchID">
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.057 12.767c.013 2.59 2.233 3.504 2.26 3.518-.02.07-.353 1.205-1.154 2.373-.692 1.01-1.41 2.016-2.531 2.037-1.099.02-1.455-.648-2.715-.648-1.258 0-1.652.627-2.713.67-.1.01-1.921.03-2.674-1.071-.85-1.11-1.453-2.822-1.453-4.529 0-2.747 1.782-4.194 3.532-4.194.896 0 1.74.62 2.29.62.548 0 1.57-.756 2.65-.756 1.127 0 2.155.589 2.808 1.48-.09.055-2.3 1.282-2.3 4.5zm-2.028-7.536c.559-.678.937-1.621.834-2.564-.811.033-1.79.54-2.374 1.22-.524.603-.982 1.564-.86 2.483.903.07 1.84-.461 2.4-.139z"/></svg>
                                        <span className="text-xs font-bold uppercase tracking-tighter">Apple</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 transition-colors hover:text-[#3ddc84]" title="Android">
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9995-.4486-.9995-.9997s.4484-.9997.9995-.9997.9995.4486.9995.9997-.4484.9997-.9995.9997m-11046 0c-.5511 0-.9995-.4486-.9995-.9997s.4484-.9997.9995-.9997.9995.4486.9995.9997-.4484.9997-.9995.9997m11.4045-6.0232l1.9973-3.4592c.1118-.1938.0456-.4412-.1481-.5531-.1939-.1117-.4413-.0456-.553.1481l-2.0213 3.5008c-1.4924-.6831-3.1558-1.0725-4.9082-1.0725s-3.4158.3894-4.9082 1.0725l-2.0213-3.5008c-.1117-.1937-.3591-.2598-.553-.1481-.1938.1119-.2599.3593-.1481.5531l1.9973 3.4592c-3.193 1.8383-5.3491 5.2533-5.3491 9.1917h20.404c0-3.9384-2.1561-7.3534-5.3491-9.1917"/></svg>
                                        <span className="text-xs font-bold uppercase tracking-tighter">Android</span>
                                    </div>
                                </div>
                            </div>
                         </div>
                        <button 
                            onClick={handleRegisterPasskey}
                            disabled={passkeyLoading || userProfile.hasPasskey}
                            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                                userProfile.hasPasskey 
                                ? 'bg-success/15 text-success-ink cursor-not-allowed border border-success/40' 
                                : 'bg-[var(--neon-primary)] hover:bg-primary-active text-white'
                            }`}
                        >
                            {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : userProfile.hasPasskey ? <Check className="w-4 h-4" /> : null}
                            {userProfile.hasPasskey ? 'Registered' : 'Register Passkey'}
                        </button>
                    </div>

                    <div className="h-px bg-surface-card" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div className="flex gap-4">
                             <div className="p-3 bg-teal/15 rounded-lg text-teal-ink border border-hairline-strong flex-shrink-0">
                                 <Lock className="w-6 h-6" />
                             </div>
                             <div>
                                <h4 className="text-ink font-medium">Two-Factor Authentication (TOTP)</h4>
                                <p className="text-sm text-muted">Add an extra layer of security using Google Authenticator or similar.</p>
                                {userProfile.twoFactorEnabled && (
                                    <span className="text-xs font-bold uppercase tracking-wider text-success-ink bg-success/15 px-2 py-0.5 rounded mt-1 inline-block">Enabled</span>
                                )}
                            </div>
                         </div>
                        <button 
                            onClick={userProfile.twoFactorEnabled ? handleDisable2FA : handleGenerate2FA}
                            disabled={isVerifying2FA}
                            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                                userProfile.twoFactorEnabled 
                                ? 'bg-error-soft text-error border border-error/30 hover:bg-error-soft' 
                                : 'bg-teal-ink hover:bg-teal-ink text-ink'
                            }`}
                        >
                            {isVerifying2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {userProfile.twoFactorEnabled ? 'Disable 2FA' : 'Set up 2FA'}
                        </button>
                    </div>

                    {isSettingUp2FA && (
                        <div className="mt-6 p-6 bg-surface-soft border border-hairline rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="bg-white p-4 rounded-xl shadow-lift shadow-ink/5">
                                    {twoFactorQRCode ? (
                                        <img src={twoFactorQRCode} alt="2FA QR Code" className="w-40 h-40" />
                                    ) : (
                                        <div className="w-40 h-40 flex items-center justify-center bg-surface-soft">
                                            <Loader2 className="w-8 h-8 animate-spin text-teal-ink" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h5 className="text-ink font-bold mb-1">Scan the QR code</h5>
                                        <p className="text-muted text-sm">Scan this image with your authenticator app (Google Authenticator, Authy, etc).</p>
                                    </div>
                                    <div className="bg-surface-soft p-3 rounded-lg border border-hairline">
                                        <p className="text-xs text-muted uppercase font-bold mb-1">Or enter manually:</p>
                                        <code className="text-teal-ink text-sm font-mono break-all">{twoFactorSecret}</code>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-muted text-xs font-medium uppercase">Verification Code</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={twoFactorVerifyCode}
                                                onChange={(e) => setTwoFactorVerifyCode(e.target.value)}
                                                placeholder="000 000"
                                                maxLength={6}
                                                className="bg-surface-soft border border-hairline rounded-lg px-4 py-2 text-ink text-lg tracking-widest outline-none focus:ring-1 focus:ring-teal-ink transition w-32"
                                            />
                                            <button 
                                                onClick={handleEnable2FA}
                                                disabled={isVerifying2FA || twoFactorVerifyCode.length < 6}
                                                className="bg-teal-ink hover:bg-teal-ink text-ink px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                            >
                                                Confirm
                                            </button>
                                            <button 
                                                onClick={() => setIsSettingUp2FA(false)}
                                                className="px-4 py-2 text-muted hover:text-ink text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="h-px bg-surface-card" />

                    <div>
                        <h4 className="text-ink font-medium mb-4">Change Password</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="password" placeholder="Current Password" className="bg-surface-soft border border-hairline rounded-lg px-4 py-2 text-ink focus:ring-1 focus:ring-[var(--neon-primary)] outline-none" />
                            <input type="password" placeholder="New Password" className="bg-surface-soft border border-hairline rounded-lg px-4 py-2 text-ink focus:ring-1 focus:ring-[var(--neon-primary)] outline-none" />
                        </div>
                        <button className="mt-4 px-4 py-2 bg-surface-soft hover:bg-surface-card text-ink rounded-lg text-sm font-medium border border-hairline transition-colors">
                            Update Password
                        </button>
                    </div>
                </div>

                <div className="bg-error-soft border border-error/30 rounded-xl p-6">
                    <h4 className="text-error font-bold mb-2">Danger Zone</h4>
                    <p className="text-sm text-muted mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                    <button className="px-4 py-2 bg-error-soft hover:bg-error-soft text-error border border-error/30 rounded-lg text-sm font-medium transition-colors">
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