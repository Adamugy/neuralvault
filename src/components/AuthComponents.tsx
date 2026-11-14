// components/AuthComponents.tsx
import React, { useState } from 'react';
import { useAuth, useUser } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, ChevronLeft, Loader2, Mail, Lock, User as UserIcon, Fingerprint, Building, Check } from 'lucide-react';
import { usePasskeys } from '../hooks/usePasskeys';
import { useNotification } from '../contexts/NotificationContext';

// Shared form styles (warm editorial system)
const inputCls = "w-full h-11 bg-canvas border border-hairline-strong text-ink px-3.5 rounded-md placeholder:text-muted-soft focus:border-primary transition-colors";
const inputIconCls = inputCls + " pl-10";
const labelCls = "block text-sm font-medium text-body-strong mb-1.5";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted pointer-events-none";
const primaryBtn = "w-full h-11 bg-primary hover:bg-primary-active text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100";
const errorBox = "bg-error-soft border border-error/30 text-error px-4 py-3 rounded-md text-sm";
const linkBtn = "text-primary hover:text-primary-active font-medium underline-offset-4 hover:underline";

const AuthLayout = ({ children, title, subtitle, accentGlowClass1, accentGlowClass2 }: { 
  children: React.ReactNode, 
  title: string,
  subtitle?: string,
  accentGlowClass1?: string,
  accentGlowClass2?: string
}) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-[420px]">
        <button 
          onClick={() => navigate('/')}
          className="mb-10 -ml-2 h-10 px-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink rounded-md transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          Back to Home
        </button>

        <div className="text-center mb-8">
            <BrainCircuit className="w-10 h-10 text-primary mx-auto mb-5" aria-hidden="true" />
            <h1 className="font-display text-[40px] leading-[1.05] text-ink mb-3">{title}</h1>
            {subtitle && <p className="text-muted max-w-[320px] mx-auto">{subtitle}</p>}
        </div>

        <div className="bg-canvas border border-hairline rounded-xl p-6 sm:p-8 shadow-soft">
          {children}
        </div>
      </main>
    </div>
  );
};

export const SignInPage = () => {
  const { signIn, verify2FA, setSession, loading } = useAuth();
  const { loginWithPasskey } = usePasskeys();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  
  // 2FA States
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await signIn(email, password);
      if (result.status === '2fa_required') {
        setRequires2FA(true);
        setTempToken(result.tempToken || '');
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await verify2FA(tempToken, twoFactorCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code');
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);
    try {
      console.log(`[Passkey] Starting login for: ${email || 'discoverable'}`);
      const result = await loginWithPasskey(email);
      
      if (result.status === '2fa_required') {
        setRequires2FA(true);
        setTempToken(result.tempToken || '');
        return;
      }

      setSession(result.token, result.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('[Passkey Content Error]', err);
      setError(err.message || 'Unexpected error in Passkey');
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Access your neural workspace"
      accentGlowClass1="bg-primary-soft"
      accentGlowClass2="bg-primary-soft"
    >
      {requires2FA ? (
        <form onSubmit={handle2FAVerify} className="space-y-6">
          <div className="text-center mb-4">
            <Lock className="w-9 h-9 text-primary mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-display text-2xl text-ink">Two-Factor Verification</h2>
            <p className="text-muted text-sm mt-1">Enter the 6-digit code generated by your authenticator app.</p>
          </div>

          {error && (
            <div role="alert" className={errorBox}>
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              name="one-time-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              aria-label="6-digit verification code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              className={inputCls + " h-14 text-center text-2xl font-mono tracking-[0.5em]"}
              placeholder="000000"
              required
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={primaryBtn}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify and Sign In'}
          </button>

          <button
            type="button"
            onClick={() => setRequires2FA(false)}
            className="w-full text-muted hover:text-ink text-sm transition-colors py-2"
          >
            Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className={errorBox}>
              {error}
            </div>
          )}
          <div>
            <label htmlFor="f-email-1" className={labelCls}>Email</label>
            <div className="relative">
              <Mail className={iconCls} aria-hidden="true" />
              <input
                id="f-email-1" name="email" autoComplete="email" spellCheck={false}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputIconCls}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="signin-password" className={labelCls + " mb-0"}>Password</label>
              <button 
                type="button"
                onClick={() => navigate('/forgot-password')}
                className={"text-xs " + linkBtn}
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className={iconCls} aria-hidden="true" />
              <input
                id="signin-password"
                name="password"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputIconCls}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || passkeyLoading}
            className={primaryBtn}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-canvas px-3 text-muted tracking-[0.08em]">Or use biometrics</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading || passkeyLoading}
            className="w-full h-11 bg-canvas hover:bg-surface-soft text-ink border border-hairline-strong hover:border-ink rounded-md text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
          >
            
            {passkeyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Fingerprint className="w-4 h-4 text-primary" />
            )}
            <span>Sign in with Biometrics</span>
          </button>

          <p className="text-center text-muted text-sm mt-4">
            Don't have an account?{' '}
            <button 
              type="button"
              onClick={() => navigate('/sign-up')}
              className={linkBtn}
            >
              Sign Up
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export const SignUpPage = () => {
  const { signUp, loading } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signUp(email, password, name, role, lastName);
      // We don't auto-login anymore. Show success message and navigate to verify.
      showToast('Sign up successful! Please check your email to activate your account.', 'success');
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    }
  };

  return (
    <AuthLayout 
      title="Join NeuralVault" 
      subtitle="Start your augmented research journey"
      accentGlowClass1="bg-success/15"
      accentGlowClass2="bg-teal/15"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className={errorBox}>
            {error}
          </div>
        )}
        <div>
          <label htmlFor="f-name-2" className={labelCls}>Name</label>
          <div className="relative">
            <UserIcon className={iconCls} aria-hidden="true" />
            <input
                id="f-name-2" name="given-name" autoComplete="given-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputIconCls}
              placeholder="Your Name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="f-last-name-3" className={labelCls}>Last Name</label>
          <div className="relative">
            <UserIcon className={iconCls} aria-hidden="true" />
            <input
                id="f-last-name-3" name="family-name" autoComplete="family-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputIconCls}
              placeholder="Your Last Name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="f-role-title-4" className={labelCls}>Role / Title</label>
          <div className="relative">
            <Building className={iconCls} aria-hidden="true" />
            <input
                id="f-role-title-4" name="role" autoComplete="organization-title"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputIconCls}
              placeholder="e.g. Researcher, Student"
            />
          </div>
        </div>
        <div>
          <label htmlFor="f-email-5" className={labelCls}>Email</label>
          <div className="relative">
            <Mail className={iconCls} aria-hidden="true" />
            <input
                id="f-email-5" name="email" autoComplete="email" spellCheck={false}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputIconCls}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="f-password-6" className={labelCls}>Password</label>
          <div className="relative">
            <Lock className={iconCls} aria-hidden="true" />
            <input
                id="f-password-6" name="new-password" autoComplete="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputIconCls}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={primaryBtn}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
        </button>

        <p className="text-center text-muted text-sm mt-4">
          Already have an account?{' '}
          <button 
            type="button"
            onClick={() => navigate('/sign-in')}
            className={linkBtn}
          >
            Sign In
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};

export const VerifyEmailPage = () => {
    const navigate = useNavigate();
    const { showToast } = useNotification();
    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
            const autoVerify = async () => {
                setStatus('loading');
                try {
                    const res = await fetch('/api/auth/verify-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: tokenParam })
                    });
                    if (res.ok) {
                        setStatus('success');
                        setMessage('Email verified successfully! You have been granted access.');
                    } else {
                        const data = await res.json();
                        throw new Error(data.message || 'Automatic verification failed.');
                    }
                } catch (err: any) {
                    setStatus('error');
                    setMessage(err.message);
                }
            };
            autoVerify();
        }
    }, []);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMessage('Email verified successfully! You can now sign in.');
            } else {
                throw new Error(data.message);
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    const handleResend = async () => {
        if (!email) {
            showToast('Please enter your email first.', 'warning');
            return;
        }
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                showToast('Verification email resent!', 'success');
            } else {
                const data = await res.json();
                showToast(data.message || 'Error resending email.', 'error');
            }
        } catch (err) {
            showToast('Connection error while resending.', 'error');
        }
    };

    return (
        <AuthLayout 
            title="Verify your Email" 
            subtitle="A verification link has been generated. Enter the token received below to confirm your account."
            accentGlowClass1="bg-surface-card"
            accentGlowClass2="bg-surface-card"
        >
            {status === 'success' ? (
                <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-success-ink" />
                    </div>
                    <p className="text-ink font-medium">{message}</p>
                    <button 
                        onClick={() => navigate('/sign-in')} 
                        className={primaryBtn}
                    >
                        Sign In
                    </button>
                </div>
            ) : (
                <form onSubmit={handleVerify} className="space-y-6">
                    {status === 'error' && (
                        <div role="alert" className={errorBox}>
                            {message}
                        </div>
                    )}
                    
                    <div className="text-center px-4 py-3 bg-surface-soft rounded-md">
                        <p className="text-muted text-sm">
                            Tip: In a development environment, check the server logs to obtain the 32-character token.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="f-your-email-for-resending-7" className={labelCls}>Your Email (for resending)</label>
                        <input
                id="f-your-email-for-resending-7" name="email" autoComplete="email" spellCheck={false} 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="you@email.com" 
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label htmlFor="f-verification-token-8" className={labelCls}>Verification Token</label>
                        <input
                id="f-verification-token-8" name="token" autoComplete="off" spellCheck={false} 
                            type="text" 
                            value={token} 
                            onChange={e => setToken(e.target.value)} 
                            placeholder="Paste your token here…" 
                            className={inputCls}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={status === 'loading'} 
                        className={primaryBtn}
                    >
                        {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Email'}
                    </button>
                    
                    <p className="text-center text-muted text-sm">
                        Didn't receive it? <button type="button" onClick={handleResend} className={linkBtn}>Resend link</button>
                    </p>
                </form>
            )}
        </AuthLayout>
    );
};

export const UserButton = () => {
  const { user, isLoaded, isSignedIn, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isLoaded) {
    return <div className="w-9 h-9 rounded-full bg-surface-card animate-pulse border border-hairline" />;
  }

  if (isSignedIn && user) {
    return (
      <div className="relative group">
        <button 
          className="flex items-center space-x-2 rounded-full" aria-label="Account menu"
          onClick={() => {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.toggle('hidden');
          }}
        >
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </button>
        
        <div 
          id="user-dropdown" 
          className="hidden absolute right-0 top-12 w-56 bg-canvas border border-hairline rounded-lg shadow-lift py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          onMouseLeave={() => {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
          }}
        >
          <div className="px-4 py-3 border-b border-hairline mb-2">
            <p className="font-medium text-ink truncate">{user.name || 'User'}</p>
            <p className="text-muted text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="w-full text-left px-4 py-2 text-sm text-body hover:bg-surface-soft hover:text-ink transition-colors"
          >
            Settings
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-soft transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-3">
      <button
        onClick={() => navigate('/sign-in')}
        className="px-4 py-2 text-sm font-medium text-body hover:text-ink transition-colors"
      >
        Log In
      </button>
      <button
        onClick={() => navigate('/sign-up')}
        className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-active rounded-md transition"
      >
        Sign Up
      </button>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao solicitar recuperação de senha');
      }

      setSuccess(true);
      showToast(data.message || 'Email de recuperação enviado', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Recuperar Senha">
      <div className="text-center mb-6">
        <h2 className="sr-only">Recuperar Senha</h2>
        <p className="text-muted">
          Insira seu e-mail para receber um link de redefinição de senha.
        </p>
      </div>

      {success ? (
        <div className="bg-success/10 border border-success/40 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-success-ink" />
          </div>
          <h3 className="text-ink font-medium mb-2">Verifique seu e-mail</h3>
          <p className="text-body text-sm mb-6">
            Se o e-mail {email} estiver registrado, enviamos um link para redefinir sua senha.
          </p>
          <button
            onClick={() => navigate('/sign-in')}
            className={"text-sm " + linkBtn}
          >
            Voltar para o Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="f-email-9" className={labelCls}>Email</label>
            <div className="relative">
              <Mail className={iconCls} aria-hidden="true" />
              <input
                id="f-email-9" name="email" autoComplete="email" spellCheck={false}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputIconCls}
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={primaryBtn}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar link de recuperação'}
          </button>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/sign-in')}
              className="text-sm border-none bg-transparent text-muted hover:text-ink transition-colors"
            >
              Voltar para o Login
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }
    if (!token) {
      showToast('Token inválido ou ausente', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao redefinir a senha');
      }

      setSuccess(true);
      showToast('Senha redefinida com sucesso!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Link Inválido">
        <div className="text-center">
          <h2 className="sr-only">Link Inválido</h2>
          <p className="text-muted mb-6">O link de redefinição de senha é inválido ou está ausente.</p>
          <button
            onClick={() => navigate('/forgot-password')}
            className={primaryBtn + " w-auto px-6 mx-auto"}
          >
            Solicitar Novo Link
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova Senha">
      <div className="text-center mb-6">
        <h2 className="sr-only">Criar Nova Senha</h2>
        <p className="text-muted">Digite sua nova senha abaixo.</p>
      </div>

      {success ? (
        <div className="bg-success/10 border border-success/40 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-success-ink" />
          </div>
          <h3 className="text-ink font-medium mb-2">Senha Atualizada</h3>
          <p className="text-body text-sm mb-6">
            Sua senha foi redefinida com sucesso.
          </p>
          <button
            onClick={() => navigate('/sign-in')}
            className={primaryBtn + " w-auto px-6"}
          >
            Ir para o Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="f-nova-senha-10" className={labelCls}>Nova Senha</label>
            <div className="relative">
              <Lock className={iconCls} aria-hidden="true" />
              <input
                id="f-nova-senha-10" name="new-password" autoComplete="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputIconCls}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>
          <div>
            <label htmlFor="f-confirmar-nova-senha-11" className={labelCls}>Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className={iconCls} aria-hidden="true" />
              <input
                id="f-confirmar-nova-senha-11" name="confirm-password" autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputIconCls}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={primaryBtn}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Redefinir Senha'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};