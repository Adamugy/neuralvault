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
  const [mobileSubTab, setMobileSubTab] = useState<'tools' | 'preview'>('tools');
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
    if (activeTask === 'refine' && !contentInput) return;
    if (activeTask !== 'refine' && !topic) return;

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
        formData.append('level', level);
        if (sessionId) formData.append('sessionId', sessionId);

        // Build content string once (never append content multiple times - causes array on server)
        let finalContent: string;
        if (activeTask === 'organize') {
            const libResources = researchFocus
                .filter(item => item.type === 'library' && item.libraryData)
                .map(item => ({
                    title: item.libraryData!.title,
                    notes: item.libraryData!.notes,
                    tags: item.libraryData!.tags
                }));
            finalContent = JSON.stringify([
                ...libResources,
                ...resources.map(r => ({ title: r.title, notes: r.notes, tags: r.tags })),
                { type: 'instruction', text: contentInput || topic }
            ]);
        } else {
            // For other tasks, inject library context into the content field
            const libraryContext = researchFocus
                .filter(item => item.type === 'library' && item.libraryData)
                .map(item => `[Reference: ${item.libraryData!.title}] Notes: ${item.libraryData!.notes}`)
                .join('\n\n');
            finalContent = contentInput + (libraryContext ? '\n\n' + libraryContext : '');
        }
        formData.append('content', finalContent);

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
        
        // On mobile, switch to preview tab after generation
        setMobileSubTab('preview');
        
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
       <div className="py-2.5 px-6 border-b border-hairline bg-canvas/95 flex justify-between items-center z-30 sticky top-0">
           <div className="flex items-center gap-4 flex-shrink-0">
               <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                   <GraduationCap className="w-5 h-5 text-white" />
               </div>
               <div className="hidden sm:block">
                   <h1 className="text-sm font-bold text-ink tracking-tight">Academic Assistant</h1>
                   <div className="flex items-center gap-2 text-xs text-muted">
                       <Sparkles className="w-3 h-3 text-amber-ink" />
                       <span>AI Research Helper</span>
                   </div>
               </div>
           </div>

            {/* View Toggles */}
            <div className="flex bg-surface-soft p-1 rounded-lg border border-hairline mr-4">
                <button 
                    onClick={() => setViewMode('editor')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                        viewMode === 'editor' ? 'bg-[var(--neon-primary)] text-white shadow-lg' : 'text-muted hover:text-ink'
                    }`}
                >
                    Editor
                </button>
                <button 
                    onClick={() => setViewMode('gallery')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                        viewMode === 'gallery' ? 'bg-[var(--neon-primary)] text-white shadow-lg' : 'text-muted hover:text-ink'
                    }`}
                >
                    Gallery
                </button>
            </div>

           {/* Uniform Search Bar - Hidden on small mobile to save space */}
           <div className="hidden md:block flex-1 max-w-md mx-4">
               <SearchBar 
                 searchTerm={searchTerm}
                 setSearchTerm={setSearchTerm}
                 resources={resources}
               />
           </div>

           <div className="flex items-center gap-3 flex-shrink-0">
               {!isPremium && (
                 <button onClick={onOpenUpgrade} className="text-xs bg-amber-ink text-white px-3 py-1 rounded-full font-medium hover:bg-ink transition-colors">
                    UPGRADE
                 </button>
               )}
           </div>
       </div>

       <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
           {/* Mobile Tools/Preview Toggle - Only visible on mobile in Editor mode when result exists */}
           {viewMode === 'editor' && result && (
               <div className="lg:hidden flex items-center justify-center p-2 bg-surface-soft border-b border-hairline z-20">
                    <div className="flex bg-surface-soft p-1 rounded-lg border border-hairline w-full max-w-sm">
                        <button 
                            onClick={() => setMobileSubTab('tools')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                                mobileSubTab === 'tools' ? 'bg-primary text-white shadow-lg' : 'text-muted'
                            }`}
                        >
                            <Edit3 className="w-3 h-3" /> Tools
                        </button>
                        <button 
                            onClick={() => setMobileSubTab('preview')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                                mobileSubTab === 'preview' ? 'bg-primary text-white shadow-lg' : 'text-muted'
                            }`}
                        >
                            <FileText className="w-3 h-3" /> Preview
                        </button>
                    </div>
               </div>
           )}

           {/* Left Sidebar - Tools */}
           <div className={`w-full lg:w-[400px] flex-col border-r border-hairline glass-panel lg:flex shadow-lift z-10 overflow-y-auto scrollbar-hide ${
               (viewMode !== 'editor' || (result && mobileSubTab === 'preview')) ? 'hidden lg:flex' : 'flex'
           }`}>
               
               {/* Task Selector */}
                <div className="p-3 grid grid-cols-2 gap-2">
                    {tasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => setActiveTask(task.id)}
                          className={`p-2 rounded-xl border text-left transition duration-300 ${
                              activeTask === task.id
                              ? 'bg-[var(--neon-primary)]/10 border-[var(--neon-primary)]'
                              : 'bg-surface-soft border-hairline hover:bg-surface-card hover:border-hairline-strong'
                          }`}
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <task.icon className={`w-3.5 h-3.5 ${activeTask === task.id ? 'text-[var(--neon-primary)]' : 'text-muted'}`} />
                                <span className={`font-bold text-xs ${activeTask === task.id ? 'text-ink' : 'text-body'}`}>{task.label}</span>
                            </div>
                            <p className="text-xs text-muted leading-tight">{task.desc}</p>
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
                        className="w-full py-2 bg-surface-soft border border-hairline rounded-xl text-xs font-bold text-muted hover:text-ink hover:bg-surface-card transition flex items-center justify-between px-4"
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
                                    className="w-full p-3 bg-surface-soft border border-hairline rounded-xl text-left hover:border-[var(--neon-primary)]/50 transition group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted">{new Date(session.updatedAt).toLocaleDateString()}</span>
                                        <ChevronRight className="w-3 h-3 text-muted group-hover:text-[var(--neon-primary)]" />
                                    </div>
                                    <p className="text-xs text-ink font-medium line-clamp-1">{session.title}</p>
                                </button>
                             ))}
                        </div>
                    ) : !result ? (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                                    {activeTask === 'refine' ? 'Content to Refine' : 'Research Context / Topic'}
                                </label>
                                <textarea
                                    value={activeTask === 'refine' ? contentInput : topic}
                                    onChange={(e) => activeTask === 'refine' ? setContentInput(e.target.value) : setTopic(e.target.value)}
                                    placeholder={activeTask === 'refine' ? "Paste your draft here..." : "Describe your paper topic or paste notes..."}
                                    className="w-full h-40 lg:h-64 bg-surface-soft border border-hairline rounded-xl p-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[var(--neon-primary)] resize-none transition font-mono leading-relaxed"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsLibraryOpen(true)}
                                    className="flex-1 py-1.5 bg-surface-soft border border-hairline rounded-lg text-muted text-xs font-medium hover:bg-surface-card hover:text-ink transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Library className="w-3.5 h-3.5" /> Browse Library
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="flex-1 py-1.5 bg-surface-soft border border-hairline rounded-lg text-muted text-xs font-medium hover:bg-surface-card hover:text-ink transition-colors flex items-center justify-center gap-1.5 relative overflow-hidden"
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
                                        <div key={item.id} className="relative group p-1.5 bg-surface-soft border border-hairline rounded-xl flex items-center gap-2">
                                            {item.preview ? (
                                                <img src={item.preview} alt="preview" className="w-6 h-6 rounded object-cover border border-hairline" />
                                            ) : (
                                                <div className={`w-6 h-6 rounded flex items-center justify-center ${item.type === 'file' ? 'bg-primary-soft text-primary' : 'bg-amber/15 text-amber-ink'}`}>
                                                    {item.type === 'file' ? <FileText className="w-3.5 h-3.5" /> : <Library className="w-3.5 h-3.5" />}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-xs text-ink font-medium max-w-[70px] truncate">{item.name}</span>
                                                <span className="text-xs text-muted uppercase">
                                                    {item.type === 'file' ? 'File' : 'Library'}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveFocus(item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 bg-error-soft text-error rounded-md hover:bg-error-soft transition ml-0.5"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-4 border-t border-hairline">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={`w-full py-2.5 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2
                                        ${isGenerating
                                            ? 'bg-surface-card text-muted cursor-not-allowed shadow-none'
                                            : 'bg-[var(--neon-primary)] text-white hover:bg-primary-active'
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
                                <div className="p-3 bg-primary-soft border border-primary/30 rounded-xl">
                                    <p className="text-xs uppercase font-bold text-primary mb-1">Current Research Topic</p>
                                    <p className="text-xs text-ink line-clamp-2">{topic || "Custom Research"}</p>
                                </div>
                                
                                {/* Chat Messages */}
                                <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 scrollbar-hide">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed ${
                                                msg.role === 'user' 
                                                ? 'bg-[var(--neon-primary)]/20 border border-[var(--neon-primary)]/30 text-ink rounded-tr-sm' 
                                                : 'bg-surface-soft border border-hairline text-body rounded-tl-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                             </div>

                             <div className="mt-auto pt-4 border-t border-hairline">
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
                                        placeholder="Ask to refine, add context, or summarize…"
                                        className="w-full bg-surface-soft border border-hairline rounded-xl p-4 pr-12 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[var(--neon-primary)] resize-none min-h-[50px] max-h-32"
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
                                    className="w-full mt-2 py-2 text-xs font-bold text-muted hover:text-error transition-colors uppercase tracking-widest text-center"
                                 >
                                    Start New Topic
                                 </button>
                             </div>
                        </div>
                    )}
               </div>
           </div>

           {/* Right Content - Document Preview */}
           <div className={`flex-1 bg-surface-soft p-4 lg:p-8 overflow-y-auto flex justify-center ${
               (viewMode === 'editor' && result && mobileSubTab === 'tools') ? 'hidden lg:flex' : 'flex'
           }`}>
                {viewMode === 'gallery' ? (
                     <div className="w-full max-w-6xl">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-ink">Your Documents</h2>
                            <p className="text-muted text-sm">Manage and export your generated research.</p>
                        </div>
                        <DocumentGallery />
                     </div>
                ) : (
                <div className={`w-full max-w-[800px] transition duration-500 ${result ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4'}`}>
                    {result ? (
                        <div className="bg-white text-ink min-h-[800px] shadow-lift rounded-sm p-8 lg:p-12 relative">
                             {/* Document Header Stub */}
                             <div className="border-b-2 border-hairline pb-6 mb-8 flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-ink line-clamp-2">{topic.split('\n')[0] || "Untitled Document"}</h2>
                                    <p className="text-muted mt-2 font-serif text-sm">Generated by NeuralVault AI</p>
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
                                        className={`p-2 rounded transition-colors ${isEditing ? 'bg-[var(--neon-primary)] text-white' : 'hover:bg-surface-soft text-muted hover:text-ink'}`}
                                        title={isEditing ? "Save changes" : "Edit document"}
                                    >
                                        {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                    </button>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(result)}
                                        className="p-2 hover:bg-surface-soft rounded text-muted hover:text-ink transition-colors" 
                                        title="Copy text"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </button>
                                     <button 
                                        onClick={handleExportPdf}
                                        className="p-2 hover:bg-surface-soft rounded text-muted hover:text-ink transition-colors"
                                        title="Download PDF (Quarto)"
                                    >
                                        <FileCheck className="w-5 h-5" />
                                    </button>
                                </div>
                             </div>

                             {/* Manipulation Toolbar */}
                             {!isEditing && (
                                <div className="flex items-center gap-2 mb-6 border-b border-hairline pb-4 overflow-x-auto no-scrollbar">
                                    <span className="text-xs font-bold text-muted uppercase tracking-widest mr-2 flex items-center gap-1">
                                        <Wand2 className="w-3 h-3" /> AI Tools:
                                    </span>
                                    <button 
                                        onClick={() => handleManipulate('summarize')}
                                        disabled={isManipulating}
                                        className="text-xs px-3 py-1.5 rounded-full border border-hairline text-muted hover:bg-surface-soft hover:border-hairline transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <Shrink className="w-3 h-3" /> Summarize
                                    </button>
                                    <button 
                                        onClick={() => handleManipulate('expand')}
                                        disabled={isManipulating}
                                        className="text-xs px-3 py-1.5 rounded-full border border-hairline text-muted hover:bg-surface-soft hover:border-hairline transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <Maximize2 className="w-3 h-3" /> Expand
                                    </button>
                                    <button 
                                        onClick={() => handleManipulate('simplify')}
                                        disabled={isManipulating}
                                        className="text-xs px-3 py-1.5 rounded-full border border-hairline text-muted hover:bg-surface-soft hover:border-hairline transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <TextQuote className="w-3 h-3" /> Simplify
                                    </button>
                                    {isManipulating && (
                                        <span className="flex items-center gap-2 text-xs text-[var(--neon-primary)] font-medium ml-2">
                                            <RefreshCw className="w-3 h-3 animate-spin" /> Working…
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
                                        className="w-full min-h-[600px] bg-surface-soft border-none focus:ring-0 p-4 rounded-lg font-serif text-ink leading-loose resize-none"
                                        placeholder="Start typing your refinement…"
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
                                                        <div className="relative group my-4 rounded-xl overflow-hidden border border-hairline bg-canvas">
                                                            <div className="flex items-center justify-between px-4 py-2 bg-surface-soft text-xs font-mono text-muted uppercase tracking-widest border-b border-hairline">
                                                                <span>{match[1]}</span>
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(codeText)}
                                                                    className="hover:text-ink transition-colors flex items-center gap-1"
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
                                                        <code className="bg-surface-soft text-primary px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
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
                        <div className="h-[600px] border-2 border-dashed border-hairline rounded-xl flex flex-col items-center justify-center text-muted bg-surface-soft">
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
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 sm:p-8">
               <div className="glass-panel rounded-xl w-full max-w-3xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                   
                   {/* Modal Header */}
                   <div className="p-6 border-b border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-soft">
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-[var(--neon-primary)]/20 rounded-xl">
                               <Library className="w-6 h-6 text-[var(--neon-primary)]" />
                           </div>
                           <div>
                               <h3 className="text-xl font-bold text-ink">Your Library</h3>
                               <p className="text-xs text-muted">Search and add resources to your workspace</p>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-4">
                           <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                               <input 
                                   type="text"
                                   placeholder="Search resources…"
                                   value={libSearchTerm}
                                   onChange={(e) => setLibSearchTerm(e.target.value)}
                                   className="bg-surface-soft border border-hairline rounded-xl pl-10 pr-4 py-2 text-sm text-ink focus:outline-none focus:border-[var(--neon-primary)] w-full md:w-64 transition"
                               />
                           </div>
                           <button 
                                onClick={() => setIsLibraryOpen(false)}
                                className="p-2 hover:bg-surface-card rounded-xl text-muted hover:text-ink transition-colors"
                           >
                               <X className="w-6 h-6" />
                           </button>
                       </div>
                   </div>

                   {/* Folder Navigation */}
                   <div className="px-6 py-2 border-b border-hairline bg-surface-soft overflow-x-auto no-scrollbar flex items-center gap-2">
                       {folders.map(folder => (
                           <button
                               key={folder.id}
                               onClick={() => setLibActiveFolderId(folder.id)}
                               className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2
                                   ${libActiveFolderId === folder.id 
                                       ? 'bg-[var(--neon-primary)]/20 border border-[var(--neon-primary)]/50 text-[var(--neon-primary)]' 
                                       : 'text-muted hover:text-body hover:bg-surface-soft border border-transparent'}
                               `}
                           >
                               <Folder className="w-3 h-3" />
                               {folder.name}
                           </button>
                       ))}
                   </div>

                   {/* Resource Grid */}
                   <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-surface-soft">
                       {resources.filter(r => {
                           const matchesSearch = r.title.toLowerCase().includes(libSearchTerm.toLowerCase()) || 
                                               r.notes.toLowerCase().includes(libSearchTerm.toLowerCase());
                           const matchesFolder = libActiveFolderId === 'all' ? true : (r.folderId || 'general') === libActiveFolderId;
                           return matchesSearch && matchesFolder;
                       }).length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-muted opacity-50">
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
                                       className="w-full text-left p-4 rounded-xl bg-surface-soft border border-hairline hover:border-[var(--neon-primary)]/50 transition group flex flex-col h-48 relative overflow-hidden"
                                   >
                                       <div className="flex items-center gap-3 mb-3">
                                           <div className={`p-2 rounded-lg ${res.type === 'link' ? 'bg-surface-card text-primary' : 'bg-primary-soft text-primary'}`}>
                                               {res.type === 'link' ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                           </div>
                                           <h4 className="font-bold text-ink text-sm line-clamp-1 group-hover:text-[var(--neon-primary)] transition-colors">{res.title}</h4>
                                       </div>
                                       
                                       <p className="text-xs text-muted line-clamp-3 leading-relaxed mb-4 flex-1">
                                           {res.notes || "No additional notes provided for this resource."}
                                       </p>

                                       <div className="flex flex-wrap gap-1 mt-auto">
                                           {res.tags.slice(0, 2).map(tag => (
                                               <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-soft text-muted border border-hairline">{tag}</span>
                                           ))}
                                       </div>

                                       <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition translate-x-2 group-hover:translate-x-0">
                                           <div className="bg-[var(--neon-primary)] p-1.5 rounded-lg text-white shadow-lg/40">
                                               <ChevronRight className="w-4 h-4" />
                                           </div>
                                       </div>
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>

                   {/* Footer Info */}
                   <div className="p-4 border-t border-hairline bg-surface-soft text-center">
                       <p className="text-xs text-muted uppercase tracking-widest">Click a resource to add it to your research focus</p>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};