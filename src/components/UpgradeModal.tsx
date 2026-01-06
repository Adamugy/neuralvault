import React, { useState } from 'react';
import { Check, X, Zap, Shield, Crown, Loader2, Brain, ImageIcon, Sparkles, ChevronRight } from 'lucide-react';
import { PlanTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanTier;
  onUpgrade: (plan: PlanTier) => Promise<void> | void;
  onOpenBillingPortal?: () => Promise<void> | void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentPlan, onUpgrade, onOpenBillingPortal }) => {
  const [processing, setProcessing] = useState<PlanTier | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = (planId: PlanTier) => {
    setProcessing(planId);
    Promise.resolve(onUpgrade(planId))
      .catch(() => {
        // no-op; errors are handled by caller
      })
      .finally(() => {
        setProcessing(null);
        onClose();
      });
  };

  const plans = [
    {
      id: 'free' as PlanTier,
      name: 'Student',
      price: '$0',
      period: '/mo',
      description: 'Essential tools for students.',
      features: ['Unlimited Links', 'Basic AI Chat', '5 File Uploads', 'Community Support'],
      recommended: false
    },
    {
      id: 'researcher' as PlanTier,
      name: 'Researcher',
      price: '$9.90',
      period: '/mo',
      description: 'Perfect for PhD students and independent researchers.',
      features: ['Unlimited Files', 'Gemini 1.5 Flash', 'Image Analysis', 'Doc Export', 'Priority Support'],
      recommended: true
    },
    {
      id: 'researcher_pro' as PlanTier,
      name: 'Researcher Pro',
      price: '$24.90',
      period: '/mo',
      description: 'Premium features for advanced research workflows.',
      features: ['Everything in Researcher', 'Gemini 1.5 Pro', 'Extended Context', 'Faster Responses', 'Premium Support'],
      recommended: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl h-[700px] glass-panel border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side - Value Prop */}
        <div className="w-full md:w-1/3 bg-gradient-to-br from-[var(--neon-primary)] to-purple-900 p-8 text-white relative flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1620641788421-7f1c338e420a?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 mix-blend-overlay" />
            
            <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 leading-tight">Unlock your full potential.</h2>
                <p className="text-white/80">Get the best AI models, unlimited usage, and exclusive features.</p>
            </div>

            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-white/20">
                         <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Faster response times</span>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-white/20">
                         <Brain className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Reasoning models (o1)</span>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-white/20">
                         <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">HD Image Analysis</span>
                </div>
            </div>
        </div>

        {/* Right Side - Plans */}
        <div className="w-full md:w-2/3 p-8 bg-black/40 overflow-y-auto scrollbar-hide">
            
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white">Choose your plan</h3>
                <p className="text-slate-400">Cancel anytime. No questions asked.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(plan => (
                     <div key={plan.id} className={`rounded-2xl border p-6 transition-all cursor-pointer relative flex flex-col ${
                         plan.recommended 
                         ? 'bg-[var(--neon-primary)]/10 border-[var(--neon-primary)] shadow-[0_0_20px_-10px_var(--neon-primary)]' 
                         : 'bg-white/5 border-white/10 hover:border-white/20'
                     }`}>
                         {plan.recommended && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--neon-primary)] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-[0_0_10px_var(--neon-primary)]">
                                RECOMMENDED
                            </div>
                        )}
                        <h4 className="font-bold text-white">{plan.name}</h4>
                        <div className="my-2">
                            <span className="text-3xl font-bold text-white">{plan.price}</span>
                            <span className="text-slate-500">{plan.period}</span>
                        </div>
                        <ul className="space-y-3 mt-6 mb-6 flex-1">
                            {plan.features.map((feat, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                    <Check className={`w-4 h-4 ${plan.recommended ? 'text-[var(--neon-primary)]' : 'text-slate-500'}`} />
                                    {feat}
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={currentPlan === plan.id || processing !== null}
                            className={`w-full py-2 rounded-lg font-bold transition-all shadow-lg ${
                                currentPlan === plan.id
                                ? 'bg-white/5 text-slate-500 cursor-default border border-white/10'
                                : plan.recommended
                                    ? 'bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/90 text-white shadow-[0_0_15px_-5px_var(--neon-primary)]'
                                    : 'bg-white text-slate-950 hover:bg-slate-200'
                            }`}
                        >
                            {processing === plan.id ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : currentPlan === plan.id ? (
                                'Current Plan'
                            ) : (
                                'Upgrade Now'
                            )}
                        </button>
                     </div>
                ))}
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-500">
                    Secure payment via Stripe. By upgrading, you agree to our Terms of Service.
                </p>
            </div>

            {currentPlan !== 'free' && onOpenBillingPortal && (
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between bg-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-sm font-bold text-white">Active Subscription</p>
                            <p className="text-[10px] text-slate-500 uppercase">Manage your plan, invoices and billing</p>
                        </div>
                    </div>
                    <button 
                        onClick={onOpenBillingPortal}
                        className="text-xs font-bold text-[var(--neon-primary)] hover:text-white transition-colors flex items-center gap-1 group"
                    >
                        GO TO STRIPE PORTAL <ChevronRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};