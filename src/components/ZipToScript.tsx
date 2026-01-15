import { useState, useCallback } from 'react';
import { Upload, FileArchive, Loader2, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CodeBlock from './CodeBlock';
import FrameworkSelector, { type Framework } from './FrameworkSelector';
import { parseZipFile, downloadZip, type ScriptFile } from '@/lib/zipUtils';
import { toast } from 'sonner';

const ZipToScript = () => {
  const [framework, setFramework] = useState<Framework>('esx');
  const [scriptName, setScriptName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ScriptFile[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
    
    // Simulate generation with demo files
    await new Promise(resolve => setTimeout(resolve, 1500));

    const demoFiles: ScriptFile[] = [
      {
        name: 'fxmanifest.lua',
        path: 'fxmanifest.lua',
        type: 'lua',
        content: `fx_version 'cerulean'
game 'gta5'

author 'FiveM Script Generator'
description '${scriptName} - Generated Script'
version '1.0.0'

shared_scripts {
    'config.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

lua54 'yes'`,
      },
      {
        name: 'config.lua',
        path: 'config.lua',
        type: 'lua',
        content: `Config = {}

-- Framework: ${framework.toUpperCase()}
Config.Framework = '${framework}'

-- Debug mode
Config.Debug = false

-- Main settings
Config.Settings = {
    enabled = true,
    cooldown = 5000,
}`,
      },
      {
        name: 'client/main.lua',
        path: 'client/main.lua',
        type: 'lua',
        content: `-- ${scriptName} Client Script
-- Framework: ${framework.toUpperCase()}

local ${framework === 'esx' ? 'ESX' : framework === 'qbcore' ? 'QBCore' : 'Framework'} = nil

${framework === 'esx' ? `
-- Initialize ESX
Citizen.CreateThread(function()
    while ESX == nil do
        TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
        Citizen.Wait(0)
    end
end)` : framework === 'qbcore' ? `
-- Initialize QBCore
QBCore = exports['qb-core']:GetCoreObject()` : `
-- Standalone - No framework initialization needed`}

-- Main thread
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        
        if Config.Settings.enabled then
            -- Main logic here
        end
    end
end)

-- Event handlers
RegisterNetEvent('${scriptName}:client:notify')
AddEventHandler('${scriptName}:client:notify', function(message)
    ${framework === 'esx' ? `ESX.ShowNotification(message)` : 
      framework === 'qbcore' ? `QBCore.Functions.Notify(message, 'success')` : 
      `print('[${scriptName}] ' .. message)`}
end)`,
      },
      {
        name: 'server/main.lua',
        path: 'server/main.lua',
        type: 'lua',
        content: `-- ${scriptName} Server Script
-- Framework: ${framework.toUpperCase()}

local ${framework === 'esx' ? 'ESX' : framework === 'qbcore' ? 'QBCore' : 'Framework'} = nil

${framework === 'esx' ? `
-- Initialize ESX
ESX = exports['es_extended']:getSharedObject()` : framework === 'qbcore' ? `
-- Initialize QBCore
QBCore = exports['qb-core']:GetCoreObject()` : `
-- Standalone - No framework initialization needed`}

-- Server callbacks
${framework === 'esx' ? `
ESX.RegisterServerCallback('${scriptName}:getData', function(source, cb)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer then
        cb({ success = true })
    else
        cb({ success = false })
    end
end)` : framework === 'qbcore' ? `
QBCore.Functions.CreateCallback('${scriptName}:getData', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if Player then
        cb({ success = true })
    else
        cb({ success = false })
    end
end)` : `
-- Standalone callback system
RegisterNetEvent('${scriptName}:server:getData')
AddEventHandler('${scriptName}:server:getData', function()
    local source = source
    TriggerClientEvent('${scriptName}:client:receiveData', source, { success = true })
end)`}

-- Commands
RegisterCommand('${scriptName}', function(source, args, rawCommand)
    if source > 0 then
        TriggerClientEvent('${scriptName}:client:notify', source, 'Command executed!')
    end
end, false)

print('[${scriptName}] Script loaded successfully!')`,
      },
    ];

    setGeneratedFiles(demoFiles);
    setIsProcessing(false);
    toast.success('Script gerado com sucesso!');
  };

  const handleDownload = async () => {
    if (generatedFiles.length === 0) return;
    await downloadZip(generatedFiles, scriptName);
    toast.success('Download iniciado!');
  };

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
          {isProcessing ? (
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
      {uploadedFiles.length > 0 && (
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
            />
          </div>

          <FrameworkSelector value={framework} onChange={setFramework} />

          <Button
            onClick={handleGenerate}
            disabled={isProcessing || !scriptName.trim()}
            className="w-full h-12 font-mono text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
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
      )}

      {/* Generated Files */}
      {generatedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground font-mono">
              Ficheiros Gerados
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
