import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  ChevronRight, 
  GraduationCap, 
  LayoutDashboard, 
  MessageSquareText, 
  ScanEye, 
  Zap, 
  Shield, 
  Globe, 
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  X,
  Activity,
  ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GeminiDemo from './GeminiDemo';
import { motion, AnimatePresence } from 'framer-motion';

interface Feature {
  icon: any;
  title: string;
  description: string;
  color: string;
  details?: string;
}

const FeatureCard = ({ feature, onOpen }: { feature: Feature, onOpen: (f: Feature) => void }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    onClick={() => onOpen(feature)}
    className="glass-panel p-8 rounded-2xl border-indigo-500/10 hover:border-indigo-500/50 transition-all duration-500 group hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(99,102,241,0.3)] relative overflow-hidden cursor-pointer"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${feature.color}/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-${feature.color}/10 transition-colors`} />
    <div className={`w-14 h-14 bg-slate-900/50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-indigo-500/30 shadow-inner`}>
      <feature.icon className={`w-7 h-7 text-indigo-400 group-hover:text-cyan-400 transition-colors`} />
    </div>
    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">{feature.title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm group-hover:text-slate-300">{feature.description}</p>
    <div className="mt-6 flex items-center text-xs font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
      Saiba Mais <ArrowRight className="ml-1 w-3 h-3" />
    </div>
  </motion.div>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isSystemActive, setIsSystemActive] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Dynamic Navigation Observer
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ['hero', 'features', 'demo', 'stats'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const features: Feature[] = [
    {
      icon: MessageSquareText,
      title: "Gemini Pro Tutor",
      description: "Chat with an advanced AI that understands deep learning concepts, math, and code with multi-step reasoning.",
      color: "indigo-500",
      details: "Our tutor isn't just a chatbot; it's a reasoning engine trained on vast academic datasets. It utilizes Chain-of-Thought processing to break down complex theorems."
    },
    {
      icon: ScanEye,
      title: "Visual Intelligence",
      description: "Upload diagrams or whiteboard photos. Our AI extracts formulas and explains complex architectures instantly.",
      color: "cyan-400",
      details: "Leveraging the multimodal capabilities of Gemini Pro, Visual Intelligence identifies handwritten LaTeX and research charts with high accuracy."
    },
    {
      icon: LayoutDashboard,
      title: "Resource Manager",
      description: "Organize arXiv papers, GitHub repos, and datasets in one board with semantic tagging and cross-linking.",
      color: "fuchsia-500",
      details: "Transform static PDFs into dynamic knowledge graphs. The manager automatically cross-references papers with codebases."
    },
    {
      icon: GraduationCap,
      title: "Academic Drafting",
      description: "Generate outlines, refine messy drafts, and structure your thesis with context-aware academic assistance.",
      color: "emerald-400",
      details: "NeuralVault maintains your unique academic voice while suggesting structural improvements based on top research papers."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative scroll-smooth">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[5%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse-glow" />
          <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-[5%] left-[20%] w-[700px] h-[700px] bg-fuchsia-600/5 rounded-full blur-[160px] animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrollY > 20 ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="relative">
                    <BrainCircuit className="w-8 h-8 text-indigo-400 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
                </div>
                <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500 group-hover:to-indigo-400 transition-all">NeuralVault</span>
            </div>
            
            <div className="hidden md:flex items-center gap-10 text-xs font-black uppercase tracking-widest">
              <button 
                onClick={() => scrollToSection('features')} 
                className={`py-2 relative group transition-colors ${activeSection === 'features' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                Features
                <span className={`absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all ${activeSection === 'features' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
              <button 
                onClick={() => scrollToSection('demo')} 
                className={`py-2 relative group transition-colors ${activeSection === 'demo' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                Interactive Demo
                <span className={`absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all ${activeSection === 'demo' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
              <button 
                onClick={() => scrollToSection('stats')} 
                className={`py-2 relative group transition-colors ${activeSection === 'stats' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
              >
                Ecosystem
                <span className={`absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all ${activeSection === 'stats' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </button>
            </div>

            <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/sign-in')}
                  className="text-xs font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest px-4"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => navigate('/sign-up')}
                  className="hidden sm:flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95"
                >
                  Cadastrar <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </nav>

      {/* Feature Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
            <div className="absolute inset-0" onClick={() => setSelectedFeature(null)} />
            <div className="w-full max-w-xl glass-panel rounded-[2rem] p-8 border border-white/10 relative z-10 animate-in zoom-in-95 duration-300 shadow-[0_0_80px_-20px_rgba(99,102,241,0.4)]">
                <button 
                    onClick={() => setSelectedFeature(null)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                    <X className="w-6 h-6 text-slate-500" />
                </button>
                    <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <selectedFeature.icon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-white">{selectedFeature.title}</h4>
                        <div className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">Module Intelligence</div>
                    </div>
                </div>
                <div className="space-y-6">
                    <p className="text-slate-300 leading-relaxed text-lg italic border-l-2 border-indigo-500/30 pl-6">
                        {selectedFeature.details}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Compute Cost</div>
                            <div className="text-white font-mono text-xs">High Frequency</div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Model Version</div>
                            <div className="text-white font-mono text-xs">Gemini Pro</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/sign-up')}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg"
                    >
                        Activate this Module
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-16 lg:pt-52 lg:pb-32 px-6 z-10">
        <div className="max-w-6xl mx-auto text-center relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-panel text-xs font-black text-cyan-400 mb-8 cursor-default group box-glow"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
            </span>
            <span className="tracking-[0.2em] uppercase">Reasoning Engine Powered</span>
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-[7.5rem] font-black text-white mb-8 tracking-tighter leading-[0.9] md:leading-[0.85]"
          >
            Thinking <br />
            <span className="neon-gradient-text text-glow">Beyond Sync.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            A second brain that doesn't just store files, it <span className="text-white font-black underline decoration-indigo-500/50 underline-offset-8">synthesizes insights</span>. 
            Experience the next era of academic work.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto"
          >
            <button 
              onClick={() => navigate('/sign-up')}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl transition-all shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out transform skew-x-12" />
              <span className="relative flex items-center justify-center gap-2">
                Começar Agora <Zap className="w-6 h-6 fill-current" />
              </span>
            </button>
            <button 
              onClick={() => scrollToSection('demo')}
              className="w-full sm:w-auto px-10 py-5 glass-panel hover:bg-white/5 text-white rounded-2xl font-black text-xl transition-all border border-white/10 hover:border-white/30 flex items-center justify-center gap-2"
            >
              Ver Demo
            </button>
          </motion.div>

          {/* Abstract Device Representation (Animated Window) */}
          <div className="relative mt-24 max-w-5xl mx-auto animate-in fade-in zoom-in duration-1000 delay-500 group">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-cyan-400 to-fuchsia-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000"></div>
            
            <div className="relative glass-panel rounded-[1rem] md:rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
               {/* Window Top Bar */}
               <div className="flex items-center gap-3 p-3 md:p-5 border-b border-white/5 bg-slate-900/60 backdrop-blur-3xl">
                 <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]"></div>
                   <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/60 shadow-[0_0_10px_rgba(234,179,8,0.3)]"></div>
                   <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.3)]"></div>
                 </div>
                 <div className="flex-1 text-center">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/5 text-[8px] md:text-[9px] font-mono text-slate-400 tracking-[0.2em] uppercase">
                     NeuralVault-Core
                   </div>
                 </div>
                 <div className="flex items-center gap-2 text-slate-600">
                    <Activity className="w-3 h-3 animate-pulse text-indigo-400" />
                    <span className="text-[8px] font-black font-mono hidden sm:inline">STABLE</span>
                 </div>
               </div>

               {/* Device Screen Content */}
               <div className="aspect-video bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden">
                 {/* Visual Noise & Scanning */}
                 <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                 <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent animate-scanline pointer-events-none shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                 
                 {/* Circuit Lines Connectivity (SVG) */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40" viewBox="0 0 800 450">
                    <path d="M250 225 L400 225" stroke="url(#gradient-line)" strokeWidth="1" fill="none" className="animate-circuit-flow" strokeDasharray="10 10" />
                    <path d="M550 225 L400 225" stroke="url(#gradient-line)" strokeWidth="1" fill="none" className="animate-circuit-flow" strokeDasharray="10 10" />
                    <defs>
                      <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                 </svg>

                 <div className="flex flex-col items-center gap-4 md:gap-12 z-10 scale-[0.6] sm:scale-100 w-full max-w-2xl px-4 md:px-12 transform-gpu">
                    <div className="grid grid-cols-3 gap-6 md:gap-12 w-full relative">
                       {/* Database Node */}
                       <div className="flex flex-col items-center gap-2 md:gap-6 group/node">
                          <div className="relative">
                            <div className="absolute -inset-4 bg-indigo-500/20 blur-xl opacity-0 group-hover/node:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group-hover/node:border-indigo-500/50 transition-all">
                              <Database className="w-6 h-6 md:w-10 md:h-10 text-indigo-400 group-hover/node:scale-110 transition-transform" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[8px] md:text-[10px] font-black font-mono text-indigo-400 tracking-widest uppercase mb-1">Knowledge</div>
                          </div>
                       </div>

                       {/* CPU Node (Active Thinking) */}
                       <div className="flex flex-col items-center gap-2 md:gap-6 group/node">
                          <div className="relative">
                            <div className="absolute -inset-6 bg-cyan-400/20 blur-2xl opacity-100 animate-pulse"></div>
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-slate-900 border-2 border-cyan-400/40 flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.2)] relative z-10 animate-float">
                              <Cpu className="w-8 h-8 md:w-12 md:h-12 text-cyan-400" />
                              <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping"></div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[8px] md:text-[10px] font-black font-mono text-cyan-400 tracking-widest uppercase mb-1">Reasoning</div>
                          </div>
                       </div>

                       {/* Semantic Map Node */}
                       <div className="flex flex-col items-center gap-2 md:gap-6 group/node">
                          <div className="relative">
                            <div className="absolute -inset-4 bg-fuchsia-500/20 blur-xl opacity-0 group-hover/node:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group-hover/node:border-fuchsia-500/50 transition-all">
                              <Layers className="w-6 h-6 md:w-10 md:h-10 text-fuchsia-400 group-hover/node:scale-110 transition-transform" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[8px] md:text-[10px] font-black font-mono text-fuchsia-400 tracking-widest uppercase mb-1">Synthesis</div>
                          </div>
                       </div>
                    </div>

                    {/* Bottom Progress Bar */}
                    <div className="w-full max-w-md space-y-3 relative z-10">
                      <div className="flex justify-between items-end">
                        <div className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                           Processing
                        </div>
                        <div className="text-[9px] font-mono font-black text-indigo-400">88% LOAD</div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <div className="h-full bg-gradient-to-r from-indigo-600 via-cyan-400 to-indigo-600 w-3/4 animate-[shimmer_2s_infinite] rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-32 relative z-10 bg-slate-950/40 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 md:mb-24"
          >
            <div className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.4em] mb-4">Core Funcional</div>
            <h2 className="text-3xl md:text-6xl font-black text-white mb-6 tracking-tighter">Criado para Mentes Modernas</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-transparent mx-auto rounded-full"></div>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          >
            {features.map((feature, idx) => (
              <FeatureCard key={idx} feature={feature} onOpen={setSelectedFeature} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-20 md:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center"
          >
            <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">
                Interação em Tempo Real
              </div>
              <h2 className="text-4xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter">
                Consulte o seu <br />
                <span className="text-indigo-400 italic">Cérebro Digital</span>
              </h2>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                Link neural direto para o Gemini Pro. Experimente consultar sua lógica, depurar código ou resumir artigos de pesquisa instantaneamente.
              </p>
              <div className="space-y-4">
                  <div className="flex justify-center lg:justify-start items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Status API: 99.8ms Latência
                  </div>
                  <div className="flex justify-center lg:justify-start items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <Database className="w-4 h-4 text-cyan-400" />
                      Densidade de Tokens: Ideal
                  </div>
              </div>
            </div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 w-full relative"
            >
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full opacity-50 animate-pulse"></div>
              <GeminiDemo />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Ecosystem / Stats Section */}
      <section id="stats" className="py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
            <div 
                className="glass-panel rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 border border-white/10 relative overflow-hidden group cursor-pointer transition-all duration-700 hover:shadow-[0_0_100px_-20px_rgba(34,211,238,0.2)]"
                onClick={() => setIsSystemActive(!isSystemActive)}
            >
                <div className={`absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-cyan-500/5 transition-opacity duration-1000 ${isSystemActive ? 'opacity-100' : 'opacity-0'}`} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center relative z-10">
                    {[
                        { label: 'Papers Indexed', value: 'Global', color: 'indigo-400' },
                        { label: 'Neural Connections', value: 'Ilimitado', color: 'cyan-400' },
                        { label: 'Researchers', value: 'Explore', color: 'fuchsia-400' },
                        { label: 'System Uptime', value: '99.9%', color: 'emerald-400' }
                    ].map((stat, i) => (
                        <div key={i} className="group/stat">
                            <div className={`text-3xl md:text-5xl font-black text-white mb-2 md:mb-4 group-hover/stat:text-${stat.color} transition-colors duration-500 text-glow`}>{stat.value}</div>
                            <div className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em]">{stat.label}</div>
                        </div>
                    ))}
                </div>
                
                {isSystemActive && (
                    <div className="mt-8 md:mt-12 pt-8 md:pt-12 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <div className="text-xs font-mono text-slate-400">Node Cluster #7: Healthy</div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            <div className="text-xs font-mono text-slate-400">Memory Sync: Active</div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            <div className="text-xs font-mono text-slate-400">Logic Core: Stable</div>
                        </div>
                    </div>
                )}
                
                <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 text-[8px] font-black uppercase tracking-[0.5em] text-slate-600">
                    <span className="hidden md:inline">Click to toggle system dashboard</span>
                    <ChevronUp className={`w-3 h-3 transition-transform duration-500 ${isSystemActive ? 'rotate-180' : ''}`} />
                </div>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative z-10 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-tight">Ready to evolve your <br /><span className="text-indigo-400 italic">workflow?</span></h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <button className="px-14 py-6 bg-white text-slate-950 rounded-2xl font-black text-xl hover:bg-indigo-500 hover:text-white transition-all shadow-[0_20px_60px_-15px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
               Deploy Now
             </button>
             <button className="px-14 py-6 glass-panel text-white rounded-2xl font-black text-xl hover:bg-white/5 transition-all border border-white/10">
               Documentation
             </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950/90 backdrop-blur-md py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <BrainCircuit className="w-10 h-10 text-indigo-400" />
                <span className="font-black text-3xl tracking-tighter text-white">NeuralVault</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed text-lg">
                Empowering researchers with semantic intelligence. Your academic life, logically synthesized.
              </p>
            </div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-xs mb-8">Platform</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-bold uppercase tracking-wider">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Neural Search</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Tutor v3.0</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Vault SDK</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-xs mb-8">Connect</h4>
              <div className="flex gap-6 mb-8">
                <Shield className="w-6 h-6 text-slate-600 hover:text-indigo-400 transition-colors cursor-pointer" />
                <Globe className="w-6 h-6 text-slate-600 hover:text-cyan-400 transition-colors cursor-pointer" />
              </div>
              <p className="text-xs font-mono text-slate-700">NODE_VERSION: 1.8.2-stable</p>
            </div>
          </div>
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
              © {new Date().getFullYear()} NeuralVault Intelligence Systems.
            </div>
            <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Security</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;