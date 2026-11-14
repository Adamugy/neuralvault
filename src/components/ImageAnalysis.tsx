import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Zap, Loader2, ScanLine, Lock, Star, Sparkles, Brain, Bot, Copy, Download, ScanEye, GraduationCap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, Resource } from '../types';
import { SearchBar } from './SearchBar';


interface ImageAnalysisProps {
    userProfile?: UserProfile;
    resources?: Resource[];
    onOpenUpgrade?: () => void;
}

export const ImageAnalysis: React.FC<ImageAnalysisProps> = ({ userProfile, resources = [], onOpenUpgrade }) => {
  const { getToken } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPremium = userProfile?.plan !== 'free';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null); // Clear previous result
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setResult(null);
      }
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const finalPrompt = prompt.trim() || "Analyze this image in detail. Identify any diagrams, mathematical formulas, or code related to deep learning. Explain the concepts shown.";
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('prompt', finalPrompt);

      const res = await fetch('/api/ai/analyze-image', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`
          },
          body: formData
      });

      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data.text);
    } catch (error) {
      setResult("Error analyzing image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image_analysis.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-transparent flex flex-col overflow-hidden relative">
      {/* Uniform Header */}
      <div className="sticky top-0 z-20 px-6 py-2.5 border-b border-hairline bg-canvas/95 flex justify-between items-center">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
            <ScanEye className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-ink tracking-tight">Image Analysis</h1>
            <div className="flex items-center gap-2 text-xs text-muted">
               <Sparkles className="w-3 h-3 text-amber-ink" />
               <span>Visual AI Insights</span>
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
            {!isPremium && (
                <button onClick={onOpenUpgrade} className="text-xs bg-teal-ink text-white px-3 py-1 rounded-full font-medium hover:bg-success-ink transition-colors">
                PRO
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="max-w-4xl mx-auto w-full space-y-8">
            {/* The old big header is removed/slimmed down to content */}

        {/* Upload Area */}
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition duration-300
                ${isDragging 
                    ? 'border-[var(--neon-primary)] bg-[var(--neon-primary)]/10' 
                    : 'border-hairline bg-surface-soft hover:border-hairline-strong hover:bg-surface-card'}
            `}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />
            
            {imagePreview ? (
                <div className="relative inline-block group">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-80 rounded-lg shadow-lift border border-hairline-strong" 
                    />
                    <button 
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 p-1.5 bg-error text-ink rounded-full shadow-lg hover:bg-error transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                    {!result && !isAnalyzing && (
                        <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                             <p className="text-ink font-medium">Ready to Analyze</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 pointer-events-none">
                    <div className="w-20 h-20 mx-auto rounded-full bg-surface-card flex items-center justify-center border border-hairline">
                        <Upload className="w-10 h-10 text-muted" />
                    </div>
                    <div>
                        <p className="text-xl font-medium text-ink">
                            Drag & drop your image here
                        </p>
                        <p className="text-muted mt-1">or click to browse files</p>
                    </div>
                    <div className="flex gap-4 justify-center mt-6">
                        <span className="text-xs px-3 py-1 bg-surface-soft rounded-full text-muted border border-hairline">JPG</span>
                        <span className="text-xs px-3 py-1 bg-surface-soft rounded-full text-muted border border-hairline">PNG</span>
                        <span className="text-xs px-3 py-1 bg-surface-soft rounded-full text-muted border border-hairline">WEBP</span>
                    </div>
                </div>
            )}

            {!imagePreview && (
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                 />
            )}
        </div>

        {/* Action Buttons */}
        {imagePreview && !result && !isAnalyzing && (
            <div className="flex justify-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[var(--neon-primary)] hover:bg-primary-active text-white rounded-xl font-bold transition transform hover:scale-105 text-sm"
                >
                    <Sparkles className="w-4 h-4" />
                    Analyze Image
                </button>
            </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
             <div className="glass-panel rounded-xl p-8 text-center animate-in fade-in">
                 <div className="w-12 h-12 mx-auto mb-4 relative">
                     <div className="absolute inset-0 rounded-full border-4 border-hairline"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-t-[var(--neon-primary)] animate-spin"></div>
                     <Brain className="absolute inset-0 m-auto w-5 h-5 text-ink animate-pulse" />
                 </div>
                 <h3 className="text-xl font-bold text-ink mb-2">Analyzing Visual Content</h3>
                 <p className="text-muted">Extracting text, identifying diagrams, and generating insights...</p>
             </div>
        )}

        {/* Results */}
        {result && (
            <div className="glass-panel rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="px-6 py-4 border-b border-hairline bg-surface-soft flex justify-between items-center">
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[var(--neon-primary)]" />
                        Analysis Result
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleCopy} className="p-2 hover:bg-surface-card rounded-lg text-muted hover:text-ink transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={handleDownload} className="p-2 hover:bg-surface-card rounded-lg text-muted hover:text-ink transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-8 prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface-soft prose-pre:border prose-pre:border-hairline">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result}
                    </ReactMarkdown>
                </div>
                <div className="px-6 py-4 bg-surface-soft border-t border-hairline flex justify-end">
                    <button 
                        onClick={() => {
                            setResult(null);
                            clearImage();
                        }}
                        className="text-sm text-muted hover:text-ink transition-colors"
                    >
                        Analyze Another Image
                    </button>
                </div>
            </div>
        )}
        </div>
      </div>
    </div>
  );
};