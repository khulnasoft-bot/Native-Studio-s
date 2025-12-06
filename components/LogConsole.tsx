import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogConsoleProps {
  logs: LogEntry[];
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black/40 rounded-lg border border-slate-700/50 backdrop-blur overflow-hidden flex flex-col h-64">
        <div className="bg-slate-800/50 px-3 py-1 text-xs font-mono text-slate-400 border-b border-slate-700 flex justify-between">
            <span>TERMINAL OUTPUT</span>
            <span>zsh</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
            {logs.length === 0 && <span className="text-slate-600 italic">Ready for input...</span>}
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <span className="text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <div className="flex-1 break-words">
                        <span className={`font-bold mr-2 
                            ${log.source === 'Architect' ? 'text-purple-400' : 
                              log.source === 'Coder' ? 'text-blue-400' : 
                              log.source === 'Reviewer' ? 'text-orange-400' : 
                              log.source === 'FileOps' ? 'text-yellow-400' : 'text-slate-400'}`}>
                            [{log.source}]
                        </span>
                        <span className={
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'warning' ? 'text-amber-400' :
                            'text-slate-300'
                        }>{log.message}</span>
                        {log.details && (
                             <pre className="mt-1 ml-4 text-[10px] text-slate-500 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                             </pre>
                        )}
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    </div>
  );
};