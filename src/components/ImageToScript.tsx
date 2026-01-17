import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Upload, X, Play, Square, ImageIcon, Download } from 'lucide-react';
import FrameworkSelector, { Framework } from './FrameworkSelector';
import PreferencesSelector, { type MySQLType, type LibType } from './PreferencesSelector';
import StreamingOutput from './StreamingOutput';
import CodeBlock from './CodeBlock';
import { streamGenerateScript, ScriptFile } from '@/lib/streamApi';
import JSZip from 'jszip';
import { toast } from 'sonner';

const ImageToScript = () => {
  const [images, setImages] = useState<{ file: File; preview: string; base64: string }[]>([]);
  const [scriptName, setScriptName] = useState('');
  const [framework, setFramework] = useState<Framework>('esx');
  const [mysqlType, setMysqlType] = useState<MySQLType>('mysql-async');
  const [libType, setLibType] = useState<LibType>('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);
  const abortRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    const newImages = await Promise.all(
      imageFiles.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        return { file, preview, base64 };
      })
    );
    
    setImages(prev => [...prev, ...newImages]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0 || !scriptName.trim()) {
      toast.error('Adicione pelo menos uma imagem e um nome para o script');
      return;
    }

    setIsGenerating(true);
    setStreamingText('');
    setGeneratedFiles([]);

    try {
      const { abort } = await streamGenerateScript({
        mode: 'image',
        framework,
        scriptName,
        mysqlType,
        libType,
        images: images.map(img => img.base64),
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

          <PreferencesSelector
            mysqlType={mysqlType}
            libType={libType}
            onMySQLChange={setMysqlType}
            onLibChange={setLibType}
          />

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Imagens do Script (screenshots, UI, documentação)
            </label>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-all"
            >
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-1">
                Clique ou arraste imagens aqui
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP - múltiplas imagens suportadas
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={images.length === 0 || !scriptName.trim()}
                className="flex-1 font-mono"
              >
                <Play className="w-4 h-4 mr-2" />
                Analisar Imagens e Gerar Script
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

export default ImageToScript;
