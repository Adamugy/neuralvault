import React, { useState } from 'react';
import { BookOpen, PenTool, Sparkles, FileText, ChevronRight, Loader2, GraduationCap, Download, Library, Lock, Bot, Copy, Save, X, Search, Folder, Edit3, Wand2, TextQuote, Shrink, Maximize2, Check, RefreshCw, Trash2, Paperclip, FileCheck, Send, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Resource, UserProfile, Folder as FolderType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { SearchBar } from './SearchBar';

import { DocumentGallery } from './DocumentGallery';

type TaskType = 'outline' | 'draft' | 'refine' | 'abstract' | 'organize' | 'custom';

interface SelectedResource {
    id: string;
    type: 'file' | 'library';
    name: string;
    preview?: string;
    libraryData?: Resource;
    fileData?: File;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface AcademicHelperProps {
  resources: Resource[];
  userProfile: UserProfile;
  onOpenUpgrade?: () => void;
}

export const AcademicHelper: React.FC<AcademicHelperProps> = ({ resources, userProfile, onOpenUpgrade }) => {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { showToast } = useNotification();
  const [activeTask, setActiveTask] = useState<TaskType>('outline');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Undergraduate');
  const [contentInput, setContentInput] = useState('');
  const [result, setResult] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null); // Track backend session
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Research Focus (Unified Files + Library Resources)
  const [researchFocus, setResearchFocus] = useState<SelectedResource[]>([]);

  // Modal Library State
  const [folders, setFolders] = useState<FolderType[]>([{ id: 'all', name: 'All' }, { id: 'general', name: 'General' }]);
  const [libSearchTerm, setLibSearchTerm] = useState('');
  const [libActiveFolderId, setLibActiveFolderId] = useState('all');

  // Document Manipulation State
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState('');
  const [isManipulating, setIsManipulating] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState<'editor' | 'gallery'>('editor');
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  


  // Chat/Interaction State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const isPremium = userProfile?.plan !== 'free';

  // Auto-scroll to bottom of chat
  React.useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, result]); // Scroll when messages change or result view toggles

  React.useEffect(() => {
    if (!authLoaded || !isLibraryOpen) return;

    (async () => {
        try {
            const token = await getToken();
            const res = await fetch('/api/bootstrap', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data?.folders) {
                const apiFolders: FolderType[] = Array.isArray(data.folders) ? data.folders : [];
                setFolders([
                    { id: 'all', name: 'All' },
                    { id: 'general', name: 'General' },
                    ...apiFolders.filter((f: any) => f.id !== 'general' && f.name !== 'General'),
                ]);
            }
        } catch (error) {
            console.error("Failed to fetch folders for library modal", error);
        }
    })();
  }, [authLoaded, isLibraryOpen, getToken]);

  const handleGenerate = async () => {
    if (!topic && activeTask !== 'refine' && activeTask !== 'organize') return; 
    if (activeTask === 'organize' && !topic) return;
    if (!contentInput && (activeTask === 'refine' || activeTask === 'draft')) return;

    if (!isPremium && (activeTask === 'refine' || activeTask === 'draft')) {
       onOpenUpgrade?.();
       return;
    }

    setIsGenerating(true);
    setResult(''); 
    
    try {
        const token = await getToken();
        const formData = new FormData();
        formData.append('taskType', activeTask);
        formData.append('topic', topic);
        formData.append('content', contentInput);
        formData.append('level', level);
        if (sessionId) formData.append('sessionId', sessionId);
        
        if (activeTask === 'organize') {
            // Include resources list for organizer
            formData.append('content', JSON.stringify(resources.map(r => ({
                title: r.title,
                notes: r.notes,
                tags: r.tags
            }))));
        }

        if (activeTask === 'organize') {
            // Include library resources if they are in the context
            const libResources = researchFocus
                .filter(item => item.type === 'library' && item.libraryData)
                .map(item => ({
                    title: item.libraryData!.title,
                    notes: item.libraryData!.notes,
                    tags: item.libraryData!.tags
                }));
            
            formData.append('content', JSON.stringify([
                ...libResources,
                { type: 'instruction', text: contentInput || topic }
            ]));
        } else {
            // For other tasks, inject library context into the content field
            const libraryContext = researchFocus
                .filter(item => item.type === 'library' && item.libraryData)
                .map(item => `[Reference: ${item.libraryData!.title}] Notes: ${item.libraryData!.notes}`)
                .join('\n\n');
            
            formData.append('content', contentInput + (libraryContext ? '\n\n' + libraryContext : ''));
        }

        researchFocus.forEach(item => {
            if (item.type === 'file' && item.fileData) {
                formData.append('files', item.fileData);
            }
        });

        const res = await fetch('/api/academic/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) throw new Error('Generation failed');
        const data = await res.json();
        
        // Handle New API Response Format
        setResult(data.result);
        setEditedResult(data.result);
        setIsEditing(false);
        setResearchFocus([]);
        if (data.sessionId) setSessionId(data.sessionId);
        
        // Initialize chat with the AI's "thought" or default
        setMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.thought || `I've generated the document based on your topic "${topic}". How would you like to refine it?`
        }]);
    } catch (error: any) {
        console.error('Generation request failed:', error);
        showToast(`Failed to generate content: ${error.message || 'Unknown error'}`, 'error');
        setResult("An error occurred while generating content. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleManipulate = async (type: 'summarize' | 'expand' | 'simplify') => {
    if (!result || isManipulating) return;
    
    setIsManipulating(true);
    try {
        const promoPromptMap = {
            summarize: "Summarize this content while maintaining its academic core for a ${level} student:",
            expand: "Expand on the following points to provide more depth and academic rigor for a ${level} student:",
            simplify: "Simplify the language of this text to make it more accessible without losing technical accuracy for a ${level} student:"
        };

        const token = await getToken();
        const res = await fetch('/api/academic/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                taskType: 'refine',
                topic: type,
                content: result,
                level: level
            })
        });

        if (!res.ok) throw new Error('Manipulation failed');
        const data = await res.json();
        setResult(data.result);
        setEditedResult(data.result);
    } catch (error) {
        console.error("Manipulation failed", error);
    } finally {
        setIsManipulating(false);
    }
};

  const handleChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: chatInput
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setIsGenerating(true);

    try {
        const token = await getToken();
        const res = await fetch('/api/academic/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                taskType: 'refine',
                topic: `Refinement based on: ${currentInput}`,
                content: result, // Sending current document as context
                level: level,
                sessionId: sessionId
            })
        });

        if (!res.ok) throw new Error('Refinement failed');
        const data = await res.json();
        
        // Update the document result only if it's a refinement/document task
        if (data.result) {
            setResult(data.result);
            setEditedResult(data.result);
        }

        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.thought || `I've updated the document. I incorporated your request: "${currentInput}"`
        }]);
    } catch (error) {
        console.error("Chat failure", error);
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "Sorry, I couldn't process that request. Please try again."
        }]);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!result) return;
    if (!isPremium) {
        onOpenUpgrade?.();
        return;
    }

    try {
        const token = await getToken();
        const res = await fetch('/api/academic/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: topic.split('\n')[0] || "Academic Document",
                content: result,
                // We could extract formulas if we had a parsing step, 
                // but for now we'll send the whole content.
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to export PDF');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${topic.split('\n')[0] || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error: any) {
        console.error("PDF Export failed", error);
        showToast(error.message, 'error');
    }
  };

  const handleSaveEdit = () => {
      setResult(editedResult);
      setIsEditing(false);
  };

  const handleExportDocx = () => {
    if (!isPremium) {
        onOpenUpgrade?.();
        return;
    }
    
    if (!result) return;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
                          xmlns:w='urn:schemas-microsoft-com:office:word' 
                          xmlns='http://www.w3.org/TR/REC-html40'>
                    <head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>`;
    const footer = "</body></html>";
    
    const sourceHTML = header + 
      `<h1>${topic || "Academic Document"}</h1>` + 
      result.split('\n').map(p => `<p>${p}</p>`).join('') + 
      footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${topic || 'document'}.doc`; 
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFocusItems = Array.from(files).map(file => {
          const isImage = file.type.startsWith('image/');
          return {
              id: crypto.randomUUID(),
              type: 'file' as const,
              name: file.name,
              preview: isImage ? URL.createObjectURL(file) : undefined,
              fileData: file
          };
      });

      setResearchFocus(prev => [...prev, ...newFocusItems]);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFocus = (id: string) => {
      setResearchFocus(prev => prev.filter(item => item.id !== id));
  };

  const handleSelectResource = (res: Resource) => {
      const isDuplicate = researchFocus.some(item => item.libraryData?.id === res.id);
      if (isDuplicate) {
          setIsLibraryOpen(false);
          return;
      }

      const newFocusItem: SelectedResource = {
          id: crypto.randomUUID(),
          type: 'library',
          name: res.title,
          libraryData: res,
          preview: res.type === 'link' ? undefined : undefined // We could add a thumbnail here if available
      };

      setResearchFocus(prev => [...prev, newFocusItem]);
      setIsLibraryOpen(false);
  };

  const tasks = [
    { id: 'organize' as TaskType, label: 'Smart Organizer', icon: Library, desc: 'Plan research' },
    { id: 'outline' as TaskType, label: 'Structure', icon: BookOpen, desc: 'Generate outline' },
    { id: 'draft' as TaskType, label: 'Draft', icon: PenTool, desc: 'Expand points' },
    { id: 'refine' as TaskType, label: 'Refine', icon: Sparkles, desc: 'Improve flow' },
  ];

  return (
    <div className="h-full bg-transparent flex flex-col overflow-hidden relative">
       <div className="py-2.5 px-6 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl flex justify-between items-center bg-noise z-30 sticky top-0">
           <div className="flex items-center gap-4 flex-shrink-0">
               <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                   <GraduationCap className="w-5 h-5 text-white" />
               </div>
               <div className="hidden sm:block">
                   <h1 className="text-sm font-bold text-white tracking-tight">Academic Assistant</h1>
                   <div className="flex items-center gap-2 text-[10px] text-slate-500">
                       <Sparkles className="w-3 h-3 text-amber-500" />
                       <span>AI Research Helper</span>
                   </div>
               </div>
           </div>

            {/* View Toggles */}
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 mr-4">
                <button 
                    onClick={() => setViewMode('editor')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        viewMode === 'editor' ? 'bg-[var(--neon-primary)] text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Editor
                </button>
                <button 
                    onClick={() => setViewMode('gallery')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        viewMode === 'gallery' ? 'bg-[var(--neon-primary)] text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Gallery
                </button>
            </div>

           {/* Uniform Search Bar */}
           <SearchBar 
             searchTerm={searchTerm}
             setSearchTerm={setSearchTerm}
             resources={resources}
           />

           <div className="flex items-center gap-3 flex-shrink-0">
               {!isPremium && (
                 <button onClick={onOpenUpgrade} className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1 rounded-full font-bold animate-pulse shadow-lg">
                    UPGRADE
                 </button>
               )}
           </div>
       </div>

       <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
           {/* Left Sidebar - Tools */}
           <div className="w-full lg:w-[400px] flex-col border-r border-white/10 glass-panel lg:flex shadow-xl z-10 overflow-y-auto scrollbar-hide">
               
               {/* Task Selector */}
                <div className="p-3 grid grid-cols-2 gap-2">
                    {tasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => setActiveTask(task.id)}
                          className={`p-2 rounded-xl border text-left transition-all duration-300 ${
                              activeTask === task.id
                              ? 'bg-[var(--neon-primary)]/10 border-[var(--neon-primary)] shadow-[0_0_10px_-5px_var(--neon-primary)]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <task.icon className={`w-3.5 h-3.5 ${activeTask === task.id ? 'text-[var(--neon-primary)]' : 'text-slate-400'}`} />
                                <span className={`font-bold text-xs ${activeTask === task.id ? 'text-white' : 'text-slate-300'}`}>{task.label}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 leading-tight">{task.desc}</p>
                        </button>
                    ))}
                </div>

                    {/* Sidebar Content: Form or Chat */}
               <div className="flex-1 p-4 pt-0 space-y-4 overflow-y-auto">
                    
                    <button 
                        onClick={async () => {
                            if (!showHistory) {
                                // Load History
                                const token = await getToken();
                                const res = await fetch('/api/academic/history', { headers: { Authorization: `Bearer ${token}` } });
                                if (res.ok) setHistorySessions(await res.json());
                            }
                            setShowHistory(!showHistory);
                        }}
                        className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-between px-4"
                    >
                         <span>Recent Sessions</span>
                         <Clock className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                    </button>

                    {showHistory ? (
                        <div className="space-y-2 animate-in slide-in-from-left-2">
                             {historySessions.map(session => (
                                 <button
                                    key={session.id}
                                    onClick={() => {
                                        setTopic(session.title);
                                        setSessionId(session.id);
                                        // We would ideally load messages here too
                                        // For now just setting topic to allow continuation
                                        setShowHistory(false);
                                    }}
                                    className="w-full p-3 bg-black/40 border border-white/5 rounded-xl text-left hover:border-[var(--neon-primary)]/50 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-slate-500">{new Date(session.updatedAt).toLocaleDateString()}</span>
                                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-[var(--neon-primary)]" />
                                    </div>
                                    <p className="text-xs text-white font-medium line-clamp-1">{session.title}</p>
                                </button>
                             ))}
                        </div>
                    ) : !result ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {activeTask === 'refine' ? 'Content to Refine' : 'Research Context / Topic'}
                                </label>
                                <textarea
                                    value={activeTask === 'refine' ? contentInput : topic}
                                    onChange={(e) => activeTask === 'refine' ? setContentInput(e.target.value) : setTopic(e.target.value)}
                                    placeholder={activeTask === 'refine' ? "Paste your draft here..." : "Describe your paper topic or paste notes..."}
                                    className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--neon-primary)] resize-none transition-all font-mono leading-relaxed"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsLibraryOpen(true)}
                                    className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-[10px] font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Library className="w-3.5 h-3.5" /> Browse Library
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-[10px] font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1.5 relative overflow-hidden"
                                >
                                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                    {isUploading ? 'Reading...' : 'Upload PDF'}
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept=".pdf,.txt,.doc,.docx"
                                    onChange={handleFileSelect}
                                    multiple
                                />
                            </div>

                            {/* Research Focus Preview */}
                            {researchFocus.length > 0 && (
                                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                                    {researchFocus.map((item) => (
                                        <div key={item.id} className="relative group p-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                                            {item.preview ? (
                                                <img src={item.preview} alt="preview" className="w-6 h-6 rounded object-cover border border-white/10" />
                                            ) : (
                                                <div className={`w-6 h-6 rounded flex items-center justify-center ${item.type === 'file' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {item.type === 'file' ? <FileText className="w-3.5 h-3.5" /> : <Library className="w-3.5 h-3.5" />}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-white font-medium max-w-[70px] truncate">{item.name}</span>
                                                <span className="text-[7px] text-slate-500 uppercase">
                                                    {item.type === 'file' ? 'File' : 'Library'}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveFocus(item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/40 transition-all ml-0.5"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={`w-full py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2
                                        ${isGenerating
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                                            : 'bg-[var(--neon-primary)] text-white hover:bg-[var(--neon-primary)]/90 shadow-[0_0_15px_-5px_var(--neon-primary)]'
                                        }
                                    `}
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    <span className="text-sm">{isGenerating ? 'Analyzing...' : 'Generate Content'}</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col">
                             <div className="flex-1 space-y-4 mb-4">
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Current Research Topic</p>
                                    <p className="text-xs text-white line-clamp-2">{topic || "Custom Research"}</p>
                                </div>
                                
                                {/* Chat Messages */}
                                <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 scrollbar-hide">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                                                msg.role === 'user' 
                                                ? 'bg-[var(--neon-primary)]/20 border border-[var(--neon-primary)]/30 text-white rounded-tr-sm' 
                                                : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                             </div>

                             <div className="mt-auto pt-4 border-t border-white/10">
                                 <form onSubmit={handleChatSubmit} className="relative">
                                    <textarea
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleChatSubmit();
                                            }
                                        }}
                                        placeholder="Ask to refine, add context, or summarize..."
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--neon-primary)] resize-none min-h-[50px] max-h-32"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isGenerating || !chatInput.trim()}
                                        className="absolute right-3 bottom-3 p-2 bg-[var(--neon-primary)] text-white rounded-xl disabled:opacity-50"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                 </form>
                                 <button 
                                    onClick={() => {
                                        setResult('');
                                        setMessages([]);
                                        setResearchFocus([]);
                                    }}
                                    className="w-full mt-2 py-2 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest text-center"
                                 >
                                    Start New Topic
                                 </button>
                             </div>
                        </div>
                    )}
               </div>
           </div>

           {/* Right Content - Document Preview */}
           <div className="flex-1 bg-[#0f0f11] p-4 lg:p-8 overflow-y-auto flex justify-center">
                {viewMode === 'gallery' ? (
                     <div className="w-full max-w-6xl">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white">Your Documents</h2>
                            <p className="text-slate-400 text-sm">Manage and export your generated research.</p>
                        </div>
                        <DocumentGallery />
                     </div>
                ) : (
                <div className={`w-full max-w-[800px] transition-all duration-500 ${result ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4'}`}>
                    {result ? (
                        <div className="bg-white text-slate-900 min-h-[800px] shadow-2xl rounded-sm p-8 lg:p-12 relative">
                             {/* Document Header Stub */}
                             <div className="border-b-2 border-slate-900/10 pb-6 mb-8 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-slate-900 line-clamp-2">{topic.split('\n')[0] || "Untitled Document"}</h2>
                                    <p className="text-slate-500 mt-2 font-serif text-sm">Generated by NeuralVault AI</p>
                                </div>
                                <div className="flex gap-2 print:hidden">
                                    <button 
                                        onClick={() => {
                                            if (isEditing) {
                                                handleSaveEdit();
                                            } else {
                                                setEditedResult(result);
                                                setIsEditing(true);
                                            }
                                        }}
                                        className={`p-2 rounded transition-colors ${isEditing ? 'bg-[var(--neon-primary)] text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                                        title={isEditing ? "Save changes" : "Edit document"}
                                    >
                                        {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                    </button>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(result)}
                                        className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors" 
                                        title="Copy text"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </button>
                                     <button 
                                        onClick={handleExportPdf}
                                        className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors"
                                        title="Download PDF (Quarto)"
                                    >
                                        <FileCheck className="w-5 h-5" />
                                    </button>
                                </div>
                             </div>

                             {/* Manipulation Toolbar */}
                             {!isEditing && (
                                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4 overflow-x-auto no-scrollbar">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                                        <Wand2 className="w-3 h-3" /> AI Tools:
                                    </span>
                                    <button 
                                        onClick={() => handleManipulate('summarize')}
                                        disabled={isManipulating}
                                        className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <Shrink className="w-3 h-3" /> Summarize
                                    </button>
                                    <button 
                                        onClick={() => handleManipulate('expand')}
                                        disabled={isManipulating}
                                        className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <Maximize2 className="w-3 h-3" /> Expand
                                    </button>
                                    <button 
                                        onClick={() => handleManipulate('simplify')}
                                        disabled={isManipulating}
                                        className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <TextQuote className="w-3 h-3" /> Simplify
                                    </button>
                                    {isManipulating && (
                                        <span className="flex items-center gap-2 text-xs text-[var(--neon-primary)] font-medium ml-2">
                                            <RefreshCw className="w-3 h-3 animate-spin" /> Working...
                                        </span>
                                    )}
                                </div>
                             )}
                                                          {/* Content */}
                             <div className="prose prose-slate max-w-none font-serif leading-loose">
                                {isEditing ? (
                                    <textarea 
                                        value={editedResult}
                                        onChange={(e) => setEditedResult(e.target.value)}
                                        className="w-full min-h-[600px] bg-slate-50 border-none focus:ring-0 p-4 rounded-lg font-serif text-slate-900 leading-loose resize-none"
                                        placeholder="Start typing your refinement..."
                                    />
                                ) : (
                                    <div className="markdown-content-doc">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ node, className, children, ...props }: any) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    const codeText = String(children).replace(/\n$/, '');
                                                    const isInline = !match;
                                                    
                                                    return !isInline ? (
                                                        <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                                                            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-white/5">
                                                                <span>{match[1]}</span>
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(codeText)}
                                                                    className="hover:text-white transition-colors flex items-center gap-1"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                    Copy
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
                                                        <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {result}
                                        </ReactMarkdown>
                                    </div>
                                )}
                             </div>
                        </div>
                    ) : (
                        <div className="h-[600px] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-slate-600 bg-white/5">
                            <Bot className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">Your generated document will appear here.</p>
                            <p className="text-sm opacity-50">Select a task on the left to get started.</p>
                        </div>
                    )}
                 </div>
                )}
            </div>
           </div>

       {/* Library Modal - Mini ResourceBoard */}
       {isLibraryOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-8">
               <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-3xl h-[80vh] flex flex-col shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 overflow-hidden">
                   
                   {/* Modal Header */}
                   <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-[var(--neon-primary)]/20 rounded-xl">
                               <Library className="w-6 h-6 text-[var(--neon-primary)]" />
                           </div>
                           <div>
                               <h3 className="text-xl font-bold text-white">Your Library</h3>
                               <p className="text-xs text-slate-500">Search and add resources to your workspace</p>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-4">
                           <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                               <input 
                                   type="text"
                                   placeholder="Search resources..."
                                   value={libSearchTerm}
                                   onChange={(e) => setLibSearchTerm(e.target.value)}
                                   className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--neon-primary)] w-full md:w-64 transition-all"
                               />
                           </div>
                           <button 
                                onClick={() => setIsLibraryOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                           >
                               <X className="w-6 h-6" />
                           </button>
                       </div>
                   </div>

                   {/* Folder Navigation */}
                   <div className="px-6 py-2 border-b border-white/5 bg-white/5 overflow-x-auto no-scrollbar flex items-center gap-2">
                       {folders.map(folder => (
                           <button
                               key={folder.id}
                               onClick={() => setLibActiveFolderId(folder.id)}
                               className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2
                                   ${libActiveFolderId === folder.id 
                                       ? 'bg-[var(--neon-primary)]/20 border border-[var(--neon-primary)]/50 text-[var(--neon-primary)]' 
                                       : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'}
                               `}
                           >
                               <Folder className="w-3 h-3" />
                               {folder.name}
                           </button>
                       ))}
                   </div>

                   {/* Resource Grid */}
                   <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-black/20">
                       {resources.filter(r => {
                           const matchesSearch = r.title.toLowerCase().includes(libSearchTerm.toLowerCase()) || 
                                               r.notes.toLowerCase().includes(libSearchTerm.toLowerCase());
                           const matchesFolder = libActiveFolderId === 'all' ? true : (r.folderId || 'general') === libActiveFolderId;
                           return matchesSearch && matchesFolder;
                       }).length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                               <Search className="w-16 h-16 mb-4" />
                               <p className="text-lg">No matching resources found</p>
                           </div>
                       ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                               {resources.filter(r => {
                                   const matchesSearch = r.title.toLowerCase().includes(libSearchTerm.toLowerCase()) || 
                                                       r.notes.toLowerCase().includes(libSearchTerm.toLowerCase());
                                   const matchesFolder = libActiveFolderId === 'all' ? true : (r.folderId || 'general') === libActiveFolderId;
                                   return matchesSearch && matchesFolder;
                               }).map(res => (
                                   <button 
                                       key={res.id}
                                       onClick={() => handleSelectResource(res)}
                                       className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[var(--neon-primary)]/50 transition-all group flex flex-col h-48 relative overflow-hidden"
                                   >
                                       <div className="flex items-center gap-3 mb-3">
                                           <div className={`p-2 rounded-lg ${res.type === 'link' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                               {res.type === 'link' ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                           </div>
                                           <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-[var(--neon-primary)] transition-colors">{res.title}</h4>
                                       </div>
                                       
                                       <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4 flex-1">
                                           {res.notes || "No additional notes provided for this resource."}
                                       </p>

                                       <div className="flex flex-wrap gap-1 mt-auto">
                                           {res.tags.slice(0, 2).map(tag => (
                                               <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 text-slate-400 border border-white/5">{tag}</span>
                                           ))}
                                       </div>

                                       <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                           <div className="bg-[var(--neon-primary)] p-1.5 rounded-lg text-white shadow-lg shadow-[var(--neon-primary)]/40">
                                               <ChevronRight className="w-4 h-4" />
                                           </div>
                                       </div>
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>

                   {/* Footer Info */}
                   <div className="p-4 border-t border-white/5 bg-white/5 text-center">
                       <p className="text-[10px] text-slate-600 uppercase tracking-widest">Click a resource to add it to your research focus</p>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};