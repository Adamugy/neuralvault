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
        content: "Sorry, I encountered an error while processing your request. Please check your connection or try again later.",
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
    <div className="h-full flex flex-col bg-card border border-hairline rounded-xl overflow-hidden relative">

      {/* Header - Sleek & Floating */}
      <div className="sticky top-0 z-20 px-4 md:px-5 py-3 border-b border-hairline bg-card flex justify-between items-center">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center" aria-hidden="true">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" aria-hidden="true" />
          </div>
          <div className="hidden sm:block">
            <h2 className="font-semibold text-ink tracking-tight flex items-center gap-2 text-sm leading-tight">
              Gemini Pro
              <span className="text-xs uppercase font-bold tracking-widest bg-surface-soft border border-hairline px-2 py-0.5 rounded-full text-primary">Researcher</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted">
               <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-ink" /> Researcher</span>
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
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium transition duration-300 ${
                thinkingMode 
                    ? 'bg-primary-soft border-primary/30 text-primary' 
                    : 'bg-surface-soft border-hairline text-muted hover:bg-surface-card hover:text-body-strong'
                }`}
            >
                <Brain className={`w-3 h-3 ${thinkingMode ? 'animate-pulse' : ''}`} />
                <span>Deep Reasoning</span>
                {!isPremium && <Lock className="w-2.5 h-2.5" />}
            </button>
        </div>
      </div>

      {/* Messages - Centered Content Layout */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
          {messages.length === 0 && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
               <div className="w-20 h-20 rounded-xl bg-surface-soft border border-hairline flex items-center justify-center mb-4">
                  <Bot className="w-10 h-10 text-primary" />
               </div>
               <h1 className="font-display text-4xl md:text-[44px] leading-tight text-ink">What shall we explore today?</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    "Explain Transformers simply",
                    "Summarize the concept of Backpropagation",
                    "Help me organize my papers",
                    "What's the latest in LLMs?"
                  ].map((tip, i) => (
                    <button 
                        key={i}
                        onClick={() => setInput(tip)}
                        className="p-4 rounded-xl glass-panel text-left text-sm text-muted hover:border-primary/30 hover:text-ink transition group"
                    >
                        {tip}
                        <ChevronDown className="w-4 h-4 inline ml-2 opacity-0 group-hover:opacity-100 -rotate-90 transition" />
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
                  ${msg.role === 'user' ? 'bg-surface-card' : 'bg-primary'}`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-body-strong" /> : <Bot className="w-3.5 h-3.5 text-ink" />}
                </div>
                
                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-body-strong uppercase tracking-tighter">
                      {msg.role === 'user' ? 'You' : 'Gemini'}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`text-body-strong leading-relaxed ${msg.role === 'user' ? 'bg-primary-soft border border-primary/30 p-4 rounded-xl rounded-tr-sm' : ''}`}>
                    {msg.role === 'model' && msg.isThinking && (
                      <div className="flex items-center gap-2 text-xs text-primary mb-4 font-bold border-b border-primary/30 pb-2">
                        <Brain className="w-3 h-3 animate-pulse" />
                        THINKING PROCESS ACTIVATED
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
                              <div className="relative group my-4 rounded-xl overflow-hidden border border-hairline bg-surface-soft">
                                <div className="flex items-center justify-between px-4 py-2 bg-surface-soft text-xs font-mono text-muted uppercase tracking-widest border-b border-hairline">
                                  <span>{match[1]}</span>
                                  <button
                                    onClick={() => handleCopy(codeText, msg.id)}
                                    className="hover:text-ink transition-colors flex items-center gap-1"
                                  >
                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-success-ink" /> : <Copy className="w-3 h-3" />}
                                    {copiedId === msg.id ? 'Copied' : 'Copy'}
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
                              <code className="bg-surface-card px-1.5 py-0.5 rounded text-primary font-mono text-xs" {...props}>
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
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center animate-pulse">
                <Loader2 className="w-4 h-4 text-ink animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-tighter">Gemini</span>
                </div>
                <div className="flex gap-1.5 p-4 items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Clean & Modern */}
      <div className="px-4 md:px-6 py-6 bg-canvas border-t border-hairline">
        <div className="max-w-3xl mx-auto">
          <div className={`relative rounded-xl border transition duration-300 group shadow-lift glass-panel ${
            thinkingMode 
              ? 'border-primary/30 bg-primary-soft ring-1 ring-primary/20' 
              : 'border-hairline bg-surface-soft focus-within:border-hairline-strong'
          }`}>
            <textarea
              value={input}
              aria-label="Message the AI tutor"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={thinkingMode ? "Ask a complex question for deep analysis…" : "How can I help with your studies today?"}
              rows={1}
              className="w-full bg-transparent text-body-strong pl-5 pr-12 py-3.5 focus:outline-none resize-none min-h-[48px] max-h-48 text-sm scrollbar-hide"
              style={{ height: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-xl transition duration-300 group-focus-within:scale-105 active:scale-95
                ${!input.trim() || isLoading 
                  ? 'text-muted bg-surface-soft' 
                  : 'text-white bg-primary hover:bg-primary-active'}`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-center text-xs text-muted mt-4 font-medium tracking-wide">
            {thinkingMode ? "DEEP REASONING MODE ACTIVE • MORE DETAILED RESPONSES" : "GEMINI PRO PREVIEW • AI RESEARCH ASSISTANT"}
          </p>
        </div>
      </div>
      
      <style>{`
        .markdown-content ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .markdown-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .markdown-content p { margin-bottom: 0.75rem; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: white; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; }
`}</style>
    </div>
  );
};