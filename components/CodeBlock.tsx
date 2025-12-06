import React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, className }) => {
  return (
    <pre className={`font-mono text-xs leading-relaxed overflow-x-auto p-4 rounded bg-slate-950 border border-slate-800 text-slate-300 ${className}`}>
      <code>{code}</code>
    </pre>
  );
};