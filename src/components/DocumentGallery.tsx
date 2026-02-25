import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { FileText, Download, Clock } from 'lucide-react';

interface GeneratedDocument {
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
}

export const DocumentGallery: React.FC = () => {
    const { getToken } = useAuth();
    const { showToast } = useNotification();
    const [docs, setDocs] = useState<GeneratedDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        try {
            const token = await getToken();
            const res = await fetch('/api/academic/gallery', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDocs(data);
            }
        } catch (error) {
            console.error('Failed to load gallery', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (doc: GeneratedDocument, format: 'pdf' | 'docx') => {
        try {
            const token = await getToken();
            const res = await fetch(`/api/academic/export-${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: doc.title,
                    content: doc.content
                })
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.title}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showToast(`Failed to export ${format.toUpperCase()}`, 'error');
        }
    };

    if (loading) return <div className="text-center p-8 text-gray-400">Loading gallery...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {docs.length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-12">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No documents generated yet.</p>
                </div>
            ) : (
                docs.map((doc) => (
                    <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                <h3 className="font-semibold text-white truncate max-w-[150px]" title={doc.title}>
                                    {doc.title}
                                </h3>
                            </div>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded capitalize">
                                {doc.type}
                            </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex gap-2 mt-auto">
                            <button 
                                onClick={() => handleExport(doc, 'pdf')}
                                className="flex-1 flex items-center justify-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                            >
                                <Download className="w-3 h-3" /> PDF
                            </button>
                            <button 
                                onClick={() => handleExport(doc, 'docx')}
                                className="flex-1 flex items-center justify-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
                            >
                                <Download className="w-3 h-3" /> DOCX
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
