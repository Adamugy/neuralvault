import React, { useState, useEffect } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { BrainCircuit, Check, ChevronRight, GraduationCap, LayoutDashboard, MessageSquareText, ScanEye, X, Zap, Shield, Globe } from 'lucide-react';

export const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const toggleLogin = () => setShowLogin(!showLogin);

  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY || 0);
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const features = [
    {
      icon: MessageSquareText,
      title: "Gemini 3 Pro Tutor",
      description: "Chat with an advanced AI that understands deep learning concepts, math, and code with deep reasoning capabilities."
    },
    {
      icon: ScanEye,
      title: "Visual Analysis",
      description: "Upload diagrams, whiteboard photos, or paper screenshots. Our AI extracts formulas and explains architectures instantly."
    },
    {
      icon: LayoutDashboard,
      title: "Resource Manager",
      description: "Organize your arXiv papers, GitHub repos, and datasets in one unified board with smart tagging and search."
    },
    {
      icon: GraduationCap,
      title: "Academic Writer",
      description: "Generate outlines, refine drafts, and organize your thesis or research papers with context-aware AI assistance."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[var(--neon-primary)]/30 overflow-x-hidden relative">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-[var(--neon-primary)]/20 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute top-[30%] right-[10%] w-[600px] h-[600px] bg-[var(--neon-accent)]/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] bg-[var(--neon-secondary)]/15 rounded-full blur-[100px] animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-40 bg-slate-950/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer">
                <div className="relative">
                    <BrainCircuit className="w-8 h-8 text-[var(--neon-primary)] relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-[var(--neon-primary)] blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
                </div>
                <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all">NeuralVault</span>
            </div>
            <div className="flex items-center gap-4">
                <button 
                onClick={toggleLogin}
                className="text-sm font-medium text-slate-300 hover:text-white hover:text-glow transition-all"
                >
                Log In
                </button>
                <button 
                onClick={toggleLogin}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-[var(--neon-primary)] hover:bg-[#5b5ef0] text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95"
                >
                Get Started <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center relative">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-xs font-semibold text-[var(--neon-secondary)] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 hover:border-[var(--neon-secondary)]/50 transition-colors cursor-default box-glow">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--neon-secondary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--neon-secondary)]"></span>
            </span>
            Next-Gen AI Research Assistant
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight leading-none animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 drop-shadow-2xl">
            Thinking <br />
            <span className="neon-gradient-text text-glow">Beyond Sync</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            A second brain that doesn't just store files, but <span className="text-white font-semibold">understands them</span>. 
            Connect papers, code, and notes with semantic intelligence.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <button 
              onClick={toggleLogin}
              className="w-full sm:w-auto px-8 py-4 bg-[var(--neon-primary)] text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out transform skew-x-12" />
              <span className="relative flex items-center justify-center gap-2">
                Start Revolution <Zap className="w-5 h-5 fill-current" />
              </span>
            </button>
            <a 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 glass-panel hover:bg-white/5 text-white rounded-xl font-bold text-lg transition-all border border-white/10 hover:border-white/30 flex items-center justify-center gap-2"
            >
              Explore Logic
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="glass-panel p-8 rounded-2xl hover:border-[var(--neon-primary)]/50 transition-all duration-300 group hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.2)]">
                <div className="w-14 h-14 bg-slate-900/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-[var(--neon-primary)]/30 shadow-inner">
                  <feature.icon className="w-7 h-7 text-[var(--neon-primary)] group-hover:text-[var(--neon-accent)] transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[var(--neon-primary)] transition-colors">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm group-hover:text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section with Glass effect */}
      <section className="py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
            <div className="glass-panel rounded-3xl p-12 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--neon-primary)]/5 to-transparent pointer-events-none" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
                    {[
                        { label: 'Papers Analyzed', value: '10k+' },
                        { label: 'Active Minds', value: '2.5k' },
                        { label: 'Synapses Fired', value: '1M+' },
                        { label: 'Uptime', value: '99.9%' }
                    ].map((stat, i) => (
                        <div key={i} className="group cursor-default">
                            <div className="text-4xl font-black text-white mb-2 group-hover:text-[var(--neon-secondary)] transition-colors duration-300 text-glow">{stat.value}</div>
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950/80 backdrop-blur-md py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-slate-600" />
            <span className="font-bold text-slate-500">NeuralVault</span>
          </div>
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} NeuralVault. All rights reserved.
          </div>
          <div className="flex gap-6">
            <Shield className="w-5 h-5 text-slate-600 hover:text-[var(--neon-primary)] transition-colors cursor-pointer" />
            <Globe className="w-5 h-5 text-slate-600 hover:text-[var(--neon-secondary)] transition-colors cursor-pointer" />
          </div>
        </div>
      </footer>

      {/* Login Modal Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={toggleLogin}></div>
          <div className="relative glass-panel bg-slate-950/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 w-full max-w-md border border-[var(--glass-border)] box-glow">
             
             {/* Modal Header Decoration */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--neon-secondary)] via-[var(--neon-primary)] to-[var(--neon-accent)]" />
             
             <button 
                onClick={toggleLogin}
                className="absolute top-4 right-4 z-10 p-2 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
             >
                <X className="w-4 h-4" />
             </button>
             
             <div className="p-8 pt-10">
                <div className="text-center mb-6">
                    <BrainCircuit className="w-10 h-10 text-[var(--neon-primary)] mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                    <p className="text-slate-400 text-sm">Access your neural workspace</p>
                </div>
                <SignIn 
                    appearance={{
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
                    }}
                    signUpUrl="/sign-up" 
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};