import { useState, useRef } from 'react';
import { Sparkles, Loader2, Download, FileText, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import CodeBlock from './CodeBlock';
import StreamingOutput from './StreamingOutput';
import FrameworkSelector, { type Framework } from './FrameworkSelector';
import PreferencesSelector, { type MySQLType, type LibType } from './PreferencesSelector';
import { downloadZip, type ScriptFile } from '@/lib/zipUtils';
import { streamGenerateScript } from '@/lib/streamApi';
import { toast } from 'sonner';

const TextToScript = () => {
  const [framework, setFramework] = useState<Framework>('esx');
  const [mysqlType, setMysqlType] = useState<MySQLType>('mysql-async');
  const [libType, setLibType] = useState<LibType>('default');
  const [scriptName, setScriptName] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef(false);

  const handleGenerate = async () => {
    if (!scriptName.trim()) {
      toast.error('Digite um nome para o script');
      return;
    }
    if (!description.trim()) {
      toast.error('Digite uma descrição do script');
      return;
    }

    setIsProcessing(true);
    setStreamingText('');
    setGeneratedFiles([]);
    setIsComplete(false);
    abortRef.current = false;

    const seenPaths = new Set<string>();

    await streamGenerateScript({
      mode: 'text',
      framework,
      scriptName,
      mysqlType,
      libType,
      description,
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

  return (
    <div className="space-y-6">
      {/* Description Input */}
      <div className="space-y-6 p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3 text-terminal-cyan">
          <FileText className="w-5 h-5" />
          <span className="font-mono font-medium">Descreva o script que deseja criar</span>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Nome do Script
          </label>
          <Input
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            placeholder="ex: meu-sistema-jobs"
            className="font-mono bg-secondary/50 border-border focus:border-primary"
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Descrição Detalhada
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva todas as funcionalidades que o script deve ter. Seja específico! Ex: Sistema de garagem com comando /garage para abrir, salvar veículos no banco de dados, listar veículos do jogador..."
            className="min-h-[150px] font-mono bg-secondary/50 border-border focus:border-primary resize-none"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            💡 NUI só será adicionado se você mencionar explicitamente (ex: "menu NUI", "interface visual")
          </p>
        </div>

        <FrameworkSelector value={framework} onChange={setFramework} />

        <PreferencesSelector
          mysqlType={mysqlType}
          libType={libType}
          onMySQLChange={setMysqlType}
          onLibChange={setLibType}
        />

        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isProcessing || !scriptName.trim() || !description.trim()}
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
          
          {isProcessing && (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="h-12 px-6 font-mono"
            >
              <Square className="w-4 h-4 mr-2" />
              Parar
            </Button>
          )}
        </div>
      </div>

      {/* Streaming Output */}
      {(isProcessing || streamingText) && (
        <StreamingOutput 
          text={streamingText} 
          isGenerating={isProcessing} 
        />
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

export default TextToScript;
