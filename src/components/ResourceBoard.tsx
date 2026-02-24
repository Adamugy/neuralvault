import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Link as LinkIcon, FileText, Tag, Trash2, ExternalLink, CheckCircle2, Upload, Download, Folder, FolderPlus, X, MoreVertical, Lock, Globe } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Resource, DL_TAGS, Folder as FolderType, AppSettings, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';


interface ResourceBoardProps {
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  appSettings?: AppSettings;
  userProfile: UserProfile;
  onOpenUpgrade?: () => void;
}

export const ResourceBoard: React.FC<ResourceBoardProps> = ({ resources, setResources, appSettings, userProfile, onOpenUpgrade }) => {
  const { isLoaded: authLoaded, getToken } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Folder State
  const [folders, setFolders] = useState<FolderType[]>([{ id: 'general', name: 'General' }]);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [customTags, setCustomTags] = useState<string[]>([]);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'link' | 'file'>('link');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(init?.headers || undefined);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        message = body?.error || body?.message || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return res;
  };

  useEffect(() => {
    if (!authLoaded) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/bootstrap');
        const data = await res.json();
        if (cancelled) return;

        const apiFolders: FolderType[] = Array.isArray(data?.folders) ? data.folders : [];
        const apiResources: Resource[] = Array.isArray(data?.resources) ? data.resources : [];

        const normalizedFolders = [
          { id: 'general', name: 'General' },
          ...apiFolders.filter((f) => f && f.id && f.name && f.id !== 'general' && f.name !== 'General'),
        ];

        setFolders(normalizedFolders);
        setResources(apiResources);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded]);

  // Settings Defaults
  const layout = appSettings?.resourceLayout || 'grid';
  const isCompact = appSettings?.compactMode || false;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-fill title if empty
      if (!newTitle) {
        setNewTitle(file.name.split('.')[0]);
      }
    }
  };

  const handleAddFolder = () => {
    setNewFolderName('');
    setIsFolderModalOpen(true);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const res = await apiFetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      const folder: FolderType | undefined = data?.folder;
      if (!folder?.id) return;

      setFolders((prev) => [...prev, folder]);
      setActiveFolderId(folder.id);
      setSelectedFolderId(folder.id);
      setIsFolderModalOpen(false);
      setNewFolderName('');
    } catch {
      // ignore
    }
  };

  const handleAddTag = () => {
    if (newTagInput && !DL_TAGS.includes(newTagInput) && !customTags.includes(newTagInput)) {
        setCustomTags([...customTags, newTagInput]);
        setSelectedTags([...selectedTags, newTagInput]);
        setNewTagInput('');
    }
  };

  const handleAddResource = async () => {
    if (!newTitle) return;

    // PLAN RESTRICTION: Check file limit
    if (newType === 'file' && userProfile.plan === 'free') {
        const currentFiles = resources.filter(r => r.type === 'file').length;
        if (currentFiles >= 5) {
            onOpenUpgrade?.();
            return;
        }
    }

    try {
      let res: Response;

      if (newType === 'file') {
        if (!selectedFile) return;
        const form = new FormData();
        form.set('type', 'file');
        form.set('title', newTitle);
        form.set('folderId', selectedFolderId);
        form.set('tags', JSON.stringify(selectedTags));
        form.set('notes', newNotes);
        form.set('completed', 'false');
        form.set('file', selectedFile);

        res = await apiFetch('/api/resources', { method: 'POST', body: form });
      } else {
        res = await apiFetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'link',
            title: newTitle,
            url: newUrl,
            folderId: selectedFolderId,
            tags: selectedTags,
            notes: newNotes,
            completed: false,
          }),
        });
      }

      const data = await res.json();
      const resource: Resource | undefined = data?.resource;
      if (!resource?.id) return;

      setResources((prev) => [resource, ...prev]);
      resetForm();
      setIsModalOpen(false);
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewType('link');
    setNewUrl('');
    setNewNotes('');
    setSelectedTags([]);
    setSelectedFile(null);
    setSelectedFolderId('general');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/resources/${id}`, { method: 'DELETE' });
      setResources(resources.filter(r => r.id !== id));
    } catch {
      // ignore
    }
  };

  const handleToggleComplete = async (id: string) => {
    const current = resources.find((r) => r.id === id);
    if (!current) return;

    try {
      const res = await apiFetch(`/api/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !current.completed }),
      });
      const data = await res.json();
      const updated: Resource | undefined = data?.resource;
      if (!updated?.id) return;
      setResources(resources.map(r => r.id === id ? updated : r));
    } catch {
      // ignore
    }
  };

  const handleDownloadFile = async (resource: Resource) => {
    if (!resource.url || resource.type !== 'file') return;
    
    try {
      const res = await apiFetch(resource.url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resource.fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  // Combining Base Tags with Custom Tags for the list
  const allTags = [...DL_TAGS, ...customTags];

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = filterTag ? r.tags.includes(filterTag) : true;
    
    // Filter by Folder - if active is 'all', show all. Else match folderId. 
    // Legacy resources without folderId go to 'general'.
    const resourceFolder = r.folderId || 'general';
    const matchesFolder = activeFolderId === 'all' ? true : resourceFolder === activeFolderId;

    return matchesSearch && matchesTag && matchesFolder;
  });

  const activeResources = filteredResources.filter(r => !r.completed);
  const completedResources = filteredResources.filter(r => r.completed);

  const renderResourceCard = (resource: Resource) => (
    <div 
      key={resource.id} 
      className={`glass-panel border border-white/5 rounded-xl transition-all duration-300 group relative backdrop-blur-md
        ${resource.completed ? 'opacity-40 hover:opacity-100' : 'hover:border-white/20 hover:bg-white/[0.02]'}
        ${layout === 'grid' ? 'p-3 flex flex-col h-full' : 'p-2 flex items-center gap-3'}
      `}
    >
      <div className={`${layout === 'grid' ? 'flex justify-between items-start mb-2.5 w-full' : 'flex-shrink-0'}`}>
        <div className="flex items-center gap-2.5">
          <input 
            type="checkbox"
            checked={resource.completed}
            onChange={() => handleToggleComplete(resource.id)}
            className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-[var(--neon-primary)] focus:ring-0 cursor-pointer accent-[var(--neon-primary)] transition-all"
          />
          <div className={`${resource.type === 'link' ? 'text-blue-400/80' : 'text-purple-400/80'} transition-transform group-hover:scale-110 duration-300`}>
            {resource.type === 'link' ? <LinkIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
        </div>
        {layout === 'grid' && (
             <button 
                onClick={() => handleDelete(resource.id)} 
                className="text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded-md"
             >
                <Trash2 className="w-3.5 h-3.5" />
             </button>
        )}
      </div>
      
      <div className={`${layout === 'grid' ? 'mb-1.5' : 'flex-1 min-w-0'}`}>
        <h3 className={`font-medium text-slate-200 line-clamp-1 ${isCompact ? 'text-sm' : 'text-base'} ${resource.completed ? 'line-through text-slate-600' : 'group-hover:text-white transition-colors'}`}>
            {resource.title}
        </h3>
        {layout === 'list' && resource.notes && (
             <p className="text-slate-500 text-[10px] truncate mt-0.5 font-light">{resource.notes}</p>
        )}
      </div>
      
      {layout === 'grid' && resource.notes && (
        <p className={`text-slate-500 text-[11px] mb-3 line-clamp-2 leading-relaxed font-light ${isCompact ? 'min-h-[0.8rem]' : 'min-h-[2rem]'}`}>
            {resource.notes}
        </p>
      )}

      <div className={`flex flex-wrap gap-1.5 ${layout === 'grid' ? 'mb-4' : 'hidden lg:flex'}`}>
        {resource.tags.slice(0, layout === 'list' ? 2 : 3).map(tag => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/[0.02] rounded text-slate-500 border border-white/5 font-medium tracking-tight">
            {tag}
          </span>
        ))}
        {resource.tags.length > (layout === 'list' ? 2 : 3) && (
          <span className="text-[9px] px-1.5 py-0.5 text-slate-600 font-medium">
            +{resource.tags.length - (layout === 'list' ? 2 : 3)}
          </span>
        )}
      </div>

      <div className={`${layout === 'grid' ? 'flex items-center justify-between mt-auto pt-3 w-full' : 'flex items-center gap-4 ml-auto'}`}>
        <span className="text-[10px] text-slate-600 font-mono">
          {new Date(resource.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
        
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
            {resource.type === 'link' && resource.url && (
            <a 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-[var(--neon-primary)] transition-colors font-medium"
            >
                Visit <ExternalLink className="w-2.5 h-2.5" />
            </a>
            )}

            {resource.type === 'file' && resource.url && (
            <button 
                onClick={() => handleDownloadFile(resource)}
                className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-[var(--neon-accent)] transition-colors font-medium max-w-[100px]"
            >
                <span className="truncate">{resource.fileName || "Download"}</span>
                <Download className="w-2.5 h-2.5 flex-shrink-0" />
            </button>
            )}
             {layout === 'list' && (
                 <button 
                    onClick={() => handleDelete(resource.id)} 
                    className="text-slate-600 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded-md"
                 >
                    <Trash2 className="w-3.5 h-3.5" />
                 </button>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className={`${isCompact ? 'py-2 px-4' : 'py-3 px-6'} border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all bg-white/5 backdrop-blur-md z-30`}>
        <div className="flex-shrink-0">
          <h1 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold neon-gradient-text`}>Learning Resources</h1>
          <p className="text-slate-500 text-xs hidden md:block">Organize your papers, datasets, and tutorials.</p>
        </div>

        {/* Uniform Search Bar */}
        <SearchBar 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            resources={resources} 
        />

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/80 text-white px-4 py-1.5 rounded-xl font-medium transition-all shadow-[0_0_15px_-5px_var(--neon-primary)] hover:shadow-[0_0_20px_-5px_var(--neon-primary)] text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Resource</span>
        </button>
      </div>

      <div className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className={`${isCompact ? 'p-2' : 'p-3'} flex flex-col gap-3`}>

            <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                {/* Folder Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveFolderId('all')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${activeFolderId === 'all' 
                            ? 'bg-[var(--neon-primary)] text-white shadow-[0_0_10px_var(--neon-primary)/30]' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'}`}
                    >
                        <Folder className="w-3.5 h-3.5" />
                        All
                    </button>
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setActiveFolderId(folder.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                            ${activeFolderId === folder.id 
                                ? 'bg-[var(--neon-primary)] text-white shadow-[0_0_10px_var(--neon-primary)/30]' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'}`}
                        >
                            <Folder className="w-3.5 h-3.5" />
                            {folder.name}
                        </button>
                    ))}
                    <button
                        onClick={handleAddFolder}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-[var(--neon-primary)] hover:bg-white/5 border border-dashed border-white/20 hover:border-[var(--neon-primary)]/50 transition-all"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        New Folder
                    </button>
                </div>
            </div>
            
            {/* Tag Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                    onClick={() => setFilterTag(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors
                    ${!filterTag ? 'bg-[var(--neon-primary)]/20 border-[var(--neon-primary)]/50 text-[var(--neon-primary)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                    All Tags
                </button>
                {allTags.map(tag => (
                    <button
                    key={tag}
                    onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors
                        ${filterTag === tag ? 'bg-[var(--neon-primary)]/20 border-[var(--neon-primary)]/50 text-[var(--neon-primary)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                    >
                    {tag}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-4' : 'p-6'} scrollbar-hide`}>
        {activeResources.length === 0 && completedResources.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Folder className="w-12 h-12 mb-4 opacity-20" />
            <p>No resources found in this folder.</p>
          </div>
        ) : (
          <>
            <div className={`grid gap-3 ${layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-1'}`}>
              {activeResources.map(renderResourceCard)}
            </div>

            {completedResources.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px bg-white/10 flex-1" />
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </div>
                  <div className="h-px bg-white/10 flex-1" />
                </div>
                <div className={`grid gap-3 ${layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-1'}`}>
                  {completedResources.map(renderResourceCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm shadow-[0_0_50px_-20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create Folder</h2>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Folder name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] focus:outline-none"
                  placeholder="e.g., Diffusion Models"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5 rounded-b-2xl">
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !newFolderName.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/80 text-white shadow-[0_0_10px_var(--neon-primary)]'
                }`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md shadow-[0_0_50px_-20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Add New Resource</h2>
            </div>
            <div className="p-4 md:p-6 space-y-5 overflow-y-auto">
              
              {/* Title & Type */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] focus:outline-none"
                  placeholder="e.g., Attention Is All You Need"
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Folder</label>
                <select 
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] outline-none"
                >
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex gap-4 p-1 bg-white/5 rounded-lg w-fit border border-white/10">
                <button
                    onClick={() => setNewType('link')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        newType === 'link' ? 'bg-[var(--neon-primary)]/20 text-[var(--neon-primary)] shadow-sm border border-[var(--neon-primary)]/30' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Link URL
                </button>
                <button
                    onClick={() => setNewType('file')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        newType === 'file' ? 'bg-[var(--neon-primary)]/20 text-[var(--neon-primary)] shadow-sm border border-[var(--neon-primary)]/30' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Upload File
                </button>
              </div>

              {/* URL or File Input */}
              {newType === 'link' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">URL</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] focus:outline-none"
                    placeholder="https://arxiv.org/abs/..."
                  />
                </div>
              ) : (
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors relative
                    ${selectedFile ? 'border-[var(--neon-primary)]/50' : 'border-white/10'}
                  `}
                  onClick={() => {
                      if (userProfile.plan === 'free' && (resources.filter(r => r.type === 'file').length >= 5)) {
                          onOpenUpgrade?.();
                      } else {
                         !selectedFile && fileInputRef.current?.click();
                      }
                  }}
                >
                   {selectedFile ? (
                     <div className="w-full flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/10">
                        <div className="p-3 bg-red-500/20 rounded-lg text-red-400">
                             <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                     </div>
                   ) : (
                     <>
                        {userProfile.plan === 'free' && (resources.filter(r => r.type === 'file').length >= 5) ? (
                            <div className="text-center">
                                <Lock className="w-8 h-8 mb-2 mx-auto text-yellow-500" />
                                <span className="text-sm text-yellow-500 font-medium">Free Plan Limit Reached (5/5)</span>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-[var(--neon-primary)]" />
                                <span className="text-sm">Click to upload file</span>
                            </>
                        )}
                     </>
                   )}
                   <input 
                     ref={fileInputRef}
                     type="file" 
                     className="hidden" 
                     onChange={handleFileSelect}
                     disabled={userProfile.plan === 'free' && (resources.filter(r => r.type === 'file').length >= 5)}
                   />
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Create new tag..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--neon-primary)]"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <button 
                        onClick={handleAddTag}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm hover:bg-white/10 hover:text-white"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-[var(--neon-primary)]/20 border-[var(--neon-primary)] text-[var(--neon-primary)]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-[var(--neon-primary)] focus:outline-none h-20 resize-none"
                  placeholder="Key takeaways..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                className="px-4 py-2 rounded-lg bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/80 text-white font-medium transition-colors shadow-[0_0_15px_-5px_var(--neon-primary)]"
              >
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};