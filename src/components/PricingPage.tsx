import React from 'react';
import { PricingTable } from '@clerk/clerk-react';
import { ArrowLeft, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[var(--neon-primary)]/30 overflow-x-hidden relative flex flex-col">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--neon-primary)]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <BrainCircuit className="w-8 h-8 text-[var(--neon-primary)] relative z-10 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-[var(--neon-primary)] blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all">NeuralVault</span>
          </div>

          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
        </div>
      </header>

      {/* Pricing Content */}
      <main className="flex-1 relative z-10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Simple, Transparent Pricing</h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Choose the plan that's right for your research journey. Upgrade or downgrade anytime.
            </p>
          </div>

          <div className="glass-panel p-1 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <PricingTable />
          </div>

          <div className="mt-16 text-center text-slate-500 text-sm">
            <p>Payments are securely processed by Stripe. All plans include 256-bit SSL encryption.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm italic">
          Thinking Beyond Sync • NeuralVault
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
