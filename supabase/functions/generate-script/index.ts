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

function buildSystemPrompt(args: {
  mode: Mode;
  framework: Framework;
  mysqlType: MySQLType;
  libType: LibType;
  scriptName: string;
}): string {
  const frameworkInstructions = {
    esx: `
- Use ESX framework patterns
- Get ESX object: local ESX = exports['es_extended']:getSharedObject()
- Use ESX.ShowNotification for notifications
- Use ESX.GetPlayerData() on client
- Use ESX.GetPlayerFromId(source) on server
- Player identifiers: xPlayer.identifier`,
    qbcore: `
- Use QBCore framework patterns
- Get QBCore: local QBCore = exports['qb-core']:GetCoreObject()
- Use QBCore.Functions.Notify for notifications
- Use QBCore.Functions.GetPlayerData() on client
- Use QBCore.Functions.GetPlayer(source) on server
- Player identifiers: Player.PlayerData.citizenid`,
    standalone: `
- No framework dependencies
- Use native FiveM functions only
- Use BeginTextCommandThefeedPost/EndTextCommandThefeedPostTicker for notifications
- Store player data using license identifier from GetPlayerIdentifiers`
  };

  const mysqlInstructions = args.mysqlType === "oxmysql" 
    ? `
- Use oxmysql for database operations
- Async: MySQL.query.await('SELECT...', {params})
- Insert: MySQL.insert.await('INSERT...', {params})
- Update: MySQL.update.await('UPDATE...', {params})
- Scalar: MySQL.scalar.await('SELECT COUNT(*)...', {params})`
    : `
- Use mysql-async for database operations
- Async: MySQL.Async.fetchAll('SELECT...', {params}, function(result) end)
- Insert: MySQL.Async.insert('INSERT...', {params}, function(id) end)
- Execute: MySQL.Async.execute('UPDATE/DELETE...', {params})`;

  const libInstructions = args.libType === "ox_lib"
    ? `
- Use ox_lib for utilities
- Add @ox_lib/init.lua to shared_scripts
- Use lib.notify for notifications: lib.notify({ title = 'Title', description = 'Msg', type = 'success' })
- Use lib.callback for client-server communication
- Use lib.requestAnimDict, lib.requestModel for streaming
- Use lib.progressBar, lib.progressCircle for progress UI
- Use lib.registerContext, lib.showContext for context menus
- Use lib.inputDialog for input forms`
    : `
- Use vanilla Lua and natives
- Create custom notification functions
- Use TriggerServerEvent/TriggerClientEvent for communication
- Use RequestAnimDict with while not HasAnimDictLoaded loops
- Build custom NUI menus if needed`;

  return `You are a SENIOR FiveM Lua developer with 10+ years of experience.
You write PRODUCTION-READY, BUG-FREE, OPTIMIZED code.

SCRIPT NAME: ${args.scriptName}
MODE: ${args.mode}
FRAMEWORK: ${args.framework}
MySQL: ${args.mysqlType}
Library: ${args.libType}

${frameworkInstructions[args.framework]}
${mysqlInstructions}
${libInstructions}

CRITICAL RULES:
1. ANALYZE the user request DEEPLY - understand EXACTLY what they want
2. Generate COMPLETE, WORKING code - no placeholders, no TODOs, no "add your code here"
3. Every file must be PRODUCTION READY and tested mentally for edge cases
4. Include proper error handling, nil checks, source validation on server
5. Use proper Lua patterns: local variables, proper scoping, efficient loops
6. NEVER generate code that could cause crashes or exploits
7. Always validate source on server events: if type(source) ~= 'number' or source <= 0 then return end
8. Use proper resource naming conventions
9. Include helpful comments in Portuguese

OUTPUT FORMAT - You MUST use this exact format for each file:

### FILE: fxmanifest.lua
<complete fxmanifest content>
### END FILE

### FILE: config.lua
<complete config content>
### END FILE

### FILE: client/main.lua
<complete client code>
### END FILE

### FILE: server/main.lua
<complete server code>
### END FILE

Add sql/install.sql if database is needed.
Add html/index.html, html/style.css, html/script.js if NUI is requested.

IMPORTANT: Generate ALL files needed for a complete, working script.
The code must work IMMEDIATELY when the user places it in their server.`;
}

function buildUserPrompt(args: {
  mode: Mode;
  description?: string;
  referenceFiles?: Array<{ path: string; content: string }>;
  images?: string[];
  tebexUrl?: string;
  videoUrl?: string;
  additionalContext?: string;
}): string {
  const parts: string[] = [];

  if (args.mode === "text" && args.description) {
    parts.push(`Create a FiveM script based on this description:\n\n${args.description}`);
  }

  if (args.mode === "zip" && args.referenceFiles?.length) {
    parts.push("Analyze and RECREATE this script with clean, optimized code:\n");
    for (const f of args.referenceFiles) {
      if (f.content.length < 15000) {
        parts.push(`--- ${f.path} ---\n${f.content}\n`);
      } else {
        parts.push(`--- ${f.path} (truncated) ---\n${f.content.slice(0, 15000)}\n[...truncated...]\n`);
      }
    }
    parts.push("\nRecreate this script maintaining ALL functionality but with BETTER code quality.");
  }

  if (args.mode === "image" && args.images?.length) {
    parts.push(`Analyze these ${args.images.length} image(s) showing a FiveM script and recreate the visible functionality.`);
    if (args.description) parts.push(`\nAdditional context: ${args.description}`);
  }

  if (args.mode === "tebex" && args.tebexUrl) {
    parts.push(`Analyze this Tebex/store URL and create a similar script:\n${args.tebexUrl}`);
    if (args.additionalContext) parts.push(`\nPage content:\n${args.additionalContext}`);
  }

  if (args.mode === "video" && args.videoUrl) {
    parts.push(`Create a script based on this video showing FiveM gameplay:\n${args.videoUrl}`);
    if (args.description) parts.push(`\nDescription: ${args.description}`);
  }

  if (args.additionalContext && args.mode !== "tebex") {
    parts.push(`\nAdditional context:\n${args.additionalContext}`);
  }

  return parts.join("\n") || "Create a basic FiveM resource template.";
}

async function streamOpenAI(
  systemPrompt: string,
  userPrompt: string,
  images?: string[]
): Promise<ReadableStream<Uint8Array>> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    { role: "system", content: systemPrompt }
  ];

  // Handle images for image mode
  if (images && images.length > 0) {
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: userPrompt }
    ];
    for (const img of images.slice(0, 4)) { // Max 4 images
      contentParts.push({
        type: "image_url",
        image_url: { url: img }
      });
    }
    messages.push({ role: "user", content: contentParts });
  } else {
    messages.push({ role: "user", content: userPrompt });
  }

  console.log("Calling OpenAI API with model gpt-4o-mini...");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 16000,
      temperature: 0.3, // Lower for more consistent code
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return response.body!;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown> = {};
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

    console.log(`Generating script: ${scriptName}, mode: ${mode}, framework: ${framework}`);

    const systemPrompt = buildSystemPrompt({ mode, framework, mysqlType, libType, scriptName });
    const userPrompt = buildUserPrompt({
      mode,
      description: typeof body.description === "string" ? body.description : undefined,
      referenceFiles: Array.isArray(body.referenceFiles) ? body.referenceFiles : undefined,
      images: Array.isArray(body.images) ? body.images : undefined,
      tebexUrl: typeof body.tebexUrl === "string" ? body.tebexUrl : undefined,
      videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : undefined,
      additionalContext: typeof body.additionalContext === "string" ? body.additionalContext : undefined,
    });

    const images = Array.isArray(body.images) ? body.images : undefined;
    const openAIStream = await streamOpenAI(systemPrompt, userPrompt, images);

    // Transform OpenAI stream format to our expected format
    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    const reader = openAIStream.getReader();
    const writer = transformStream.writable.getWriter();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            await writer.close();
            break;
          }
          await writer.write(value);
        }
      } catch (error) {
        console.error("Stream error:", error);
        await writer.abort(error);
      }
    })();

    return new Response(transformStream.readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("generate-script error:", error);

    // Return error as JSON
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
