import React, { useState } from 'react';
import { BookOpen, PenTool, Sparkles, FileText, ChevronRight, Loader2, GraduationCap, Download, Library, Lock, Bot, Copy, Save, X, Search, Folder, Edit3, Wand2, TextQuote, Shrink, Maximize2, Check, RefreshCw, Trash2, Paperclip, FileCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateAcademicAssistance, organizeResourcesWithAI } from '../services/geminiService';
import { Resource, UserProfile, Folder as FolderType } from '../types';
import { useAuth } from '@clerk/clerk-react';

type TaskType = 'outline' | 'draft' | 'refine' | 'abstract' | 'organize';

interface AcademicHelperProps {
  resources: Resource[];
  userProfile: UserProfile;
  onOpenUpgrade?: () => void;
}

export const AcademicHelper: React.FC<AcademicHelperProps> = ({ resources, userProfile, onOpenUpgrade }) => {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const [activeTask, setActiveTask] = useState<TaskType>('outline');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Undergraduate');
  const [contentInput, setContentInput] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Pending Files State
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview?: string }[]>([]);

  // Modal Library State
  const [folders, setFolders] = useState<FolderType[]>([{ id: 'all', name: 'All' }, { id: 'general', name: 'General' }]);
  const [libSearchTerm, setLibSearchTerm] = useState('');
  const [libActiveFolderId, setLibActiveFolderId] = useState('all');

  // Document Manipulation State
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState('');
  const [isManipulating, setIsManipulating] = useState(false);

  const isPremium = userProfile?.plan !== 'free';

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
      if (activeTask === 'organize') {
        const output = await organizeResourcesWithAI(topic, resources, level);
        setResult(output);
        setEditedResult(output);
        setIsEditing(false);
      } else {
        // Use Server-side API with FormData
        const token = await getToken();
        const formData = new FormData();
        formData.append('taskType', activeTask);
        formData.append('topic', topic);
        formData.append('content', contentInput);
        formData.append('level', level);
        
        pendingFiles.forEach(pf => {
            formData.append('files', pf.file);
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
        setResult(data.result);
        setEditedResult(data.result);
        setIsEditing(false);
        // Clear files after successful generation
        setPendingFiles([]);
      }
    } catch (error) {
      setResult("An error occurred while generating content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManipulate = async (type: 'summarize' | 'expand' | 'simplify') => {
    if (!result || isManipulating) return;
    
    setIsManipulating(true);
    try {
        const promptMap = {
            summarize: "Summarize this content while maintaining its academic core:",
            expand: "Expand on the following points to provide more depth and academic rigor:",
            simplify: "Simplify the language of this text to make it more accessible without losing technical accuracy:"
        };

        const output = await generateAcademicAssistance('refine', promptMap[type], result, level);
        setResult(output);
        setEditedResult(output);
    } catch (error) {
        console.error("Manipulation failed", error);
    } finally {
        setIsManipulating(false);
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

      const newFiles = Array.from(files).map(file => {
          const isImage = file.type.startsWith('image/');
          return {
              file,
              preview: isImage ? URL.createObjectURL(file) : undefined
          };
      });

      setPendingFiles(prev => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
      setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectResource = (res: Resource) => {
      const content = `[Reference: ${res.title}]\nNotes: ${res.notes}\nLink: ${res.url || 'N/A'}`;
      if (activeTask === 'refine') {
          setContentInput(prev => prev + "\n\n" + content);
      } else {
          setTopic(prev => prev + "\n\n" + content);
      }
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
       {/* Header */}
       <div className="p-6 border-b border-white/10 glass-panel backdrop-blur-md z-10">
           <div className="flex items-center justify-between">
               <div>
                   <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                       <GraduationCap className="w-8 h-8 text-[var(--neon-primary)]" />
                       Academic Assistant
                   </h1>
                   <p className="text-slate-400 text-sm">Generate summaries, outlines, and refinements.</p>
               </div>
               {!isPremium && (
                 <button onClick={onOpenUpgrade} className="text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1 rounded-full font-bold animate-pulse shadow-lg">
                    UPGRADE TO EXPORT
                 </button>
               )}
           </div>
       </div>

       <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
           {/* Left Sidebar - Tools */}
           <div className="w-full lg:w-[400px] flex-col border-r border-white/10 glass-panel lg:flex shadow-xl z-10 overflow-y-auto scrollbar-hide">
               
               {/* Task Selector */}
               <div className="p-4 grid grid-cols-2 gap-2">
                   {tasks.map(task => (
                       <button
                         key={task.id}
                         onClick={() => setActiveTask(task.id)}
                         className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                             activeTask === task.id
                             ? 'bg-[var(--neon-primary)]/10 border-[var(--neon-primary)] shadow-[0_0_10px_-5px_var(--neon-primary)]'
                             : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                         }`}
                       >
                           <div className="flex items-center gap-2 mb-1">
                               <task.icon className={`w-4 h-4 ${activeTask === task.id ? 'text-[var(--neon-primary)]' : 'text-slate-400'}`} />
                               <span className={`font-bold text-sm ${activeTask === task.id ? 'text-white' : 'text-slate-300'}`}>{task.label}</span>
                           </div>
                           <p className="text-[10px] text-slate-500 leading-tight">{task.desc}</p>
                       </button>
                   ))}
               </div>

               {/* Input Area */}
               <div className="flex-1 p-4 pt-0 space-y-4">
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
                            className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <Library className="w-4 h-4" /> Browse Library
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
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

                    {/* Pending Files Preview */}
                    {pendingFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                            {pendingFiles.map((pf, idx) => (
                                <div key={idx} className="relative group p-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2">
                                    {pf.preview ? (
                                        <img src={pf.preview} alt="preview" className="w-8 h-8 rounded object-cover border border-white/10" />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-[var(--neon-primary)]/20 flex items-center justify-center text-[var(--neon-primary)]">
                                            {pf.file.name.endsWith('.pdf') ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-white font-medium max-w-[80px] truncate">{pf.file.name}</span>
                                        <span className="text-[8px] text-slate-500 uppercase">{(pf.file.size / 1024).toFixed(0)} KB</span>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFile(idx)}
                                        className="opacity-0 group-hover:opacity-100 p-1 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/40 transition-all ml-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/10">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2
                                ${isGenerating
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                                    : 'bg-[var(--neon-primary)] text-white hover:bg-[var(--neon-primary)]/90 shadow-[0_0_20px_-5px_var(--neon-primary)]'
                                }
                            `}
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {isGenerating ? 'Analyzing...' : 'Generate Content'}
                        </button>
                    </div>
               </div>
           </div>

           {/* Right Content - Document Preview */}
           <div className="flex-1 bg-[#0f0f11] p-4 lg:p-8 overflow-y-auto flex justify-center">
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
                                        onClick={handleExportDocx}
                                        className="p-2 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors"
                                        title="Download .doc"
                                    >
                                        <Download className="w-5 h-5" />
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
                                        placeholder="Comece a digitar seu refinamento..."
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
                                                                    Copiar
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
           </div>
       </div>

       {/* Library Modal - Mini ResourceBoard */}
       {isLibraryOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-8">
               <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 overflow-hidden">
                   
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