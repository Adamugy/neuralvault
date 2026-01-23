import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Terminal } from 'lucide-react';
import { chatWithTutor } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const QUICK_PROMPTS = [
  "Explain P vs NP simply",
  "Outline a ML paper",
  "Review my Python code",
  "Analyze Hubble data"
];

const GeminiDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! I'm your NeuralVault Research Tutor. How can I help you with your research today? You can ask me to explain a complex topic, outline a paper, or solve a math problem." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input.trim();
    if (!userMsg || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const response = await chatWithTutor(userMsg, []);
    setMessages(prev => [...prev, { role: 'model', content: response || "Empty response" }]);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
      <div className="p-4 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Gemini 3 Pro Tutor</h4>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 uppercase tracking-wider font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Reasoning Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer transition-colors" />
            <Sparkles className="w-4 h-4 text-indigo-400 opacity-50" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="h-[400px] overflow-y-auto p-6 space-y-4 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                msg.role === 'user' ? 'bg-slate-800 border-white/10' : 'bg-indigo-500/10 border-indigo-500/20'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-slate-800/80 text-slate-200 border border-white/5'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Synthesizing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900/60 border-t border-white/5">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-1">
          {QUICK_PROMPTS.map(p => (
            <button 
                key={p} 
                onClick={() => handleSend(p)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 rounded-full border border-white/5 bg-slate-950 text-[10px] font-bold text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
                {p}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your second brain anything..."
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-white placeholder:text-slate-600"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiDemo;
