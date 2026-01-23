import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Brain, Loader2, Lock, Copy, Check, ChevronDown, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage, UserProfile, Resource } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { SearchBar } from './SearchBar';


interface ChatInterfaceProps {
  userProfile?: UserProfile;
  resources?: Resource[];
  onOpenUpgrade?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userProfile, resources = [], onOpenUpgrade }) => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isPremium = userProfile?.plan !== 'free';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const token = await getToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg.content,
          history,
          thinkingMode
        })
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      const responseText = data.text;
      
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
        isThinking: thinkingMode
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: "Desculpe, encontrei um erro ao processar sua solicitação. Verifique sua conexão ou tente novamente mais tarde.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c] relative">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Header - Sleek & Floating */}
      <div className="sticky top-0 z-20 px-4 md:px-6 py-2.5 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl flex justify-between items-center bg-noise">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg transform rotate-3 transition-transform hover:rotate-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0a0a0c]" />
          </div>
          <div className="hidden sm:block">
            <h2 className="font-semibold text-white tracking-tight flex items-center gap-2 text-sm leading-tight">
              Gemini 3 Pro
              <span className="text-[9px] uppercase font-bold tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-indigo-400">Researcher</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
               <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> Researcher</span>
            </div>
          </div>
        </div>
        
        {/* Uniform Search Bar */}
        <SearchBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            resources={resources}
        />

        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={() => isPremium ? setThinkingMode(!thinkingMode) : onOpenUpgrade?.()}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[10px] font-medium transition-all duration-300 ${
                thinkingMode 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_10px_-5px_rgba(99,102,241,0.5)]' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
            >
                <Brain className={`w-3 h-3 ${thinkingMode ? 'animate-pulse' : ''}`} />
                <span>Raciocínio Profundo</span>
                {!isPremium && <Lock className="w-2.5 h-2.5" />}
            </button>
        </div>
      </div>

      {/* Messages - Centered Content Layout */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide bg-noise"
      >
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
          {messages.length === 0 && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
               <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Bot className="w-10 h-10 text-indigo-500" />
               </div>
               <h1 className="text-3xl font-bold text-white tracking-tight">O que vamos explorar hoje?</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    "Explique Transformers simples",
                    "Resuma o conceito de Backpropagation",
                    "Ajude-me a organizar meus papers",
                    "Qual a última novidade em LLMs?"
                  ].map((tip, i) => (
                    <button 
                        key={i}
                        onClick={() => setInput(tip)}
                        className="p-4 rounded-2xl glass-panel border border-white/5 text-left text-sm text-slate-400 hover:border-indigo-500/40 hover:text-white transition-all group"
                    >
                        {tip}
                        <ChevronDown className="w-4 h-4 inline ml-2 opacity-0 group-hover:opacity-100 -rotate-90 transition-all" />
                    </button>
                  ))}
               </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              <div className={`flex gap-4 w-full ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg
                  ${msg.role === 'user' ? 'bg-slate-800' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-slate-100" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                </div>
                
                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-tighter">
                      {msg.role === 'user' ? 'Você' : 'Gemini'}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`text-slate-200 leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl rounded-tr-sm' : ''}`}>
                    {msg.role === 'model' && msg.isThinking && (
                      <div className="flex items-center gap-2 text-[10px] text-indigo-400 mb-4 font-bold border-b border-indigo-500/10 pb-2">
                        <Brain className="w-3 h-3 animate-pulse" />
                        PROCESSO DE PENSAMENTO ATIVADO
                      </div>
                    )}
                    
                    <div className="markdown-content prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeText = String(children).replace(/\n$/, '');
                            const isInline = !match;
                            
                            return !isInline ? (
                              <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                <div className="flex items-center justify-between px-4 py-2 bg-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-white/5">
                                  <span>{match[1]}</span>
                                  <button
                                    onClick={() => handleCopy(codeText, msg.id)}
                                    className="hover:text-white transition-colors flex items-center gap-1"
                                  >
                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                                  </button>
                                </div>
                                <SyntaxHighlighter
                                  language={match[1]}
                                  style={vscDarkPlus}
                                  PreTag="div"
                                  className="!bg-transparent !m-0 !p-4"
                                  {...props}
                                >
                                  {codeText}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-tighter">Gemini</span>
                </div>
                <div className="flex gap-1.5 p-4 items-center">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Clean & Modern */}
      <div className="px-4 md:px-6 py-6 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className={`relative rounded-3xl border transition-all duration-300 group shadow-2xl glass-panel ${
            thinkingMode 
              ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20' 
              : 'border-white/10 bg-white/5 focus-within:border-white/20'
          }`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={thinkingMode ? "Faça uma pergunta complexa para análise profunda..." : "Como posso ajudar seus estudos hoje?"}
              rows={1}
              className="w-full bg-transparent text-slate-100 pl-5 pr-12 py-3.5 focus:outline-none resize-none min-h-[48px] max-h-48 text-sm scrollbar-hide"
              style={{ height: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-2xl transition-all duration-300 group-focus-within:scale-105 active:scale-95
                ${!input.trim() || isLoading 
                  ? 'text-slate-600 bg-white/5' 
                  : 'text-white bg-indigo-500 hover:bg-indigo-400 shadow-[0_0_15px_-5px_rgba(99,102,241,0.8)]'}`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-4 font-medium tracking-wide">
            {thinkingMode ? "MODO DE RACIOCÍNIO PROFUNDO ATIVADO • RESPOSTAS MAIS DETALHADAS" : "GEMINI 3 PRO PREVIEW • INTELIGÊNCIA ARTIFICIAL PARA PESQUISA"}
          </p>
        </div>
      </div>
      
      <style>{`
        .markdown-content ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .markdown-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .markdown-content p { margin-bottom: 0.75rem; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: white; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; }
        .bg-noise { background-image: url("https://www.transparenttextures.com/patterns/carbon-fibre.png"); background-opacity: 0.05; }
      `}</style>
    </div>
  );
};