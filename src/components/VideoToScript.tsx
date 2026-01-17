import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, Video, Download, Youtube } from 'lucide-react';
import FrameworkSelector, { Framework } from './FrameworkSelector';
import PreferencesSelector, { type MySQLType, type LibType } from './PreferencesSelector';
import StreamingOutput from './StreamingOutput';
import CodeBlock from './CodeBlock';
import { streamGenerateScript, ScriptFile } from '@/lib/streamApi';
import JSZip from 'jszip';
import { toast } from 'sonner';

const VideoToScript = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [framework, setFramework] = useState<Framework>('esx');
  const [mysqlType, setMysqlType] = useState<MySQLType>('mysql-async');
  const [libType, setLibType] = useState<LibType>('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);
  const abortRef = useRef<(() => void) | null>(null);

  const isValidVideoUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('youtube.com') || 
             parsed.hostname.includes('youtu.be') ||
             parsed.hostname.includes('twitch.tv') ||
             parsed.hostname.includes('streamable.com') ||
             parsed.hostname.includes('vimeo.com');
    } catch {
      return false;
    }
  };

  const extractVideoId = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        return parsed.searchParams.get('v');
      }
      if (parsed.hostname.includes('youtu.be')) {
        return parsed.pathname.slice(1);
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!videoUrl.trim() || !scriptName.trim()) {
      toast.error('Adicione o link do vídeo e um nome para o script');
      return;
    }

    if (!isValidVideoUrl(videoUrl)) {
      toast.error('Por favor, insira um link válido do YouTube, Twitch ou outra plataforma de vídeo');
      return;
    }

    setIsGenerating(true);
    setStreamingText('');
    setGeneratedFiles([]);

    try {
      const { abort } = await streamGenerateScript({
        mode: 'video',
        framework,
        scriptName,
        mysqlType,
        libType,
        videoUrl,
        additionalContext,
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

  const videoId = extractVideoId(videoUrl);

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

          <PreferencesSelector
            mysqlType={mysqlType}
            libType={libType}
            onMySQLChange={setMysqlType}
            onLibChange={setLibType}
          />

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Link do Vídeo (YouTube, Twitch, etc.)
            </label>
            
            <div className="relative">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="font-mono bg-secondary/50 border-border pl-10"
              />
            </div>

            {videoId && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt="Video thumbnail"
                  className="w-full h-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                />
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Cole o link do vídeo mostrando o script em funcionamento. 
              O sistema irá analisar o vídeo para entender as funcionalidades.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Contexto Adicional (opcional)
            </label>
            <Textarea
              placeholder="Descreva detalhes adicionais que você observou no vídeo, como comandos usados, menus, animações, etc..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[80px] font-mono bg-secondary/50 border-border resize-none"
            />
          </div>

          <div className="flex gap-3">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={!videoUrl.trim() || !scriptName.trim()}
                className="flex-1 font-mono"
              >
                <Video className="w-4 h-4 mr-2" />
                Analisar Vídeo e Gerar Script
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

export default VideoToScript;
