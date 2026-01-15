import { useState } from 'react';
import { Sparkles, Loader2, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import CodeBlock from './CodeBlock';
import FrameworkSelector, { type Framework } from './FrameworkSelector';
import { downloadZip, type ScriptFile } from '@/lib/zipUtils';
import { toast } from 'sonner';

const TextToScript = () => {
  const [framework, setFramework] = useState<Framework>('esx');
  const [scriptName, setScriptName] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<ScriptFile[]>([]);

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
    
    // Simulate generation with demo files based on description
    await new Promise(resolve => setTimeout(resolve, 2000));

    const hasNUI = description.toLowerCase().includes('nui') || 
                   description.toLowerCase().includes('menu') ||
                   description.toLowerCase().includes('interface');
    
    const hasDatabase = description.toLowerCase().includes('database') || 
                        description.toLowerCase().includes('sql') ||
                        description.toLowerCase().includes('salvar');

    const demoFiles: ScriptFile[] = [
      {
        name: 'fxmanifest.lua',
        path: 'fxmanifest.lua',
        type: 'lua',
        content: `fx_version 'cerulean'
game 'gta5'

author 'FiveM Script Generator'
description '${scriptName} - ${description.slice(0, 50)}...'
version '1.0.0'

shared_scripts {
    'config.lua'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    ${hasDatabase ? `'@oxmysql/lib/MySQL.lua',\n    ` : ''}'server/main.lua'
}

${hasNUI ? `ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}

` : ''}lua54 'yes'`,
      },
      {
        name: 'config.lua',
        path: 'config.lua',
        type: 'lua',
        content: `Config = {}

-- Framework Configuration
-- Options: 'esx', 'qbcore', 'standalone'
Config.Framework = '${framework}'

-- Debug Mode
Config.Debug = false

-- Script Settings
Config.Settings = {
    -- Enable/disable the script
    enabled = true,
    
    -- Cooldown between actions (ms)
    cooldown = 5000,
    
    -- Permissions
    requiredJob = nil, -- Set to job name or nil for everyone
}

-- Locales
Config.Locale = {
    success = 'Ação realizada com sucesso!',
    error = 'Ocorreu um erro.',
    noPermission = 'Você não tem permissão.',
}`,
      },
      {
        name: 'client/main.lua',
        path: 'client/main.lua',
        type: 'lua',
        content: `-- ${scriptName} - Client Script
-- Description: ${description.slice(0, 100)}
-- Framework: ${framework.toUpperCase()}

${framework === 'esx' ? `local ESX = exports['es_extended']:getSharedObject()` : 
  framework === 'qbcore' ? `local QBCore = exports['qb-core']:GetCoreObject()` : 
  `-- Standalone mode - No framework required`}

local isOpen = false

-- Utility Functions
local function Notify(message, type)
    ${framework === 'esx' ? `ESX.ShowNotification(message)` : 
      framework === 'qbcore' ? `QBCore.Functions.Notify(message, type or 'primary')` : 
      `SetNotificationTextEntry('STRING')
    AddTextComponentString(message)
    DrawNotification(false, true)`}
end

local function HasPermission()
    if not Config.Settings.requiredJob then
        return true
    end
    
    ${framework === 'esx' ? `local playerData = ESX.GetPlayerData()
    return playerData.job and playerData.job.name == Config.Settings.requiredJob` : 
      framework === 'qbcore' ? `local PlayerData = QBCore.Functions.GetPlayerData()
    return PlayerData.job and PlayerData.job.name == Config.Settings.requiredJob` : 
      `return true -- Standalone - no job check`}
end

${hasNUI ? `
-- NUI Callbacks
RegisterNUICallback('close', function(data, cb)
    SetNuiFocus(false, false)
    isOpen = false
    cb('ok')
end)

RegisterNUICallback('action', function(data, cb)
    TriggerServerEvent('${scriptName}:server:action', data)
    cb('ok')
end)

-- Open Menu
local function OpenMenu()
    if isOpen then return end
    isOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        data = {}
    })
end

RegisterNetEvent('${scriptName}:client:openMenu')
AddEventHandler('${scriptName}:client:openMenu', function()
    OpenMenu()
end)
` : ''}

-- Main Command
RegisterCommand('${scriptName}', function()
    if not HasPermission() then
        Notify(Config.Locale.noPermission, 'error')
        return
    end
    
    ${hasNUI ? 'OpenMenu()' : `TriggerServerEvent('${scriptName}:server:action', {})`}
end, false)

-- Key Mapping (optional)
RegisterKeyMapping('${scriptName}', 'Open ${scriptName}', 'keyboard', 'F5')

-- Cleanup on resource stop
AddEventHandler('onResourceStop', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    ${hasNUI ? `SetNuiFocus(false, false)` : '-- Cleanup if needed'}
end)

print('[${scriptName}] Client script loaded!')`,
      },
      {
        name: 'server/main.lua',
        path: 'server/main.lua',
        type: 'lua',
        content: `-- ${scriptName} - Server Script
-- Description: ${description.slice(0, 100)}
-- Framework: ${framework.toUpperCase()}

${framework === 'esx' ? `local ESX = exports['es_extended']:getSharedObject()` : 
  framework === 'qbcore' ? `local QBCore = exports['qb-core']:GetCoreObject()` : 
  `-- Standalone mode - No framework required`}

-- Utility Functions
local function GetPlayerIdentifier(source)
    ${framework === 'esx' ? `local xPlayer = ESX.GetPlayerFromId(source)
    return xPlayer and xPlayer.getIdentifier() or nil` : 
      framework === 'qbcore' ? `local Player = QBCore.Functions.GetPlayer(source)
    return Player and Player.PlayerData.citizenid or nil` : 
      `for _, id in ipairs(GetPlayerIdentifiers(source)) do
        if string.sub(id, 1, 5) == 'steam' then
            return id
        end
    end
    return nil`}
end

${hasDatabase ? `
-- Database Functions
local function GetPlayerData(identifier)
    local result = MySQL.query.await('SELECT * FROM ${scriptName}_data WHERE identifier = ?', { identifier })
    return result and result[1] or nil
end

local function SavePlayerData(identifier, data)
    MySQL.insert('INSERT INTO ${scriptName}_data (identifier, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?', 
        { identifier, json.encode(data), json.encode(data) })
end
` : ''}

-- Server Events
RegisterNetEvent('${scriptName}:server:action')
AddEventHandler('${scriptName}:server:action', function(data)
    local source = source
    local identifier = GetPlayerIdentifier(source)
    
    if not identifier then
        TriggerClientEvent('${scriptName}:client:notify', source, Config.Locale.error)
        return
    end
    
    -- Process action here
    if Config.Debug then
        print(('[${scriptName}] Action from %s: %s'):format(identifier, json.encode(data)))
    end
    
    ${hasDatabase ? `-- Save to database
    SavePlayerData(identifier, data)` : '-- Process data'}
    
    TriggerClientEvent('${scriptName}:client:notify', source, Config.Locale.success)
end)

-- Callbacks
${framework === 'esx' ? `ESX.RegisterServerCallback('${scriptName}:getData', function(source, cb)
    local identifier = GetPlayerIdentifier(source)
    ${hasDatabase ? `local data = GetPlayerData(identifier)
    cb(data or {})` : `cb({ success = true })`}
end)` : framework === 'qbcore' ? `QBCore.Functions.CreateCallback('${scriptName}:getData', function(source, cb)
    local identifier = GetPlayerIdentifier(source)
    ${hasDatabase ? `local data = GetPlayerData(identifier)
    cb(data or {})` : `cb({ success = true })`}
end)` : `-- Standalone callback
RegisterNetEvent('${scriptName}:server:getData')
AddEventHandler('${scriptName}:server:getData', function()
    local source = source
    local identifier = GetPlayerIdentifier(source)
    ${hasDatabase ? `local data = GetPlayerData(identifier)
    TriggerClientEvent('${scriptName}:client:receiveData', source, data or {})` : 
    `TriggerClientEvent('${scriptName}:client:receiveData', source, { success = true })`}
end)`}

print('[${scriptName}] Server script loaded successfully!')`,
      },
    ];

    // Add NUI files if needed
    if (hasNUI) {
      demoFiles.push({
        name: 'html/index.html',
        path: 'html/index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${scriptName}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app" class="hidden">
        <div class="container">
            <div class="header">
                <h1>${scriptName}</h1>
                <button id="closeBtn" class="close-btn">&times;</button>
            </div>
            <div class="content">
                <p>Interface do script</p>
                <button id="actionBtn" class="action-btn">Executar Ação</button>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
      });

      demoFiles.push({
        name: 'html/style.css',
        path: 'html/style.css',
        type: 'css',
        content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: transparent;
}

.hidden {
    display: none !important;
}

#app {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.5);
}

.container {
    background: #1a1a2e;
    border-radius: 12px;
    width: 400px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
}

.header h1 {
    color: #e94560;
    font-size: 18px;
}

.close-btn {
    background: none;
    border: none;
    color: #fff;
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s;
}

.close-btn:hover {
    color: #e94560;
}

.content {
    padding: 20px;
    color: #fff;
}

.action-btn {
    width: 100%;
    padding: 12px;
    margin-top: 16px;
    background: #e94560;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.action-btn:hover {
    background: #ff6b8a;
}`,
      });

      demoFiles.push({
        name: 'html/script.js',
        path: 'html/script.js',
        type: 'js',
        content: `const app = document.getElementById('app');
const closeBtn = document.getElementById('closeBtn');
const actionBtn = document.getElementById('actionBtn');

// Listen for NUI messages
window.addEventListener('message', (event) => {
    const data = event.data;
    
    if (data.action === 'open') {
        app.classList.remove('hidden');
    } else if (data.action === 'close') {
        app.classList.add('hidden');
    }
});

// Close button
closeBtn.addEventListener('click', () => {
    app.classList.add('hidden');
    fetch('https://${scriptName}/close', {
        method: 'POST',
        body: JSON.stringify({})
    });
});

// Action button
actionBtn.addEventListener('click', () => {
    fetch('https://${scriptName}/action', {
        method: 'POST',
        body: JSON.stringify({ type: 'action' })
    });
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        app.classList.add('hidden');
        fetch('https://${scriptName}/close', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }
});`,
      });
    }

    // Add SQL file if database is needed
    if (hasDatabase) {
      demoFiles.push({
        name: 'sql/install.sql',
        path: 'sql/install.sql',
        type: 'sql',
        content: `-- ${scriptName} Database Schema
-- Run this SQL before starting the resource

CREATE TABLE IF NOT EXISTS \`${scriptName}_data\` (
    \`id\` INT(11) NOT NULL AUTO_INCREMENT,
    \`identifier\` VARCHAR(60) NOT NULL,
    \`data\` LONGTEXT DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`identifier\` (\`identifier\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
      });
    }

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
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Descrição Detalhada
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva todas as funcionalidades que o script deve ter. Ex: Sistema de empregos com menu NUI, salvar dados no banco de dados, comando /trabalho para abrir menu..."
            className="min-h-[150px] font-mono bg-secondary/50 border-border focus:border-primary resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Seja específico sobre funcionalidades, NUI, database, comandos, eventos, etc.
          </p>
        </div>

        <FrameworkSelector value={framework} onChange={setFramework} />

        <Button
          onClick={handleGenerate}
          disabled={isProcessing || !scriptName.trim() || !description.trim()}
          className="w-full h-12 font-mono text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Gerando Script...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Gerar Script
            </>
          )}
        </Button>
      </div>

      {/* Generated Files */}
      {generatedFiles.length > 0 && (
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
