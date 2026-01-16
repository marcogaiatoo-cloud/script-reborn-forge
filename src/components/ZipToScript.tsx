import { useState, useCallback, useRef } from 'react';
import { Upload, FileArchive, Loader2, Download, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CodeBlock from './CodeBlock';
import StreamingOutput from './StreamingOutput';
import FrameworkSelector, { type Framework } from './FrameworkSelector';
import { parseZipFile, downloadZip, type ScriptFile } from '@/lib/zipUtils';
import { streamGenerateScript } from '@/lib/streamApi';
import { toast } from 'sonner';

const ZipToScript = () => {
  const [framework, setFramework] = useState<Framework>('esx');
  const [scriptName, setScriptName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ScriptFile[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const abortRef = useRef(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      await processZipFile(file);
    } else {
      toast.error('Por favor, envie um arquivo .zip');
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processZipFile(file);
    }
  };

  const processZipFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const files = await parseZipFile(file);
      setUploadedFiles(files);
      setScriptName(file.name.replace('.zip', ''));
      toast.success(`${files.length} ficheiros carregados`);
    } catch (error) {
      toast.error('Erro ao processar o arquivo .zip');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!scriptName.trim()) {
      toast.error('Digite um nome para o script');
      return;
    }

    setIsProcessing(true);
    setStreamingText('');
    setGeneratedFiles([]);
    setIsComplete(false);
    abortRef.current = false;

    const seenPaths = new Set<string>();
    const referenceFiles = uploadedFiles.map(f => ({ path: f.path, content: f.content }));

    await streamGenerateScript({
      mode: 'zip',
      framework,
      scriptName,
      referenceFiles,
      onChunk: (chunk) => {
        if (abortRef.current) return;
        setStreamingText(prev => prev + chunk);
      },
      onFile: (file) => {
        if (abortRef.current) return;
        if (!seenPaths.has(file.path)) {
          seenPaths.add(file.path);
          setGeneratedFiles(prev => {
            const existing = prev.find(f => f.path === file.path);
            if (existing) {
              return prev.map(f => f.path === file.path ? file : f);
            }
            return [...prev, file];
          });
        }
      },
      onComplete: () => {
        setIsProcessing(false);
        setIsComplete(true);
        toast.success('Script gerado com sucesso!');
      },
      onError: (error) => {
        setIsProcessing(false);
        toast.error(error);
      },
    });
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsProcessing(false);
    toast.info('Geração interrompida');
  };

  const handleDownload = async () => {
    if (generatedFiles.length === 0) return;
    await downloadZip(generatedFiles, scriptName);
    toast.success('Download iniciado!');
  };

  const isGenerating = isProcessing && uploadedFiles.length > 0 && streamingText.length > 0;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
        }`}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          {isProcessing && !isGenerating ? (
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          ) : uploadedFiles.length > 0 ? (
            <FileArchive className="w-12 h-12 mx-auto text-terminal-green" />
          ) : (
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
          )}
          
          <div>
            <p className="text-lg font-medium text-foreground">
              {uploadedFiles.length > 0 
                ? `${uploadedFiles.length} ficheiros carregados`
                : 'Arraste o .zip ou clique para selecionar'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              O conteúdo será analisado e recriado
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      {uploadedFiles.length > 0 && !isGenerating && !isComplete && (
        <div className="space-y-6 p-6 rounded-xl bg-card border border-border animate-fade-in">
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Nome do Script
            </label>
            <Input
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="ex: meu-script"
              className="font-mono bg-secondary/50 border-border focus:border-primary"
              disabled={isProcessing}
            />
          </div>

          <FrameworkSelector value={framework} onChange={setFramework} />

          <p className="text-xs text-muted-foreground">
            💡 NUI só será recriado se estiver presente no arquivo original
          </p>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isProcessing || !scriptName.trim()}
              className="flex-1 h-12 font-mono text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Script
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Streaming Output */}
      {(isGenerating || (streamingText && !isComplete)) && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            {isProcessing && (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="font-mono"
              >
                <Square className="w-4 h-4 mr-2" />
                Parar
              </Button>
            )}
          </div>
          <StreamingOutput 
            text={streamingText} 
            isGenerating={isProcessing} 
          />
        </div>
      )}

      {/* Generated Files */}
      {isComplete && generatedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground font-mono">
              Ficheiros Gerados ({generatedFiles.length})
            </h3>
            <Button
              onClick={handleDownload}
              className="bg-terminal-green hover:bg-terminal-green/90 text-primary-foreground font-mono"
            >
              <Download className="w-4 h-4 mr-2" />
              Download .zip
            </Button>
          </div>

          <div className="space-y-4">
            {generatedFiles.map((file, index) => (
              <CodeBlock key={file.path} file={file} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZipToScript;
