import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Copy, Check, ChevronDown, Sparkles, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage, UserProfile, Resource, ResourceUpdateProposal } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { SearchBar } from './SearchBar';


interface ChatInterfaceProps {
  userProfile?: UserProfile;
  resources?: Resource[];
  setResources?: React.Dispatch<React.SetStateAction<Resource[]>>;
}

interface AiModel { id: string; label: string; provider: string }

/** Plain-language list of what an approved proposal will change. */
const describeChanges = (p: ResourceUpdateProposal) => [
  p.changes.folderId !== undefined && `Mover para: ${p.folderName ?? 'Sem pasta'}`,
  p.changes.tags && `Etiquetas: ${p.changes.tags.join(', ') || '(nenhuma)'}`,
  p.changes.notes !== undefined && `Notas passam a: “${p.changes.notes.slice(0, 160)}${p.changes.notes.length > 160 ? '…' : ''}”`,
  p.changes.completed !== undefined && (p.changes.completed ? 'Marcar como concluído' : 'Marcar como por concluir'),
].filter(Boolean) as string[];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ resources = [], setResources }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // True once the first words of a streamed answer are on screen
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [model, setModel] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const modelLabel = models.find(m => m.id === model)?.label;

  // Only the models whose provider key is configured on the server are offered
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/models');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setModels(data.models || []);
        setModel(data.default || '');
      } catch { /* the chat still works with the server default */ }
    })();
    return () => { cancelled = true; };
  }, []);

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
    const controller = new AbortController();
    abortRef.current = controller;
    const botId = crypto.randomUUID();
    let received = '';
    let serverMessage = '';
    const proposals: ResourceUpdateProposal[] = [];
    const upsertBot = (patch: Partial<ChatMessage>) => {
      setIsStreaming(true);
      setMessages(prev => prev.some(m => m.id === botId)
        ? prev.map(m => (m.id === botId ? { ...m, ...patch } : m))
        : [...prev, { id: botId, role: 'model', content: '', timestamp: Date.now(), modelLabel, ...patch }]);
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsg.content,
          history,
          model: model || undefined,
          stream: true
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        // Daily limit, rate limit, unavailable model: show the server's own explanation
        serverMessage = (await res.json().catch(() => null))?.message || '';
        throw new Error('Chat failed');
      }

      const isStream = (res.headers.get('content-type') || '').includes('application/x-ndjson');
      if (isStream && res.body) {
        // One JSON event per line: answer text as it is generated, and change proposals
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const handleLine = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line);
          if (event.type === 'text') {
            received += event.text;
            upsertBot({ content: received });
          } else if (event.type === 'proposal') {
            proposals.push({ ...event.proposal, status: 'pending' });
            upsertBot({ proposals: [...proposals] });
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(handleLine);
        }
        handleLine(buffer);
        if (!received && !proposals.length) throw new Error('Empty response');
      } else {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: botId,
          role: 'model',
          content: data.text,
          timestamp: Date.now(),
          modelLabel,
          proposals: (data.proposals || []).map((p: ResourceUpdateProposal) => ({ ...p, status: 'pending' })),
        }]);
      }
    } catch (error) {
      // Stopped by the user: keep what was already written, no error bubble
      const stoppedByUser = controller.signal.aborted;
      const gotSomething = received || proposals.length;
      if (!(stoppedByUser && gotSomething)) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'model',
          content: stoppedByUser
            ? "Stopped before the answer started."
            : gotSomething
              ? "The answer was interrupted before it finished. Please try again."
              : serverMessage || "Sorry, I encountered an error while processing your request. Please check your connection or try again later.",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleStop = () => abortRef.current?.abort();

  const setProposalStatus = (msgId: string, index: number, status: ResourceUpdateProposal['status']) =>
    setMessages(prev => prev.map(m => m.id !== msgId ? m : {
      ...m, proposals: m.proposals?.map((p, i) => (i === index ? { ...p, status } : p)),
    }));

  // The person approved: apply through the normal resources API (ownership is checked there)
  const applyProposal = async (msgId: string, index: number, p: ResourceUpdateProposal) => {
    setProposalStatus(msgId, index, 'applying');
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(p.resourceId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.changes),
      });
      if (!res.ok) throw new Error('Update failed');
      const { resource } = await res.json();
      setResources?.(prev => prev.map(r => (r.id === resource.id ? { ...r, ...resource } : r)));
      setProposalStatus(msgId, index, 'applied');
    } catch {
      setProposalStatus(msgId, index, 'error');
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
              AI Tutor
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
            {models.length > 1 ? (
              <select
                aria-label="Modelo de IA"
                value={model}
                onChange={e => setModel(e.target.value)}
                disabled={isLoading}
                className="px-3 py-1 rounded-xl border border-hairline bg-surface-soft text-xs font-medium text-body-strong focus:outline-none focus:border-primary/40"
              >
                {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            ) : modelLabel ? (
              <span className="px-3 py-1 rounded-xl border border-hairline bg-surface-soft text-xs font-medium text-muted">{modelLabel}</span>
            ) : null}
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
                      {msg.role === 'user' ? 'You' : `Gerado por IA · ${msg.modelLabel || 'AI Tutor'}`}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`text-body-strong leading-relaxed ${msg.role === 'user' ? 'bg-primary-soft border border-primary/30 p-4 rounded-xl rounded-tr-sm' : ''}`}>
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

                    {msg.proposals?.map((p, i) => (
                      <div key={i} className="mt-4 rounded-xl border border-hairline bg-surface-soft p-4 text-sm">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" aria-hidden="true" /> Proposta de alteração
                        </p>
                        <p className="font-medium text-ink">{p.resourceTitle}</p>
                        <ul className="list-disc pl-5 my-2 text-body space-y-0.5">
                          {describeChanges(p).map(c => <li key={c}>{c}</li>)}
                        </ul>
                        {p.reason && <p className="text-muted text-xs mb-3">{p.reason}</p>}
                        {p.status === 'applied' ? (
                          <p role="status" className="text-success-ink text-xs font-medium flex items-center gap-1"><Check className="w-3 h-3" aria-hidden="true" /> Aplicado</p>
                        ) : p.status === 'dismissed' ? (
                          <p role="status" className="text-muted text-xs">Ignorado</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              onClick={() => applyProposal(msg.id, i, p)}
                              disabled={p.status === 'applying'}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-active disabled:opacity-60"
                            >
                              {p.status === 'applying' ? 'A aplicar…' : 'Aplicar'}
                            </button>
                            <button
                              onClick={() => setProposalStatus(msg.id, i, 'dismissed')}
                              disabled={p.status === 'applying'}
                              className="px-3 py-1.5 rounded-lg border border-hairline text-xs text-muted hover:text-ink"
                            >
                              Ignorar
                            </button>
                            {p.status === 'error' && <span role="alert" className="text-xs text-error">Não foi possível aplicar. Tenta de novo.</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && !isStreaming && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center animate-pulse">
                <Loader2 className="w-4 h-4 text-ink animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-tighter">{modelLabel || 'AI Tutor'}</span>
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
          <div className="relative rounded-xl border transition duration-300 group shadow-lift glass-panel border-hairline bg-surface-soft focus-within:border-hairline-strong">
            <textarea
              value={input}
              aria-label="Message the AI tutor"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can I help with your studies today?"
              rows={1}
              className="w-full bg-transparent text-body-strong pl-5 pr-12 py-3.5 focus:outline-none resize-none min-h-[48px] max-h-48 text-sm scrollbar-hide"
              style={{ height: 'auto' }}
            />
            {isLoading ? (
              <button
                onClick={handleStop}
                aria-label="Stop generating"
                className="absolute right-2.5 bottom-2.5 p-1.5 rounded-xl transition duration-300 active:scale-95 text-white bg-ink hover:bg-body-strong"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
                className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-xl transition duration-300 group-focus-within:scale-105 active:scale-95
                  ${!input.trim()
                    ? 'text-muted bg-surface-soft'
                    : 'text-white bg-primary hover:bg-primary-active'}`}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-center text-xs text-muted mt-4 font-medium tracking-wide">
            RESPOSTAS GERADAS POR IA{modelLabel ? ` (${modelLabel.toUpperCase()})` : ''} · PODEM CONTER ERROS
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