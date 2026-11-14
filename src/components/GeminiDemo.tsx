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
    <div className="w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-surface-dark text-on-dark">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-surface-dark-elevated flex items-center justify-center" aria-hidden="true">
            <Bot className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-on-dark">Gemini Pro Tutor</h4>
            <p className="text-xs text-teal flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal" aria-hidden="true"></span>
              Live Reasoning Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-on-dark-soft" aria-hidden="true">
          <Terminal className="w-4 h-4" />
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <div
        ref={scrollRef}
        aria-live="polite"
        className="h-[300px] md:h-[380px] overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] min-w-0 flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-surface-dark-elevated"
              >
                {msg.role === 'user' ? <User className="w-4 h-4 text-on-dark-soft" /> : <Bot className="w-4 h-4 text-coral" />}
              </div>
              <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed break-words ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-surface-dark-elevated text-on-dark'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-dark-elevated flex items-center justify-center" aria-hidden="true">
                <Bot className="w-4 h-4 text-coral" />
              </div>
              <div className="px-4 py-3 rounded-lg bg-surface-dark-elevated flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-coral animate-spin" aria-hidden="true" />
                <span className="text-xs text-on-dark-soft">Synthesizing…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              disabled={isLoading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface-dark-elevated text-xs font-medium text-on-dark-soft hover:text-on-dark hover:bg-white/10 active:scale-[0.98] transition disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <input
            type="text"
            name="demo-question"
            autoComplete="off"
            aria-label="Ask the demo tutor a question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your second brain anything…"
            className="w-full h-11 bg-surface-dark-soft border border-white/10 rounded-md pl-4 pr-12 text-sm text-on-dark placeholder:text-on-dark-soft focus:border-coral transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            aria-label="Send question"
            className="absolute right-1.5 w-8 h-8 flex items-center justify-center rounded-md bg-primary text-white hover:bg-primary-active active:scale-95 transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiDemo;
