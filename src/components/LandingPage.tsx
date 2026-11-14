import React, { useState, useEffect, useRef } from 'react';
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
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

interface Feature {
  icon: any;
  title: string;
  description: string;
  color: string;
  details?: string;
}

const FeatureCard = ({ feature, onOpen }: { feature: Feature, onOpen: (f: Feature) => void }) => (
  <div data-feature className="h-full">
  <button
    type="button"
    onClick={() => onOpen(feature)}
    className="group text-left bg-surface-card rounded-lg p-8 flex flex-col h-full transition duration-300 hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
  >
    <div className="w-12 h-12 rounded-md bg-canvas flex items-center justify-center mb-8" aria-hidden="true">
      <feature.icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="text-lg font-medium text-ink mb-3">{feature.title}</h3>
    <p className="text-body leading-relaxed text-[15px] flex-1">{feature.description}</p>
    <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] group-hover:bg-[length:100%_1px] transition-[background-size] duration-300">
        Learn More
      </span>
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </span>
  </button>
  </div>
);

const NavLink = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'true' : undefined}
    className={`relative py-2 text-sm font-medium transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
  >
    {children}
    <span
      aria-hidden="true"
      className={`absolute left-0 -bottom-0.5 h-px bg-primary transition-all duration-300 ${active ? 'w-full' : 'w-0'}`}
    />
  </button>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isSystemActive, setIsSystemActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // GSAP: hero timeline on load + scroll reveals. Everything is skipped when the
  // user prefers reduced motion (gsap.matchMedia reverts it automatically).
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(rootRef);

      // Hero
      const split = SplitText.create(q('[data-hero-title]'), { type: 'lines,words', mask: 'lines' });
      const load = { value: 0 };
      const loadLabel = q('[data-load-label]')[0] as HTMLElement | undefined;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(q('[data-hero-badge]'), { y: 12, autoAlpha: 0, duration: 0.5 })
        .from(split.words, { yPercent: 110, duration: 0.9, stagger: 0.06 }, '-=0.15')
        .from(q('[data-hero-copy]'), { y: 16, autoAlpha: 0, duration: 0.6 }, '-=0.55')
        .from(q('[data-hero-cta]'), { y: 14, autoAlpha: 0, duration: 0.55 }, '-=0.4')
        .from(q('[data-hero-window]'), { y: 48, autoAlpha: 0, scale: 0.97, duration: 1.1 }, '-=0.8')
        .from(q('[data-node]'), { scale: 0.6, autoAlpha: 0, duration: 0.55, stagger: 0.12, ease: 'back.out(1.8)' }, '-=0.55')
        .from(q('[data-circuit]'), { autoAlpha: 0, duration: 0.4 }, '-=0.2')
        .from(q('[data-load-bar]'), { scaleX: 0, transformOrigin: 'left center', duration: 1.3, ease: 'power2.inOut' }, '-=0.1')
        .to(load, {
          value: 88, duration: 1.3, ease: 'power2.inOut',
          onUpdate: () => { if (loadLabel) loadLabel.textContent = Math.round(load.value) + '% LOAD'; },
        }, '<');

      // Section headings and intros
      q('[data-reveal]').forEach((el) => {
        gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      });

      // Feature cards: one staggered moment per batch
      gsap.set(q('[data-feature]'), { y: 32, autoAlpha: 0 });
      ScrollTrigger.batch(q('[data-feature]'), {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true }),
      });

      // Demo window drifts against the scroll
      gsap.fromTo(q('[data-demo]'), { y: 60 }, {
        y: -20, ease: 'none',
        scrollTrigger: { trigger: q('#demo')[0], start: 'top bottom', end: 'bottom top', scrub: 1 },
      });

      // Stats: uptime counts up once
      const uptime = q('[data-count]')[0] as HTMLElement | undefined;
      if (uptime) {
        const target = parseFloat(uptime.dataset.count || '0');
        const n = { value: 0 };
        gsap.to(n, {
          value: target, duration: 1.6, ease: 'power2.out',
          scrollTrigger: { trigger: uptime, start: 'top 85%', once: true },
          onUpdate: () => { uptime.textContent = n.value.toFixed(1) + '%'; },
        });
      }
      gsap.from(q('[data-stat]'), {
        y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: q('#stats')[0], start: 'top 80%', once: true },
      });

      // CTA band grows into place
      gsap.fromTo(q('[data-cta]'), { scale: 0.94 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: q('[data-cta]')[0], start: 'top 95%', end: 'top 45%', scrub: 1 },
      });

      return () => split.revert();
    });
  }, { scope: rootRef });

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

  // Close the feature dialog with Escape
  useEffect(() => {
    if (!selectedFeature) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedFeature(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedFeature]);

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
    <div ref={rootRef} className="min-h-screen bg-canvas text-body font-sans overflow-x-hidden">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Navbar */}
      <nav
        aria-label="Main"
        className={`fixed top-0 inset-x-0 z-50 h-16 transition-colors duration-300 ${scrollY > 20 ? 'bg-canvas/90 backdrop-blur-md border-b border-hairline' : 'bg-canvas border-b border-transparent'}`}
      >
        <div className="max-w-[1200px] h-full mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 rounded-md"
            aria-label="NeuralVault, back to top"
          >
            <BrainCircuit className="w-7 h-7 text-primary" aria-hidden="true" />
            <span translate="no" className="font-display text-[26px] leading-none text-ink">NeuralVault</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <NavLink active={activeSection === 'features'} onClick={() => scrollToSection('features')}>Features</NavLink>
            <NavLink active={activeSection === 'demo'} onClick={() => scrollToSection('demo')}>Interactive Demo</NavLink>
            <NavLink active={activeSection === 'stats'} onClick={() => scrollToSection('stats')}>Ecosystem</NavLink>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/sign-in')}
              className="h-10 px-3 text-sm font-medium text-ink hover:text-primary transition-colors rounded-md"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/sign-up')}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-5 bg-primary hover:bg-primary-active text-white rounded-md text-sm font-medium transition active:scale-[0.98]"
            >
              Sign Up <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      {/* Feature Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink/40 animate-in fade-in duration-200 overscroll-contain">
          <div className="absolute inset-0" onClick={() => setSelectedFeature(null)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-dialog-title"
            className="w-full max-w-xl bg-canvas rounded-xl p-6 sm:p-8 relative z-10 shadow-lift animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setSelectedFeature(null)}
              aria-label="Close"
              autoFocus
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-surface-soft transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-4 mb-6 pr-10">
              <div className="w-14 h-14 rounded-lg bg-surface-card flex items-center justify-center shrink-0" aria-hidden="true">
                <selectedFeature.icon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h4 id="feature-dialog-title" className="font-display text-3xl text-ink leading-tight">{selectedFeature.title}</h4>
                <div className="text-xs text-primary font-medium uppercase tracking-[0.12em] mt-1">Module Intelligence</div>
              </div>
            </div>
            <div className="space-y-6">
              <p className="text-body-strong leading-relaxed text-lg border-l-2 border-coral pl-5">
                {selectedFeature.details}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-soft p-4 rounded-md">
                  <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted mb-1">Compute Cost</div>
                  <div className="text-ink font-mono text-sm">High Frequency</div>
                </div>
                <div className="bg-surface-soft p-4 rounded-md">
                  <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted mb-1">Model Version</div>
                  <div className="text-ink font-mono text-sm">Gemini Pro</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/sign-up')}
                className="w-full h-12 bg-primary hover:bg-primary-active text-white rounded-md font-medium transition active:scale-[0.99]"
              >
                Activate this Module
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main">
        {/* Hero Section */}
        <section id="hero" className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 px-6 min-h-[100svh] flex items-center">
          <div className="max-w-[1200px] w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
            <div className="min-w-0 text-center lg:text-left">
              <div
                data-hero-badge
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card text-[13px] font-medium text-ink mb-8"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-ink" aria-hidden="true"></span>
                <span>Reasoning Engine Powered</span>
                <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              </div>

              <h1
                data-hero-title
                className="font-display text-[56px] sm:text-[72px] lg:text-[88px] text-ink leading-[0.98] tracking-[-0.03em] mb-8"
              >
                Thinking <br />
                <span className="text-coral italic">Beyond Sync.</span>
              </h1>

              <p
                data-hero-copy
                className="text-lg md:text-xl text-body mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                A second brain that doesn't just store files, it <span className="text-ink font-medium underline decoration-coral decoration-2 underline-offset-4">synthesizes insights</span>.
                Experience the next era of academic work.
              </p>

              <div
                data-hero-cta
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
              >
                <button
                  onClick={() => navigate('/sign-up')}
                  className="w-full sm:w-auto h-12 px-7 bg-primary hover:bg-primary-active text-white rounded-md font-medium inline-flex items-center justify-center gap-2 transition hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
                >
                  Start Now <Zap className="w-4 h-4 fill-current" aria-hidden="true" />
                </button>
                <button
                  onClick={() => scrollToSection('demo')}
                  className="w-full sm:w-auto h-12 px-7 bg-canvas border border-hairline-strong hover:border-ink text-ink rounded-md font-medium inline-flex items-center justify-center transition active:scale-[0.99]"
                >
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Product window: knowledge -> reasoning -> synthesis */}
            <div data-hero-window className="relative">
              <div className="rounded-xl overflow-hidden bg-surface-dark text-on-dark shadow-lift">
                {/* Window Top Bar */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-[#e2685a]"></div>
                    <div className="w-3 h-3 rounded-full bg-amber"></div>
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <span translate="no" className="inline-block px-3 py-1 rounded-sm bg-surface-dark-elevated text-xs font-mono text-on-dark-soft">
                      NeuralVault-Core
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-dark-soft">
                    <Activity className="w-3.5 h-3.5 text-teal" aria-hidden="true" />
                    <span className="text-xs font-mono hidden sm:inline">STABLE</span>
                  </div>
                </div>

                {/* Device Screen Content */}
                <div className="aspect-[4/3] sm:aspect-video flex flex-col items-center justify-center relative overflow-hidden px-6">
                  <svg data-circuit className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M250 190 L400 190" stroke="#cc785c" strokeOpacity="0.6" strokeWidth="1.5" fill="none" className="animate-circuit-flow" strokeDasharray="6 8" />
                    <path d="M550 190 L400 190" stroke="#cc785c" strokeOpacity="0.6" strokeWidth="1.5" fill="none" className="animate-circuit-flow" strokeDasharray="6 8" />
                  </svg>

                  <div className="flex flex-col items-center gap-8 sm:gap-12 z-10 w-full max-w-md">
                    <div className="grid grid-cols-3 gap-4 sm:gap-10 w-full">
                      {[
                        { Icon: Database, label: 'Knowledge', ring: false },
                        { Icon: Cpu, label: 'Reasoning', ring: true },
                        { Icon: Layers, label: 'Synthesis', ring: false },
                      ].map(({ Icon, label, ring }) => (
                        <div key={label} data-node className="flex flex-col items-center gap-3">
                          <div className={`w-14 h-14 sm:w-[72px] sm:h-[72px] flex items-center justify-center ${ring ? 'rounded-full bg-coral/15 ring-1 ring-coral/60 animate-float' : 'rounded-lg bg-surface-dark-elevated'}`}>
                            <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${ring ? 'text-coral' : 'text-on-dark'}`} aria-hidden="true" />
                          </div>
                          <div className={`text-[11px] sm:text-xs font-mono tracking-[0.12em] uppercase ${ring ? 'text-coral' : 'text-on-dark-soft'}`}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Progress Bar */}
                    <div className="w-full space-y-2.5">
                      <div className="flex justify-between items-end text-xs font-mono">
                        <div className="text-on-dark-soft uppercase tracking-[0.12em] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true"></span>
                          Processing
                        </div>
                        <div data-load-label className="text-coral tabular-nums">88% LOAD</div>
                      </div>
                      <div className="w-full h-1.5 bg-surface-dark-elevated rounded-full overflow-hidden">
                        <div data-load-bar className="h-full bg-coral w-[88%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 md:py-32 bg-surface-soft">
          <div className="max-w-[1200px] mx-auto px-6">
            <div data-reveal className="max-w-2xl mb-14 md:mb-20">
              <div className="text-xs text-primary font-medium uppercase tracking-[0.14em] mb-4">Core Ecosystem</div>
              <h2 className="font-display text-[40px] md:text-[56px] text-ink leading-[1.05] tracking-[-0.02em]">Architected for Modern Minds</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {features.map((feature, idx) => (
                <FeatureCard key={idx} feature={feature} onOpen={setSelectedFeature} />
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section id="demo" className="py-24 md:py-32">
          <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div data-reveal className="min-w-0 space-y-6 text-center lg:text-left">
              <div className="inline-block px-3 py-1 rounded-full bg-primary-soft text-primary-active text-xs font-medium uppercase tracking-[0.12em]">
                Real-Time Interaction
              </div>
              <h2 className="font-display text-[44px] md:text-[64px] text-ink leading-[1.02] tracking-[-0.02em]">
                Query your <br />
                <span className="text-coral italic">Digital Brain</span>
              </h2>
              <p className="text-body text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                Direct neural link to Gemini Pro. Experience querying logic, debugging code, or summarizing research articles instantly.
              </p>
              <ul className="space-y-3 pt-2">
                <li className="flex justify-center lg:justify-start items-center gap-3 text-sm text-muted">
                  <Activity className="w-4 h-4 text-success-ink" aria-hidden="true" />
                  Status API: 99.8ms Latency
                </li>
                <li className="flex justify-center lg:justify-start items-center gap-3 text-sm text-muted">
                  <Database className="w-4 h-4 text-teal-ink" aria-hidden="true" />
                  Densidade de Tokens: Ideal
                </li>
              </ul>
            </div>
            <div data-demo className="w-full min-w-0">
              <GeminiDemo />
            </div>
          </div>
        </section>

        {/* Ecosystem / Stats Section */}
        <section id="stats" className="py-20 md:py-24 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="bg-surface-dark text-on-dark rounded-xl p-8 md:p-14">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 text-center md:text-left">
                {[
                  { label: 'Papers Indexed', value: 'Global' },
                  { label: 'Neural Connections', value: 'Unlimited' },
                  { label: 'Researchers', value: 'Explore' },
                  { label: 'System Uptime', value: '99.9%' }
                ].map((stat, i) => (
                  <div key={i} data-stat className="md:border-l md:border-white/10 md:pl-6 first:border-l-0 first:pl-0">
                    <div className="font-display text-4xl md:text-5xl text-on-dark mb-2 tabular-nums" data-count={stat.value === '99.9%' ? '99.9' : undefined}>{stat.value}</div>
                    <div className="text-xs text-on-dark-soft font-medium uppercase tracking-[0.12em]">{stat.label}</div>
                  </div>
                ))}
              </div>

              {isSystemActive && (
                <div id="system-dashboard" className="mt-10 pt-10 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {[
                    { dot: 'bg-success', text: 'Node Cluster #7: Healthy' },
                    { dot: 'bg-coral', text: 'Memory Sync: Active' },
                    { dot: 'bg-teal', text: 'Logic Core: Stable' },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-3 bg-surface-dark-elevated px-4 py-3 rounded-md">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} aria-hidden="true" />
                      <span className="text-sm font-mono text-on-dark-soft">{item.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setIsSystemActive(!isSystemActive)}
                  aria-expanded={isSystemActive}
                  aria-controls="system-dashboard"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-xs font-medium uppercase tracking-[0.12em] text-on-dark-soft hover:text-on-dark hover:bg-surface-dark-elevated transition"
                >
                  <span>Click to toggle system dashboard</span>
                  <ChevronUp className={`w-4 h-4 transition-transform duration-300 ${isSystemActive ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="pb-24 md:pb-32 px-6">
          <div data-cta className="max-w-[1200px] mx-auto bg-primary rounded-xl px-8 py-16 md:p-20 text-center will-change-transform">
            <h2 className="font-display text-[44px] md:text-[64px] text-white mb-10 leading-[1.05] tracking-[-0.02em]">
              Ready to evolve your <br /><span className="italic">workflow?</span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button className="w-full sm:w-auto h-12 px-8 bg-canvas text-ink rounded-md font-medium hover:bg-white transition active:scale-[0.99]">
                Deploy Now
              </button>
              <button className="w-full sm:w-auto h-12 px-8 border border-white/60 text-white rounded-md font-medium hover:bg-white/10 transition active:scale-[0.99]">
                Documentation
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-dark text-on-dark-soft py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-6">
                <BrainCircuit className="w-8 h-8 text-coral" aria-hidden="true" />
                <span translate="no" className="font-display text-3xl text-on-dark">NeuralVault</span>
              </div>
              <p className="max-w-sm leading-relaxed">
                Empowering researchers with semantic intelligence. Your academic life, logically synthesized.
              </p>
            </div>
            <div>
              <h4 className="text-on-dark font-medium text-sm mb-5">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-on-dark transition-colors">Neural Search</a></li>
                <li><a href="#" className="hover:text-on-dark transition-colors">Tutor v3.0</a></li>
                <li><a href="#" className="hover:text-on-dark transition-colors">Vault SDK</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-on-dark font-medium text-sm mb-5">Connect</h4>
              <div className="flex gap-4 mb-6" aria-hidden="true">
                <Shield className="w-5 h-5" />
                <Globe className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono">NODE_VERSION: 1.8.2-stable</p>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs">
            <div>
              © {new Date().getFullYear()} NeuralVault Intelligence Systems.
            </div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-on-dark transition-colors">Privacy</a>
              <a href="#" className="hover:text-on-dark transition-colors">Security</a>
              <a href="#" className="hover:text-on-dark transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
