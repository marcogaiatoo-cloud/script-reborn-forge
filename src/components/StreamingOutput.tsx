import { useEffect, useRef } from 'react';
import { Terminal, Loader2 } from 'lucide-react';

interface StreamingOutputProps {
  content: string;
  isStreaming: boolean;
}

const StreamingOutput = ({ content, isStreaming }: StreamingOutputProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-terminal-green" />
          <span className="font-mono text-sm text-foreground">Geração em progresso</span>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="font-mono">Escrevendo código...</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="p-4 max-h-[500px] overflow-y-auto scrollbar-thin"
      >
        <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
          )}
        </pre>
      </div>
    </div>
  );
};

export default StreamingOutput;
