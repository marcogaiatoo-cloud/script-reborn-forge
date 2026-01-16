import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Play, Square, ShoppingCart, Download, Link2 } from 'lucide-react';
import FrameworkSelector, { Framework } from './FrameworkSelector';
import StreamingOutput from './StreamingOutput';
import CodeBlock from './CodeBlock';
import { streamGenerateScript, ScriptFile } from '@/lib/streamApi';
import JSZip from 'jszip';
import { toast } from 'sonner';

const TebexToScript = () => {
  const [tebexUrl, setTebexUrl] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [framework, setFramework] = useState<Framework>('esx');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);
  const abortRef = useRef<(() => void) | null>(null);

  const isValidTebexUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('tebex') || 
             parsed.hostname.includes('buycraft') ||
             parsed.hostname.includes('fivem.net') ||
             parsed.hostname.includes('cfx.re') ||
             url.includes('tebex.io');
    } catch {
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!tebexUrl.trim() || !scriptName.trim()) {
      toast.error('Adicione o link do Tebex e um nome para o script');
      return;
    }

    if (!isValidTebexUrl(tebexUrl)) {
      toast.error('Por favor, insira um link válido do Tebex ou loja FiveM');
      return;
    }

    setIsGenerating(true);
    setStreamingText('');
    setGeneratedFiles([]);

    try {
      const { abort } = await streamGenerateScript({
        mode: 'tebex',
        framework,
        scriptName,
        tebexUrl,
        onChunk: (text) => setStreamingText(prev => prev + text),
        onFile: (file) => setGeneratedFiles(prev => [...prev, file]),
        onError: (error) => toast.error(error),
        onComplete: () => setIsGenerating(false),
      });
      abortRef.current = abort;
    } catch (error) {
      toast.error('Erro ao gerar script');
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current();
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (generatedFiles.length === 0) return;
    
    const zip = new JSZip();
    const folder = zip.folder(scriptName || 'script');
    
    generatedFiles.forEach(file => {
      folder?.file(file.path, file.content);
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scriptName || 'script'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <Input
            placeholder="Nome do script (ex: my_garage)"
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            className="font-mono bg-secondary/50 border-border"
          />

          <FrameworkSelector value={framework} onChange={setFramework} />

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Link do Script (Tebex, CFX.re, ou loja FiveM)
            </label>
            
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="https://store.tebex.io/script-name ou cfx.re/..."
                value={tebexUrl}
                onChange={(e) => setTebexUrl(e.target.value)}
                className="font-mono bg-secondary/50 border-border pl-10"
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              Cole o link da página do script. O sistema irá analisar a descrição, 
              features e screenshots para recriar o script.
            </p>
          </div>

          <div className="flex gap-3">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={!tebexUrl.trim() || !scriptName.trim()}
                className="flex-1 font-mono"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Analisar Loja e Gerar Script
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1 font-mono"
              >
                <Square className="w-4 h-4 mr-2" />
                Parar Geração
              </Button>
            )}
          </div>
        </div>
      </Card>

      {(isGenerating || streamingText) && (
        <StreamingOutput text={streamingText} isGenerating={isGenerating} />
      )}

      {generatedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono font-semibold text-foreground">
              Ficheiros Gerados ({generatedFiles.length})
            </h3>
            <Button onClick={handleDownloadZip} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download .zip
            </Button>
          </div>
          
          {generatedFiles.map((file, index) => (
            <CodeBlock key={file.path} file={file} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TebexToScript;
