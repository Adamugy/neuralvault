import React, { useState, useEffect } from 'react';
import { Search, Link as LinkIcon, FileText, Globe, ExternalLink, X } from 'lucide-react';
import { Resource } from '../types';

interface SearchBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    resources: Resource[];
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
    searchTerm, 
    setSearchTerm, 
    resources,
    placeholder = "Search resources, tags, or notes..."
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [filteredResults, setFilteredResults] = useState<Resource[]>([]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredResults([]);
            return;
        }

        const filtered = resources.filter(res => 
            res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredResults(filtered);
    }, [searchTerm, resources]);

    return (
        <div className="flex-1 max-w-xl mx-4 relative group">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isFocused ? 'text-[var(--neon-primary)]' : 'text-slate-500'
            }`} />
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="w-full bg-white/5 border border-white/10 text-slate-200 pl-10 pr-10 py-1.5 rounded-xl focus:outline-none focus:border-[var(--neon-primary)]/50 focus:bg-white/10 placeholder:text-slate-600 transition-all text-sm"
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Dropdown Results */}
            {isFocused && searchTerm.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {filteredResults.length > 0 ? (
                            <div className="space-y-1">
                                {filteredResults.slice(0, 5).map(res => (
                                    <button
                                        key={res.id}
                                        className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-left group/item"
                                        onClick={() => {
                                            // Handle redirection or selection if needed
                                            // For now, it just shows the result
                                        }}
                                    >
                                        <div className={`p-1.5 rounded-lg ${res.type === 'link' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                            {res.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-slate-200 truncate group-hover/item:text-[var(--neon-primary)] transition-colors">{res.title}</div>
                                            <div className="text-[10px] text-slate-500 flex gap-2">
                                                <span>{new Date(res.dateAdded).toLocaleDateString()}</span>
                                                {res.tags.length > 0 && <span className="truncate"># {res.tags[0]}</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                <div className="h-px bg-white/5 mx-2 my-2" />
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                                No local resources found.
                            </div>
                        )}

                        {/* Google Search Integration */}
                        <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 p-3 hover:bg-[var(--neon-primary)]/10 rounded-xl transition-all group/web"
                        >
                            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-full group-hover/web:bg-indigo-500 group-hover/web:text-white transition-all">
                                <Globe className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-200 group-hover/web:text-[var(--neon-primary)]">Search the Web</div>
                                <div className="text-[10px] text-slate-500">Google search for "{searchTerm}"</div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-600 group-hover/web:text-[var(--neon-primary)]" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
