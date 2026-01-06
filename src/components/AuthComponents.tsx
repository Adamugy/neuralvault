// components/AuthComponents.tsx
import React from 'react';
import { SignIn, SignUp, useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, ChevronLeft } from 'lucide-react';

const AuthLayout = ({ children, title }: { children: React.ReactNode, title: string }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-[var(--neon-primary)]/15 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-[20%] right-[30%] w-[400px] h-[400px] bg-[var(--neon-secondary)]/15 rounded-full blur-[100px] animate-float" />
      </div>

      <div className="w-full max-w-md relative z-10 p-6">
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
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          {children}
        </div>
      </div>
    </div>
  );
};

const appearance = {
    elements: {
        formButtonPrimary: 'bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white shadow-lg shadow-indigo-500/20 border-none rounded-xl py-3 text-base font-bold',
        card: 'bg-transparent shadow-none w-full p-0',
        headerTitle: 'hidden',
        headerSubtitle: 'hidden',
        socialButtonsBlockButton: 'bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl py-2.5',
        socialButtonsBlockButtonText: 'text-white font-medium',
        dividerLine: 'bg-white/10',
        dividerText: 'text-slate-500',
        formFieldLabel: 'text-slate-400',
        formFieldInput: 'bg-slate-950/50 border-white/10 text-white focus:border-[var(--neon-primary)] focus:ring-[var(--neon-primary)]/20 rounded-xl',
        footerActionLink: 'text-[var(--neon-primary)] hover:text-[var(--neon-accent)] font-medium',
        formFieldInputShowPasswordButton: 'text-slate-400 hover:text-white'
    }
};

export const SignInPage = () => {
  return (
    <AuthLayout title="Welcome Back">
        <SignIn 
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            appearance={appearance}
        />
    </AuthLayout>
  );
};

export const SignUpPage = () => {
  return (
    <AuthLayout title="Join NeuralVault">
        <SignUp 
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl="/onboarding"
            appearance={appearance}
        />
    </AuthLayout>
  );
};

export const UserButton = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
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
          <img 
            src={user.imageUrl} 
            alt={user.fullName || 'User'} 
            className="w-9 h-9 rounded-full border-2 border-[var(--neon-primary)]/50 hover:border-[var(--neon-primary)] transition-colors"
          />
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
            <p className="font-bold text-white truncate">{user.fullName}</p>
            <p className="text-slate-400 text-xs truncate">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Settings
          </button>
          <button
            onClick={() => signOut(() => navigate('/'))}
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