import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-700 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                    AI
                </div>
                <h1 className="font-bold text-xl tracking-tight">Native Studio</h1>
            </div>
            <div className="text-sm text-slate-400 font-mono">
                v0.1.0-alpha
            </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
};