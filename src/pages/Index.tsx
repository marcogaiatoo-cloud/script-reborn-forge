import { FileArchive, FileText, Terminal, Code2, Image, ShoppingCart, Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ZipToScript from '@/components/ZipToScript';
import TextToScript from '@/components/TextToScript';
import ImageToScript from '@/components/ImageToScript';
import TebexToScript from '@/components/TebexToScript';
import VideoToScript from '@/components/VideoToScript';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Background Glow */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />
      
      {/* Header */}
      <header className="relative border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Terminal className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
                FiveM Script Generator
                <Code2 className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-sm text-muted-foreground">
                Gere scripts profissionais para FiveM de forma rápida e eficiente
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="zip" className="space-y-6">
          <TabsList variant="terminal" className="w-full flex-wrap h-auto gap-2">
            <TabsTrigger value="zip" variant="terminal" className="flex items-center gap-2">
              <FileArchive className="w-4 h-4" />
              <span>.zip → script</span>
            </TabsTrigger>
            <TabsTrigger value="text" variant="terminal" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>text → script</span>
            </TabsTrigger>
            <TabsTrigger value="image" variant="terminal" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span>image → script</span>
            </TabsTrigger>
            <TabsTrigger value="tebex" variant="terminal" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>tebex → script</span>
            </TabsTrigger>
            <TabsTrigger value="video" variant="terminal" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span>video → script</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zip">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h2 className="font-mono font-semibold text-foreground mb-2">
                  Modo: ZIP → Script
                </h2>
                <p className="text-sm text-muted-foreground">
                  Carregue um arquivo .zip de referência. O sistema irá analisar os ficheiros 
                  e recriar um script funcionalmente idêntico com código novo e limpo.
                </p>
              </div>
              <ZipToScript />
            </div>
          </TabsContent>

          <TabsContent value="text">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h2 className="font-mono font-semibold text-foreground mb-2">
                  Modo: Text → Script
                </h2>
                <p className="text-sm text-muted-foreground">
                  Descreva em texto o script que deseja criar. Seja específico sobre 
                  funcionalidades, comandos, eventos e dependências necessárias.
                </p>
              </div>
              <TextToScript />
            </div>
          </TabsContent>

          <TabsContent value="image">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h2 className="font-mono font-semibold text-foreground mb-2">
                  Modo: Image → Script
                </h2>
                <p className="text-sm text-muted-foreground">
                  Envie screenshots ou imagens do script em funcionamento. A IA irá analisar 
                  visualmente e recriar as funcionalidades mostradas nas imagens.
                </p>
              </div>
              <ImageToScript />
            </div>
          </TabsContent>

          <TabsContent value="tebex">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h2 className="font-mono font-semibold text-foreground mb-2">
                  Modo: Tebex → Script
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cole o link de uma loja Tebex ou CFX.re. O sistema irá analisar a página 
                  e criar um script com funcionalidades similares às descritas.
                </p>
              </div>
              <TebexToScript />
            </div>
          </TabsContent>

          <TabsContent value="video">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h2 className="font-mono font-semibold text-foreground mb-2">
                  Modo: Video → Script
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cole o link de um vídeo (YouTube, etc.) mostrando o script. A IA irá entender 
                  o funcionamento baseado no contexto do vídeo e criar o script correspondente.
                </p>
              </div>
              <VideoToScript />
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border">
          <h3 className="font-mono font-semibold text-foreground mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            Características
          </h3>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Código limpo, otimizado e sem bugs
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Suporte a ESX, QBCore e Standalone
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Download individual ou .zip completo
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Validação e segurança server-side
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Análise de imagens e vídeos com IA
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Recriação a partir de lojas Tebex
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Index;
