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
    placeholder = "Search resources, tags, or notes…"
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
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
                isFocused ? 'text-primary' : 'text-muted'
            }`} />
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                aria-label={placeholder.replace("…", "")}
                name="search"
                autoComplete="off"
                className="w-full h-10 bg-canvas border border-hairline-strong text-ink pl-10 pr-10 rounded-md focus:border-primary placeholder:text-muted-soft transition-colors text-sm"
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-muted hover:text-ink transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Dropdown Results */}
            {isFocused && searchTerm.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-canvas border border-hairline rounded-lg shadow-lift overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {filteredResults.length > 0 ? (
                            <div className="space-y-1">
                                {filteredResults.slice(0, 5).map(res => (
                                    <button
                                        key={res.id}
                                        className="w-full flex items-center gap-3 p-2.5 hover:bg-surface-soft rounded-md transition-colors text-left group/item"
                                        onClick={() => {
                                            // Handle redirection or selection if needed
                                            // For now, it just shows the result
                                        }}
                                    >
                                        <div className={`p-1.5 rounded-lg ${res.type === 'link' ? 'bg-teal/15 text-teal-ink' : 'bg-primary-soft text-primary'}`}>
                                            {res.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-body-strong truncate group-hover/item:text-primary transition-colors">{res.title}</div>
                                            <div className="text-xs text-muted flex gap-2">
                                                <span>{new Date(res.dateAdded).toLocaleDateString()}</span>
                                                {res.tags.length > 0 && <span className="truncate"># {res.tags[0]}</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                <div className="h-px bg-surface-soft mx-2 my-2" />
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-muted text-center">
                                No local resources found.
                            </div>
                        )}

                        {/* Google Search Integration */}
                        <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary-soft rounded-md transition group/web"
                        >
                            <div className="p-2 bg-primary-soft text-primary rounded-full group-hover/web:bg-primary group-hover/web:text-white transition">
                                <Globe className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-body-strong group-hover/web:text-primary-active">Search the Web</div>
                                <div className="text-xs text-muted">Google search for "{searchTerm}"</div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted group-hover/web:text-primary-active" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
