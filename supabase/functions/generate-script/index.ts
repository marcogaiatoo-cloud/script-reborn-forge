import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "zip" | "text" | "image" | "tebex" | "video";
type Framework = "esx" | "qbcore" | "standalone";
type MySQLType = "mysql-async" | "oxmysql";
type LibType = "default" | "ox_lib";

function normalizeMode(input: unknown): Mode {
  const v = String(input ?? "").toLowerCase();
  if (v === "zip" || v === "text" || v === "image" || v === "tebex" || v === "video") return v;
  return "text";
}

function normalizeFramework(input: unknown): Framework {
  const v = String(input ?? "").toLowerCase();
  if (v === "esx" || v === "qbcore" || v === "standalone") return v;
  return "standalone";
}

function normalizeMySQLType(input: unknown): MySQLType {
  const v = String(input ?? "").toLowerCase();
  if (v === "mysql-async" || v === "oxmysql") return v;
  return "mysql-async";
}

function normalizeLibType(input: unknown): LibType {
  const v = String(input ?? "").toLowerCase();
  if (v === "default" || v === "ox_lib") return v;
  return "default";
}

function sanitizeScriptName(input: unknown): string {
  const raw = String(input ?? "").trim();
  const base = raw || "my-script";
  return base
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 48) || "my-script";
}

function chunkString(str: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
  return out;
}

function guessNeedsDatabase(args: { description?: string; referenceFiles?: Array<{ path: string; content: string }> }): boolean {
  const d = (args.description ?? "").toLowerCase();
  if (/\b(mysql|sql|database|db|persist|save|guardar|registar|registro|armazenar)\b/.test(d)) return true;

  for (const f of args.referenceFiles ?? []) {
    const p = (f.path ?? "").toLowerCase();
    const c = (f.content ?? "").toLowerCase();
    if (p.endsWith(".sql")) return true;
    if (c.includes("mysql.") || c.includes("oxmysql") || c.includes("mysql-async")) return true;
  }

  return false;
}

function buildFxmanifest(args: {
  scriptName: string;
  framework: Framework;
  mysqlType: MySQLType;
  libType: LibType;
  needsDb: boolean;
}): string {
  const shared: string[] = [];
  if (args.libType === "ox_lib") shared.push("@ox_lib/init.lua");
  shared.push("config.lua");

  const server: string[] = [];
  if (args.needsDb) {
    if (args.mysqlType === "mysql-async") server.push("@mysql-async/lib/MySQL.lua");
    else server.push("@oxmysql/lib/MySQL.lua");
  }
  server.push("server/main.lua");

  const lines: string[] = [
    "-- Resource manifest for " + args.scriptName,
    "fx_version 'cerulean'",
    "game 'gta5'",
    "",
    `name '${args.scriptName}'`,
    `description 'Generated template (${args.framework}, ${args.libType}${args.needsDb ? ", " + args.mysqlType : ""})'`,
    "author 'Script Generator'",
    "version '1.0.0'",
    "",
    "shared_scripts {",
    ...shared.map((s) => `  '${s}',`),
    "}",
    "",
    "client_scripts {",
    "  'client/main.lua',",
    "}",
    "",
    "server_scripts {",
    ...server.map((s) => `  '${s}',`),
    "}",
  ];

  return lines.join("\n") + "\n";
}

function buildConfigLua(args: { scriptName: string }): string {
  return [
    "-- Configuração do recurso",
    "Config = Config or {}",
    "",
    `Config.Command = '${args.scriptName}' -- /${args.scriptName}`,
    "Config.Debug = false",
    "",
  ].join("\n");
}

function buildClientMainLua(args: { scriptName: string; framework: Framework; libType: LibType }): string {
  const lines: string[] = [];

  lines.push("-- Cliente: comandos e notificações");
  lines.push("local RESOURCE = GetCurrentResourceName()\n");

  if (args.framework === "esx") {
    lines.push("local ESX = exports['es_extended']:getSharedObject()\n");
  } else if (args.framework === "qbcore") {
    lines.push("local QBCore = exports['qb-core']:GetCoreObject()\n");
  }

  lines.push("local function notify(msg, nType)");
  if (args.libType === "ox_lib") {
    lines.push("  lib.notify({ title = RESOURCE, description = msg, type = nType or 'inform' })");
  } else if (args.framework === "esx") {
    lines.push("  ESX.ShowNotification(msg)");
  } else if (args.framework === "qbcore") {
    lines.push("  QBCore.Functions.Notify(msg, nType or 'primary')");
  } else {
    lines.push("  BeginTextCommandThefeedPost('STRING')");
    lines.push("  AddTextComponentSubstringPlayerName(msg)");
    lines.push("  EndTextCommandThefeedPostTicker(false, false)");
  }
  lines.push("end\n");

  lines.push("RegisterCommand(Config.Command, function()");
  lines.push("  TriggerServerEvent(RESOURCE .. ':ping')");
  lines.push("end, false)\n");

  lines.push("RegisterNetEvent(RESOURCE .. ':pong', function(serverTime)");
  lines.push("  notify(('Gerado com sucesso! Hora do servidor: %s'):format(serverTime or '?'), 'success')");
  lines.push("end)\n");

  lines.push("CreateThread(function()" );
  lines.push("  Wait(1000)");
  lines.push("  notify(('Recurso %s iniciado. Usa /%s'):format(RESOURCE, Config.Command), 'inform')");
  lines.push("end)");

  return lines.join("\n") + "\n";
}

function buildServerMainLua(args: { scriptName: string; framework: Framework; needsDb: boolean; mysqlType: MySQLType }): string {
  const lines: string[] = [];
  lines.push("-- Servidor: validações e eventos");
  lines.push("local RESOURCE = GetCurrentResourceName()\n");

  if (args.framework === "esx") {
    lines.push("local ESX = exports['es_extended']:getSharedObject()\n");
  } else if (args.framework === "qbcore") {
    lines.push("local QBCore = exports['qb-core']:GetCoreObject()\n");
  }

  if (args.needsDb) {
    lines.push("-- Nota: Este template inclui base para DB (apenas se tiveres a lib instalada).\n");
    lines.push("local function dbReady()" );
    if (args.mysqlType === "mysql-async") {
      lines.push("  return MySQL ~= nil and MySQL.Async ~= nil");
    } else {
      lines.push("  return MySQL ~= nil and (MySQL.query ~= nil or exports.oxmysql ~= nil)");
    }
    lines.push("end\n");
  }

  lines.push("RegisterNetEvent(RESOURCE .. ':ping', function()" );
  lines.push("  local src = source" );
  lines.push("  if type(src) ~= 'number' or src <= 0 then return end" );
  lines.push("  local now = os.date('%Y-%m-%d %H:%M:%S')" );
  lines.push("  TriggerClientEvent(RESOURCE .. ':pong', src, now)" );
  lines.push("end)");

  return lines.join("\n") + "\n";
}

function buildSqlInstall(args: { scriptName: string }): string {
  const table = (args.scriptName || "my_script").replace(/[^a-z0-9_]/gi, "_");
  return [
    "-- SQL opcional (apenas se precisares de persistência)",
    `CREATE TABLE IF NOT EXISTS \`${table}_data\` (`,
    "  id INT NOT NULL AUTO_INCREMENT,",
    "  identifier VARCHAR(64) NOT NULL,",
    "  value TEXT NULL,",
    "  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,",
    "  PRIMARY KEY (id),",
    "  KEY idx_identifier (identifier)",
    ");",
    "",
  ].join("\n");
}

function generateBundle(args: {
  mode: Mode;
  framework: Framework;
  scriptName: string;
  mysqlType: MySQLType;
  libType: LibType;
  description?: string;
  referenceFiles?: Array<{ path: string; content: string }>;
  tebexUrl?: string;
  videoUrl?: string;
  images?: string[];
  additionalContext?: string;
}): string {
  const needsDb = guessNeedsDatabase({ description: args.description, referenceFiles: args.referenceFiles });

  const readmeParts: string[] = [];
  readmeParts.push(`# ${args.scriptName}`);
  readmeParts.push("\nTemplate gerado automaticamente (sem dependência de serviços pagos).\n");
  readmeParts.push(`- Framework: **${args.framework}**`);
  readmeParts.push(`- Lib: **${args.libType}**`);
  readmeParts.push(`- DB: **${needsDb ? args.mysqlType : "não"}**`);
  readmeParts.push(`- Modo: **${args.mode}**\n`);
  if (args.description) readmeParts.push("## Descrição\n" + args.description + "\n");
  if (args.tebexUrl) readmeParts.push("## Tebex URL\n" + args.tebexUrl + "\n");
  if (args.videoUrl) readmeParts.push("## Vídeo URL\n" + args.videoUrl + "\n");
  if (args.additionalContext) readmeParts.push("## Contexto adicional\n" + args.additionalContext + "\n");
  if ((args.referenceFiles ?? []).length) {
    readmeParts.push("## Ficheiros de referência recebidos\n" + (args.referenceFiles ?? []).map((f) => `- ${f.path}`).join("\n") + "\n");
  }
  if ((args.images ?? []).length) {
    readmeParts.push(`## Imagens recebidas\n- Total: ${(args.images ?? []).length}\n`);
  }
  readmeParts.push("## Como usar\n1) Coloca a pasta no teu servidor (resources)\n2) Adiciona ao server.cfg: `ensure " + args.scriptName + "`\n3) No jogo, usa: `" + "/" + args.scriptName + "`\n");

  const files: Array<{ path: string; content: string }> = [
    { path: "fxmanifest.lua", content: buildFxmanifest({ scriptName: args.scriptName, framework: args.framework, mysqlType: args.mysqlType, libType: args.libType, needsDb }) },
    { path: "config.lua", content: buildConfigLua({ scriptName: args.scriptName }) + "\n" },
    { path: "client/main.lua", content: buildClientMainLua({ scriptName: args.scriptName, framework: args.framework, libType: args.libType }) },
    { path: "server/main.lua", content: buildServerMainLua({ scriptName: args.scriptName, framework: args.framework, needsDb, mysqlType: args.mysqlType }) },
    { path: "README.md", content: readmeParts.join("\n") + "\n" },
  ];

  if (needsDb) files.push({ path: "sql/install.sql", content: buildSqlInstall({ scriptName: args.scriptName }) + "\n" });

  // NOTE: The frontend parses files using these markers.
  return files
    .map((f) => `### FILE: ${f.path}\n${f.content}\n### END FILE\n`)
    .join("\n");
}

function buildSseStream(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = chunkString(content, 700);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        const payload = { choices: [{ delta: { content: chunk } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Este endpoint responde SEMPRE com um stream SSE de ficheiros gerados,
  // sem depender de serviços externos/pagos e sem lógica de pagamento.
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const mode = normalizeMode(body.mode);
    const framework = normalizeFramework(body.framework);
    const scriptName = sanitizeScriptName(body.scriptName);
    const mysqlType = normalizeMySQLType(body.mysqlType);
    const libType = normalizeLibType(body.libType);

    const bundle = generateBundle({
      mode,
      framework,
      scriptName,
      mysqlType,
      libType,
      description: typeof body.description === "string" ? body.description : undefined,
      referenceFiles: Array.isArray(body.referenceFiles) ? body.referenceFiles : undefined,
      images: Array.isArray(body.images) ? body.images : undefined,
      tebexUrl: typeof body.tebexUrl === "string" ? body.tebexUrl : undefined,
      videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : undefined,
      additionalContext: typeof body.additionalContext === "string" ? body.additionalContext : undefined,
    });

    return new Response(buildSseStream(bundle), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("generate-script error:", error);

    // Fallback: nunca falhar — devolve um bundle mínimo.
    const fallback = generateBundle({
      mode: "text",
      framework: "standalone",
      scriptName: "my-script",
      mysqlType: "mysql-async",
      libType: "default",
      description: "Fallback bundle gerado após erro interno.",
    });

    return new Response(buildSseStream(fallback), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }
});
