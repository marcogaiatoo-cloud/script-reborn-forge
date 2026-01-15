import { FileArchive, FileText, Terminal, Code2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ZipToScript from '@/components/ZipToScript';
import TextToScript from '@/components/TextToScript';

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
          <TabsList variant="terminal" className="w-full sm:w-auto">
            <TabsTrigger value="zip" variant="terminal" className="flex items-center gap-2">
              <FileArchive className="w-4 h-4" />
              <span>.zip → script</span>
            </TabsTrigger>
            <TabsTrigger value="text" variant="terminal" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>text → script</span>
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
              Estrutura de pastas profissional
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              NUI e Database quando necessário
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Index;
