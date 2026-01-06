import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Zap, Loader2, ScanLine, Lock, Star, Sparkles, Brain, Bot, Copy, Download, ScanEye } from 'lucide-react';
import { analyzeImageWithGemini } from '../services/geminiService';
import { UserProfile } from '../types';

interface ImageAnalysisProps {
    userProfile?: UserProfile;
    onOpenUpgrade?: () => void;
}

export const ImageAnalysis: React.FC<ImageAnalysisProps> = ({ userProfile, onOpenUpgrade }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
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
      const analysisText = await analyzeImageWithGemini(selectedImage, finalPrompt);
      setResult(analysisText);
    } catch (error) {
      setResult("Error analyzing image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full bg-transparent flex flex-col p-6 overflow-y-auto scrollbar-hide">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        <div className="glass-panel p-8 rounded-2xl border border-white/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-20">
               <ImageIcon className="w-32 h-32 text-[var(--neon-primary)]" />
           </div>
           <div className="relative z-10">
               <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                   <ScanEye className="w-8 h-8 text-[var(--neon-primary)]" />
                   Visual Learning Analysis
               </h1>
               <p className="text-slate-400 max-w-xl text-lg">
                   Upload diagrams, textbook pages, or handwritten notes. Our multimodal AI will explain concepts, solve problems, or convert handwriting to text.
               </p>
           </div>
        </div>

        {/* Upload Area */}
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
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
                      className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
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
                    className="flex items-center gap-2 px-8 py-3 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/90 text-white rounded-xl font-bold shadow-[0_0_20px_-5px_var(--neon-primary)] transition-all transform hover:scale-105"
                >
                    <Sparkles className="w-5 h-5" />
                    Analyze Image
                </button>
            </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
             <div className="glass-panel border border-white/10 rounded-2xl p-8 text-center animate-in fade-in">
                 <div className="w-16 h-16 mx-auto mb-4 relative">
                     <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-t-[var(--neon-primary)] animate-spin"></div>
                     <Brain className="absolute inset-0 m-auto w-6 h-6 text-white animate-pulse" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Analyzing Visual Content</h3>
                 <p className="text-slate-400">Extracting text, identifying diagrams, and generating insights...</p>
             </div>
        )}

        {/* Results */}
        {result && (
            <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bot className="w-5 h-5 text-[var(--neon-primary)]" />
                        Analysis Result
                    </h3>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-8 prose prose-invert max-w-none">
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{result}</p>
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

        {/* Pro Feature Prompt (if needed) */}
        {!isPremium && (
            <div className="rounded-2xl p-1 bg-gradient-to-r from-[var(--neon-primary)] via-purple-500 to-[var(--neon-secondary)]">
                <div className="bg-slate-950 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                         <div className="p-3 bg-[var(--neon-primary)]/20 rounded-lg text-[var(--neon-primary)]">
                             <Zap className="w-6 h-6" />
                         </div>
                         <div>
                             <h4 className="font-bold text-white text-lg">Upgrade to Pro</h4>
                             <p className="text-slate-400">Get unlimited image analysis and higher resolution support.</p>
                         </div>
                     </div>
                     <button 
                        onClick={onOpenUpgrade}
                        className="px-6 py-3 bg-[var(--neon-primary)] hover:bg-[var(--neon-primary)]/90 text-white rounded-xl font-bold whitespace-nowrap shadow-[0_0_15px_-5px_var(--neon-primary)] transition-all"
                     >
                         Unlock Pro Features
                     </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};