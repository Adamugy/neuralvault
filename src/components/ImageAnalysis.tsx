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
      <div className="sticky top-0 z-20 px-6 py-2.5 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl flex justify-between items-center bg-noise">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ScanEye className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white tracking-tight">Image Analysis</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
               <Sparkles className="w-3 h-3 text-amber-500" />
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
                <button onClick={onOpenUpgrade} className="text-[10px] bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-3 py-1 rounded-full font-bold animate-pulse shadow-lg">
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
                relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
                ${isDragging 
                    ? 'border-[var(--neon-primary)] bg-[var(--neon-primary)]/10 shadow-[0_0_30px_-10px_var(--neon-primary)]' 
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'}
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
                      className="max-h-80 rounded-lg shadow-2xl border border-white/20" 
                    />
                    <button 
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                    {!result && !isAnalyzing && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                             <p className="text-white font-medium">Ready to Analyze</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 pointer-events-none">
                    <div className="w-20 h-20 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center border border-white/10">
                        <Upload className="w-10 h-10 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-xl font-medium text-white">
                            Drag & drop your image here
                        </p>
                        <p className="text-slate-500 mt-1">or click to browse files</p>
                    </div>
                    <div className="flex gap-4 justify-center mt-6">
                        <span className="text-xs px-3 py-1 bg-white/5 rounded-full text-slate-400 border border-white/10">JPG</span>
                        <span className="text-xs px-3 py-1 bg-white/5 rounded-full text-slate-400 border border-white/10">PNG</span>
                        <span className="text-xs px-3 py-1 bg-white/5 rounded-full text-slate-400 border border-white/10">WEBP</span>
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
                    className="flex items-center gap-2 px-6 py-2.5 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/90 text-white rounded-xl font-bold shadow-[0_0_15px_-5px_var(--neon-primary)] transition-all transform hover:scale-105 text-sm"
                >
                    <Sparkles className="w-4 h-4" />
                    Analyze Image
                </button>
            </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
             <div className="glass-panel border border-white/10 rounded-2xl p-8 text-center animate-in fade-in">
                 <div className="w-12 h-12 mx-auto mb-4 relative">
                     <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-t-[var(--neon-primary)] animate-spin"></div>
                     <Brain className="absolute inset-0 m-auto w-5 h-5 text-white animate-pulse" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Analyzing Visual Content</h3>
                 <p className="text-slate-400">Extracting text, identifying diagrams, and generating insights...</p>
             </div>
        )}

        {/* Results */}
        {result && (
            <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[var(--neon-primary)]" />
                        Analysis Result
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-8 prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result}
                    </ReactMarkdown>
                </div>
                <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end">
                    <button 
                        onClick={() => {
                            setResult(null);
                            clearImage();
                        }}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
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