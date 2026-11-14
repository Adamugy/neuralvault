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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  
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
      className={`bg-card border border-hairline rounded-xl transition duration-200 group relative
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

  // ---- Dashboard summary (derived from the loaded resources, no extra requests) ----
  const totalCount = resources.length;
  const completedCount = resources.filter(r => r.completed).length;
  const completedPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const linkCount = resources.filter(r => r.type === 'link').length;
  const fileCount = resources.filter(r => r.type === 'file').length;
  const tagCounts = Object.entries(
    resources.reduce<Record<string, number>>((acc, r) => {
      r.tags.forEach(t => { acc[t] = (acc[t] || 0) + 1; });
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const topTags = tagCounts.slice(0, 5);
  const tagTotal = topTags.reduce((sum, [, n]) => sum + n, 0);
  const TAG_COLORS = ['bg-primary', 'bg-teal-ink', 'bg-amber', 'bg-accent', 'bg-muted-soft'];
  const folderName = (id?: string) => folders.find(f => f.id === (id || 'general'))?.name || 'General';
  const hostOf = (url?: string) => { try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; } };
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const statusTabs = [
    { id: 'all' as const, label: 'All', count: filteredResources.length },
    { id: 'active' as const, label: 'Active', count: activeResources.length },
    { id: 'completed' as const, label: 'Completed', count: completedResources.length },
  ];
  const visibleResources = statusFilter === 'active' ? activeResources
    : statusFilter === 'completed' ? completedResources
    : [...activeResources, ...completedResources];

  const ResourceActions = ({ resource }: { resource: Resource }) => (
    <div className="flex items-center justify-end gap-1">
      {resource.type === 'link' && resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit "${resource.title}"`}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-surface-soft transition-colors"
        >
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </a>
      )}
      {resource.type === 'file' && resource.url && (
        <button
          onClick={() => handleDownloadFile(resource)}
          aria-label={`Download ${resource.fileName || resource.title}`}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-surface-soft transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
      <button
        onClick={() => handleDelete(resource.id)}
        aria-label={`Delete "${resource.title}"`}
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-error hover:bg-error-soft transition-colors"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );

  const StatusBadge = ({ done }: { done: boolean }) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${done ? 'text-muted' : 'text-success-ink'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-muted-soft' : 'bg-success'}`} aria-hidden="true" />
      {done ? 'Completed' : 'Active'}
    </span>
  );

  const renderTable = (items: Resource[]) => (
    <div className="bg-card border border-hairline rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-hairline">
            <th scope="col" className="w-10 pl-4 py-3 font-medium"><span className="sr-only">Completed</span></th>
            <th scope="col" className="py-3 pr-4 font-medium">Resource</th>
            <th scope="col" className="py-3 pr-4 font-medium hidden lg:table-cell">Folder</th>
            <th scope="col" className="py-3 pr-4 font-medium hidden xl:table-cell">Tags</th>
            <th scope="col" className="py-3 pr-4 font-medium whitespace-nowrap">Added</th>
            <th scope="col" className="py-3 pr-4 font-medium">Status</th>
            <th scope="col" className="py-3 pr-4 font-medium text-right"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(resource => (
            <tr key={resource.id} data-row className="border-b border-hairline last:border-b-0 hover:bg-surface-soft/60 transition-colors">
              <td className="pl-4 py-3 align-middle">
                <input
                  type="checkbox"
                  checked={resource.completed}
                  onChange={() => handleToggleComplete(resource.id)}
                  aria-label={resource.completed ? `Mark "${resource.title}" as not completed` : `Mark "${resource.title}" as completed`}
                  className="w-4 h-4 rounded cursor-pointer accent-[var(--neon-primary)]"
                />
              </td>
              <td className="py-3 pr-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${resource.type === 'link' ? 'bg-teal/15 text-teal-ink' : 'bg-primary-soft text-primary'}`} aria-hidden="true">
                    {resource.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className={`font-medium truncate max-w-[340px] ${resource.completed ? 'text-muted line-through' : 'text-ink'}`}>{resource.title}</div>
                    <div className="text-xs text-muted truncate max-w-[340px]">
                      {resource.type === 'link' ? (hostOf(resource.url) || 'Link') : (resource.fileName || 'File')}
                      {resource.notes ? ` · ${resource.notes}` : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 hidden lg:table-cell text-body whitespace-nowrap">{folderName(resource.folderId)}</td>
              <td className="py-3 pr-4 hidden xl:table-cell">
                <div className="flex gap-1.5">
                  {resource.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-surface-soft border border-hairline rounded-full text-body whitespace-nowrap">{tag}</span>
                  ))}
                  {resource.tags.length > 2 && <span className="text-xs text-muted">+{resource.tags.length - 2}</span>}
                </div>
              </td>
              <td className="py-3 pr-4 text-muted whitespace-nowrap tabular-nums">{dateFmt.format(new Date(resource.dateAdded))}</td>
              <td className="py-3 pr-4"><StatusBadge done={resource.completed} /></td>
              <td className="py-3 pr-3"><ResourceActions resource={resource} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const selectCls = "h-9 pl-3 pr-8 bg-card border border-hairline-strong rounded-md text-[13px] text-ink hover:border-ink focus:border-primary transition-colors";

  return (
    <div className="h-full flex flex-col">
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'space-y-4' : 'space-y-6'}`}>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className={`${isCompact ? 'text-2xl' : 'text-3xl md:text-[34px]'} leading-tight font-display text-ink`}>Learning Resources</h1>
            <p className="text-muted text-sm mt-1">Organize your papers, datasets, and tutorials.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddFolder}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-ink bg-card border border-hairline-strong hover:border-ink transition-colors"
            >
              <FolderPlus className="w-4 h-4" aria-hidden="true" />
              New Folder
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary-active text-white h-10 px-4 rounded-md font-medium transition active:scale-[0.99] text-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Resource</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div data-summary className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
          <section aria-label="Library overview" className="bg-card border border-hairline rounded-xl p-5">
            <div className="text-xs font-medium text-muted">Library size</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-5xl leading-none text-ink tabular-nums">{totalCount}</span>
              <span className="text-sm text-muted">resources</span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-surface-card overflow-hidden" role="progressbar" aria-valuenow={completedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Completed">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${completedPct}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted tabular-nums">{completedPct}% completed · {completedCount} of {totalCount}</div>
            <dl className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-hairline">
              {[
                { label: 'Links', value: linkCount },
                { label: 'Files', value: fileCount },
                { label: 'Folders', value: folders.length },
              ].map(s => (
                <div key={s.label}>
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="text-lg font-medium text-ink tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Topics" className="bg-card border border-hairline rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-muted">Topics across your library</div>
              <div className="text-xs text-muted tabular-nums">{tagCounts.length} tags</div>
            </div>
            {topTags.length ? (
              <>
                <div className="mt-5 flex h-2.5 rounded-full overflow-hidden gap-0.5" aria-hidden="true">
                  {topTags.map(([tag, n], i) => (
                    <div key={tag} className={`${TAG_COLORS[i]} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(n / tagTotal) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {topTags.map(([tag, n], i) => (
                    <li key={tag}>
                      <button
                        onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                        aria-pressed={filterTag === tag}
                        className={`w-full flex items-center gap-2.5 text-sm rounded-md -mx-1.5 px-1.5 py-1 transition-colors ${filterTag === tag ? 'bg-primary-soft' : 'hover:bg-surface-soft'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${TAG_COLORS[i]}`} aria-hidden="true" />
                        <span className="text-body truncate">{tag}</span>
                        <span className="ml-auto text-muted tabular-nums">{n}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-6 text-sm text-muted">Tag resources to see how your library is distributed.</p>
            )}
          </section>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div role="tablist" aria-label="Status" className="inline-flex p-1 bg-surface-card rounded-lg self-start">
            {statusTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={statusFilter === t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${statusFilter === t.id ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
                <span className="text-xs text-muted tabular-nums">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              resources={resources}
              className="w-full sm:w-72"
            />
            <div className="grid grid-cols-2 sm:flex gap-2">
              <label className="sr-only" htmlFor="rb-folder-filter">Folder</label>
              <select id="rb-folder-filter" value={activeFolderId} onChange={(e) => setActiveFolderId(e.target.value)} className={selectCls}>
                <option value="all">All folders</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <label className="sr-only" htmlFor="rb-tag-filter">Tag</label>
              <select id="rb-tag-filter" value={filterTag || ''} onChange={(e) => setFilterTag(e.target.value || null)} className={selectCls}>
                <option value="">All tags</option>
                {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {visibleResources.length === 0 ? (
          <div className="bg-card border border-dashed border-hairline-strong rounded-xl h-56 flex flex-col items-center justify-center text-muted">
            <Folder className="w-10 h-10 mb-3 text-muted-soft" aria-hidden="true" />
            <p>No resources found in this folder.</p>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleResources.map(renderResourceCard)}
          </div>
        ) : (
          <>
            <div className="hidden md:block">{renderTable(visibleResources)}</div>
            <div className="md:hidden grid gap-3">{visibleResources.map(renderResourceCard)}</div>
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