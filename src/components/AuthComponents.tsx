// components/AuthComponents.tsx
import React, { useState } from 'react';
import { useAuth, useUser } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, ChevronLeft, Loader2, Mail, Lock, User as UserIcon, Fingerprint, Building, Check } from 'lucide-react';
import { usePasskeys } from '../hooks/usePasskeys';

const AuthLayout = ({ children, title, subtitle, accentGlowClass1, accentGlowClass2 }: { 
  children: React.ReactNode, 
  title: string,
  subtitle?: string,
  accentGlowClass1?: string,
  accentGlowClass2?: string
}) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
          <div className={`absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse-glow ${accentGlowClass1 || 'bg-[var(--neon-primary)]/15'}`} />
          <div className={`absolute bottom-[20%] right-[30%] w-[400px] h-[400px] rounded-full blur-[100px] animate-float ${accentGlowClass2 || 'bg-[var(--neon-secondary)]/15'}`} />
      </div>

      <div className="w-full max-w-md relative z-10 p-4 md:p-6">
        <button 
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        <div className="text-center mb-8">
            <BrainCircuit className="w-12 h-12 text-[var(--neon-primary)] mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            {subtitle && <p className="text-slate-400 text-sm max-w-[280px] mx-auto">{subtitle}</p>}
        </div>

        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          {children}
        </div>
      </div>
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
      setError(err.message || 'Código de 2FA inválido');
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError('Por favor, insira seu email primeiro para usar a Passkey.');
      return;
    }
    setError('');
    setPasskeyLoading(true);
    try {
      const result = await loginWithPasskey(email);
      setSession(result.token, result.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Access your neural workspace"
      accentGlowClass1="bg-indigo-500/15"
      accentGlowClass2="bg-purple-500/15"
    >
      {requires2FA ? (
        <form onSubmit={handle2FAVerify} className="space-y-6">
          <div className="text-center mb-4">
            <Lock className="w-10 h-10 text-[var(--neon-primary)] mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white">Verificação em Duas Etapas</h2>
            <p className="text-slate-400 text-sm mt-1">Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 text-white text-center text-2xl tracking-[0.5em] py-4 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
              placeholder="000000"
              required
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white shadow-lg shadow-indigo-500/20 border-none rounded-xl py-3 text-base font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar e Entrar'}
          </button>

          <button
            type="button"
            onClick={() => setRequires2FA(false)}
            className="w-full text-slate-400 hover:text-white text-sm transition-colors py-2"
          >
            Voltar para o login
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || passkeyLoading}
            className="w-full bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white shadow-lg shadow-indigo-500/20 border-none rounded-xl py-3 text-base font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0f172a] px-2 text-slate-500">Ou use biometria</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading || passkeyLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-white/10 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all hover:border-[var(--neon-primary)]/50 group"
          >
            {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin text-[var(--neon-primary)]" /> : <Fingerprint className="w-4 h-4 text-[var(--neon-primary)] group-hover:scale-110 transition-transform" />}
            Entrar com Passkey
          </button>

          <p className="text-center text-slate-400 text-sm mt-4">
            Don't have an account?{' '}
            <button 
              type="button"
              onClick={() => navigate('/sign-up')}
              className="text-[var(--neon-primary)] hover:text-[var(--neon-accent)] font-medium"
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
      alert('Cadastro realizado! Por favor, verifique seu e-mail para ativar sua conta antes de fazer o login.');
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    }
  };

  return (
    <AuthLayout 
      title="Join NeuralVault" 
      subtitle="Start your augmented research journey"
      accentGlowClass1="bg-emerald-500/15"
      accentGlowClass2="bg-teal-500/15"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-slate-400 text-sm mb-2">Name</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
              placeholder="Your Name"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-2">Sobrenome (Last Name)</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
              placeholder="Your Last Name"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-2">Role / Title</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
              placeholder="e.g. Researcher, Student"
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-colors"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white shadow-lg shadow-indigo-500/20 border-none rounded-xl py-3 text-base font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
        </button>

        <p className="text-center text-slate-400 text-sm mt-4">
          Already have an account?{' '}
          <button 
            type="button"
            onClick={() => navigate('/sign-in')}
            className="text-[var(--neon-primary)] hover:text-[var(--neon-accent)] font-medium"
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
                        setMessage('Email verificado com sucesso! Seu acesso foi liberado.');
                    } else {
                        const data = await res.json();
                        throw new Error(data.message || 'Falha na verificação automática.');
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
                setMessage('Email verificado com sucesso! Você já pode entrar.');
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
            alert('Por favor, informe seu e-mail primeiro.');
            return;
        }
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                alert('E-mail de verificação reenviado!');
            } else {
                const data = await res.json();
                alert(data.message || 'Erro ao reenviar.');
            }
        } catch (err) {
            alert('Erro de conexão ao reenviar.');
        }
    };

    return (
        <AuthLayout 
            title="Verifique seu Email" 
            subtitle="Um link de verificação foi gerado. Insira o token recebido abaixo para confirmar sua conta."
            accentGlowClass1="bg-blue-500/15"
            accentGlowClass2="bg-cyan-500/15"
        >
            {status === 'success' ? (
                <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-white font-medium">{message}</p>
                    <button 
                        onClick={() => navigate('/sign-in')} 
                        className="w-full bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        Fazer Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handleVerify} className="space-y-6">
                    {status === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                            {message}
                        </div>
                    )}
                    
                    <div className="text-center p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
                        <p className="text-slate-400 text-xs italic">
                            Dica: Em ambiente de desenvolvimento, verifique os logs do servidor para obter o token de 32 caracteres.
                        </p>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-2">Seu E-mail (para reenvio)</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="seu@email.com" 
                            className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-all mb-4"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-2">Token de Verificação</label>
                        <input 
                            type="text" 
                            value={token} 
                            onChange={e => setToken(e.target.value)} 
                            placeholder="Cole seu token aqui..." 
                            className="w-full bg-slate-950/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:border-[var(--neon-primary)] focus:ring-1 focus:ring-[var(--neon-primary)]/20 outline-none transition-all"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={status === 'loading'} 
                        className="w-full bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Email'}
                    </button>
                    
                    <p className="text-center text-slate-400 text-sm">
                        Não recebeu? <button type="button" onClick={handleResend} className="text-[var(--neon-primary)] font-medium">Reenviar link</button>
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
    return <div className="w-9 h-9 rounded-full bg-slate-800 animate-pulse border border-white/10" />;
  }

  if (isSignedIn && user) {
    return (
      <div className="relative group">
        <button 
          className="flex items-center space-x-2 focus:outline-none"
          onClick={() => {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.toggle('hidden');
          }}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-[var(--neon-primary)]/50 hover:border-[var(--neon-primary)] transition-colors">
            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </button>
        
        <div 
          id="user-dropdown" 
          className="hidden absolute right-0 top-12 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          onMouseLeave={() => {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
          }}
        >
          <div className="px-4 py-3 border-b border-white/5 mb-2">
            <p className="font-bold text-white truncate">{user.name || 'User'}</p>
            <p className="text-slate-400 text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Settings
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
      >
        Log In
      </button>
      <button
        onClick={() => navigate('/sign-up')}
        className="px-4 py-2 text-sm font-bold text-white bg-[var(--neon-primary)] hover:bg-[#5b5ef0] rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all"
      >
        Sign Up
      </button>
    </div>
  );
};