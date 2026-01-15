import { useState } from 'react';
import { Check, Copy, FileCode, FileJson, Database, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/zipUtils';
import type { ScriptFile } from '@/lib/zipUtils';

interface CodeBlockProps {
  file: ScriptFile;
  index: number;
}

const getFileIcon = (type: ScriptFile['type']) => {
  switch (type) {
    case 'lua':
      return <FileCode className="w-4 h-4 text-terminal-cyan" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-code-variable" />;
    case 'sql':
      return <Database className="w-4 h-4 text-terminal-yellow" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
};

const CodeBlock = ({ file, index }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(file.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = file.content.split('\n');

  return (
    <div 
      className="rounded-lg overflow-hidden border border-border bg-card animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-3">
          {getFileIcon(file.type)}
          <span className="font-mono text-sm text-foreground">{file.path}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
            {file.type.toUpperCase()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-3 text-xs font-mono hover:bg-primary/10 hover:text-primary"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-terminal-green" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copiar
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto scrollbar-thin">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono">
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex">
                <span className="select-none w-10 pr-4 text-right text-code-line shrink-0">
                  {lineIndex + 1}
                </span>
                <span className="text-foreground/90">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
