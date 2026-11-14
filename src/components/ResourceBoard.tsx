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
      className={`bg-canvas border border-hairline rounded-lg transition duration-200 group relative
        ${resource.completed ? 'opacity-60 hover:opacity-100' : 'hover:border-hairline-strong hover:shadow-lift hover:-translate-y-px'}
        ${layout === 'grid' ? 'p-4 flex flex-col h-full' : 'p-3 flex items-center gap-3'}
      `}
    >
      <div className={`${layout === 'grid' ? 'flex justify-between items-start mb-2.5 w-full' : 'flex-shrink-0'}`}>
        <div className="flex items-center gap-2.5">
          <input 
            type="checkbox"
            checked={resource.completed}
            onChange={() => handleToggleComplete(resource.id)}
            aria-label={resource.completed ? `Mark "${resource.title}" as not completed` : `Mark "${resource.title}" as completed`}
            className="w-4 h-4 rounded cursor-pointer accent-[var(--neon-primary)]"
          />
          <div className={`${resource.type === 'link' ? 'text-teal-ink' : 'text-primary'}`}>
            {resource.type === 'link' ? <LinkIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          </div>
        </div>
        {layout === 'grid' && (
             <button 
                onClick={() => handleDelete(resource.id)}
                aria-label={`Delete "${resource.title}"`}
                className="text-muted hover:text-error transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 w-8 h-8 -m-1.5 flex items-center justify-center hover:bg-error-soft rounded-md"
             >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
             </button>
        )}
      </div>
      
      <div className={`${layout === 'grid' ? 'mb-1.5' : 'flex-1 min-w-0'}`}>
        <h3 className={`font-medium text-ink line-clamp-1 break-words ${isCompact ? 'text-sm' : 'text-base'} ${resource.completed ? 'line-through text-muted' : ''}`}>
            {resource.title}
        </h3>
        {layout === 'list' && resource.notes && (
             <p className="text-muted text-xs truncate mt-0.5">{resource.notes}</p>
        )}
      </div>
      
      {layout === 'grid' && resource.notes && (
        <p className={`text-muted text-[13px] mb-3 line-clamp-2 leading-relaxed ${isCompact ? 'min-h-[0.8rem]' : 'min-h-[2rem]'}`}>
            {resource.notes}
        </p>
      )}

      <div className={`flex flex-wrap gap-1.5 ${layout === 'grid' ? 'mb-4' : 'hidden lg:flex'}`}>
        {resource.tags.slice(0, layout === 'list' ? 2 : 3).map(tag => (
          <span key={tag} className="text-xs px-2 py-0.5 bg-surface-soft rounded-full text-muted font-medium">
            {tag}
          </span>
        ))}
        {resource.tags.length > (layout === 'list' ? 2 : 3) && (
          <span className="text-xs px-1.5 py-0.5 text-muted font-medium">
            +{resource.tags.length - (layout === 'list' ? 2 : 3)}
          </span>
        )}
      </div>

      <div className={`${layout === 'grid' ? 'flex items-center justify-between mt-auto pt-3 w-full' : 'flex items-center gap-4 ml-auto'}`}>
        <span className="text-xs text-muted font-mono tabular-nums">
          {new Date(resource.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
        
        <div className="flex items-center gap-3 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition">
            {resource.type === 'link' && resource.url && (
            <a 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 text-primary hover:text-primary-active transition-colors font-medium"
            >
                Visit <ExternalLink className="w-2.5 h-2.5" />
            </a>
            )}

            {resource.type === 'file' && resource.url && (
            <button 
                onClick={() => handleDownloadFile(resource)}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary-active transition-colors font-medium max-w-[100px]"
            >
                <span className="truncate">{resource.fileName || "Download"}</span>
                <Download className="w-2.5 h-2.5 flex-shrink-0" />
            </button>
            )}
             {layout === 'list' && (
                 <button 
                    onClick={() => handleDelete(resource.id)}
                    aria-label={`Delete "${resource.title}"`}
                    className="text-muted hover:text-error transition-colors w-8 h-8 flex items-center justify-center hover:bg-error-soft rounded-md"
                 >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                 </button>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className={`${isCompact ? 'py-2 px-4' : 'py-3 px-6'} border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition z-30`}>
        <div className="flex-shrink-0">
          <h1 className={`${isCompact ? 'text-2xl' : 'text-3xl md:text-[34px]'} leading-tight font-display text-ink`}>Learning Resources</h1>
          <p className="text-muted text-xs hidden sm:block">Organize your papers, datasets, and tutorials.</p>
        </div>

        {/* Uniform Search Bar */}
        <SearchBar 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            resources={resources} 
        />

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-active text-white h-10 px-4 rounded-md font-medium transition active:scale-[0.99] text-sm flex-shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Resource</span>
        </button>
      </div>

      <div className="border-b border-hairline">
        <div className={`${isCompact ? 'p-2' : 'p-3'} flex flex-col gap-3`}>

            <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                {/* Folder Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveFolderId('all')}
                        className={`flex items-center gap-2 h-9 px-3 rounded-md text-[13px] font-medium transition
                        ${activeFolderId === 'all' 
                            ? 'bg-[var(--neon-primary)] text-white' 
                            : 'text-muted hover:text-ink hover:bg-surface-soft border border-transparent hover:border-hairline'}`}
                    >
                        <Folder className="w-3.5 h-3.5" />
                        All
                    </button>
                    {folders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setActiveFolderId(folder.id)}
                            className={`flex items-center gap-2 h-9 px-3 rounded-md text-[13px] font-medium transition whitespace-nowrap
                            ${activeFolderId === folder.id 
                                ? 'bg-[var(--neon-primary)] text-white' 
                                : 'text-muted hover:text-ink hover:bg-surface-soft border border-transparent hover:border-hairline'}`}
                        >
                            <Folder className="w-3.5 h-3.5" />
                            {folder.name}
                        </button>
                    ))}
                    <button
                        onClick={handleAddFolder}
                        className="flex items-center gap-2 h-9 px-3 rounded-md text-[13px] font-medium text-muted hover:text-primary hover:bg-surface-soft border border-dashed border-hairline-strong hover:border-[var(--neon-primary)]/50 transition"
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
                    className={`h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors
                    ${!filterTag ? 'bg-primary-soft border-primary/40 text-primary-active' : 'bg-canvas border-hairline-strong text-body hover:border-ink hover:text-ink'}`}
                >
                    All Tags
                </button>
                {allTags.map(tag => (
                    <button
                    key={tag}
                    onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                    className={`h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors
                        ${filterTag === tag ? 'bg-primary-soft border-primary/40 text-primary-active' : 'bg-canvas border-hairline-strong text-body hover:border-ink hover:text-ink'}`}
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
          <div className="h-64 flex flex-col items-center justify-center text-muted">
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
                  <div className="h-px bg-surface-card flex-1" />
                  <div className="flex items-center gap-2 text-muted text-sm font-medium px-2 py-1 rounded-full bg-surface-soft border border-hairline">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </div>
                  <div className="h-px bg-surface-card flex-1" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 overscroll-contain">
          <div role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" className="bg-canvas rounded-xl w-full max-w-sm shadow-lift animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-hairline flex items-center justify-between">
              <h2 id="folder-dialog-title" className="font-display text-2xl text-ink">Create Folder</h2>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                aria-label="Close"
                className="w-10 h-10 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-soft transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="rb-folder-name" className="block text-sm font-medium text-body-strong mb-1.5">Folder name</label>
                <input id="rb-folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                  className="w-full h-10 bg-canvas border border-hairline-strong rounded-md px-3 text-sm text-ink placeholder:text-muted-soft focus:border-primary transition-colors"
                  placeholder="e.g., Diffusion Models…"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 border-t border-hairline flex justify-end gap-3 bg-surface-soft rounded-b-xl">
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="h-10 px-4 rounded-md text-sm font-medium text-body hover:text-ink hover:bg-surface-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className={`h-10 px-4 rounded-md text-sm font-medium transition-colors ${
                  !newFolderName.trim()
                    ? 'bg-surface-card text-muted-soft cursor-not-allowed'
                    : 'bg-[var(--neon-primary)] hover:bg-primary-active text-white'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 overscroll-contain">
          <div role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title" className="bg-canvas rounded-xl w-full max-w-md shadow-lift animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-hairline">
              <h2 id="resource-dialog-title" className="font-display text-2xl text-ink">Add New Resource</h2>
            </div>
            <div className="p-4 md:p-6 space-y-5 overflow-y-auto">
              
              {/* Title & Type */}
              <div>
                <label htmlFor="rb-title" className="block text-sm font-medium text-body-strong mb-1.5">Title</label>
                <input id="rb-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-10 bg-canvas border border-hairline-strong rounded-md px-3 text-sm text-ink placeholder:text-muted-soft focus:border-primary transition-colors"
                  placeholder="e.g., Attention Is All You Need…"
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label htmlFor="rb-folder" className="block text-sm font-medium text-body-strong mb-1.5">Folder</label>
                <select id="rb-folder" 
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full h-10 bg-canvas border border-hairline-strong rounded-md px-3 text-sm text-ink placeholder:text-muted-soft focus:border-primary transition-colors"
                >
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex gap-4 p-1 bg-surface-soft rounded-lg w-fit border border-hairline">
                <button
                    onClick={() => setNewType('link')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        newType === 'link' ? 'bg-canvas text-ink shadow-soft' : 'text-muted hover:text-ink'
                    }`}
                >
                    Link URL
                </button>
                <button
                    onClick={() => setNewType('file')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        newType === 'file' ? 'bg-canvas text-ink shadow-soft' : 'text-muted hover:text-ink'
                    }`}
                >
                    Upload File
                </button>
              </div>

              {/* URL or File Input */}
              {newType === 'link' ? (
                <div>
                  <label htmlFor="rb-url" className="block text-sm font-medium text-body-strong mb-1.5">URL</label>
                  <input id="rb-url"
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full h-10 bg-canvas border border-hairline-strong rounded-md px-3 text-sm text-ink placeholder:text-muted-soft focus:border-primary transition-colors"
                    placeholder="https://arxiv.org/abs/…"
                  />
                </div>
              ) : (
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label="Upload file"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted bg-surface-soft cursor-pointer hover:bg-surface-card transition-colors relative
                    ${selectedFile ? 'border-[var(--neon-primary)]/50' : 'border-hairline'}
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
                     <div className="w-full flex items-center gap-4 bg-surface-soft p-3 rounded-lg border border-hairline">
                        <div className="p-3 bg-error-soft rounded-lg text-error">
                             <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-ink truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                            aria-label="Remove selected file"
                            className="w-8 h-8 flex items-center justify-center hover:bg-surface-card rounded-full text-muted hover:text-ink"
                        >
                            <X className="w-4 h-4" />
                        </button>
                     </div>
                   ) : (
                     <>
                        {userProfile.plan === 'free' && (resources.filter(r => r.type === 'file').length >= 5) ? (
                            <div className="text-center">
                                <Lock className="w-8 h-8 mb-2 mx-auto text-amber-ink" />
                                <span className="text-sm text-amber-ink font-medium">Free Plan Limit Reached (5/5)</span>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-primary" aria-hidden="true" />
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
                <label htmlFor="rb-tags" className="block text-sm font-medium text-body-strong mb-1.5">Tags</label>
                <div className="flex gap-2 mb-2">
                    <input id="rb-tags" 
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Create new tag…"
                        className="flex-1 min-w-0 h-10 bg-canvas border border-hairline-strong rounded-md px-3 text-sm text-ink placeholder:text-muted-soft focus:border-primary transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <button 
                        onClick={handleAddTag}
                        className="px-3 py-1.5 bg-surface-soft border border-hairline text-body rounded-lg text-sm hover:bg-surface-card hover:text-ink"
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
                          ? 'bg-primary-soft border-primary/40 text-primary-active'
                          : 'bg-surface-soft border-hairline text-muted hover:border-hairline-strong'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="rb-notes" className="block text-sm font-medium text-body-strong mb-1.5">Notes</label>
                <textarea id="rb-notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full h-24 py-2.5 bg-canvas border border-hairline-strong rounded-md px-3 text-sm text-ink placeholder:text-muted-soft focus:border-primary transition-colors resize-none"
                  placeholder="Key takeaways…"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-hairline flex justify-end gap-3 bg-surface-soft rounded-b-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-md text-sm font-medium text-body hover:text-ink hover:bg-surface-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                className="h-10 px-4 rounded-md bg-primary hover:bg-primary-active text-white text-sm font-medium transition active:scale-[0.99]"
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