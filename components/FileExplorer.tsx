import React, { useState, useEffect } from 'react';
import { vfs } from '../services/mockFileSystem';
import { VirtualFile } from '../types';
import { File, Folder } from 'lucide-react';

interface FileExplorerProps {
  refreshTrigger: number;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    setFiles(vfs.getAllFiles());
    if (!selectedFile && vfs.getAllFiles().length > 0) {
        setSelectedFile(vfs.getAllFiles()[0].path);
    }
  }, [refreshTrigger, selectedFile]);

  const activeContent = files.find(f => f.path === selectedFile)?.content || '';

  return (
    <div className="flex h-full border-r border-slate-700 bg-surface/30 w-80 flex-col">
        <div className="p-3 border-b border-slate-700 font-semibold text-sm text-slate-200 flex items-center gap-2">
            <Folder size={16} className="text-blue-400"/> Project Files
        </div>
        
        {/* File List */}
        <div className="flex-1 overflow-y-auto">
            {files.map(file => (
                <div 
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className={`px-4 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors
                        ${selectedFile === file.path ? 'bg-primary/20 text-blue-200 border-r-2 border-primary' : 'text-slate-400 hover:bg-white/5'}
                    `}
                >
                    <File size={14} />
                    <span className="truncate">{file.path}</span>
                </div>
            ))}
        </div>

        {/* Mini Preview */}
        <div className="h-1/2 border-t border-slate-700 flex flex-col">
            <div className="p-2 text-xs font-mono text-slate-500 bg-black/20 border-b border-slate-700">
                PREVIEW: {selectedFile}
            </div>
            <div className="flex-1 bg-slate-950 overflow-auto p-2">
                <pre className="text-[10px] font-mono text-slate-400 leading-relaxed">
                    {activeContent}
                </pre>
            </div>
        </div>
    </div>
  );
};