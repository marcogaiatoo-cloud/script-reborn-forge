import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIVEM_SYSTEM_PROMPT = `You are a senior FiveM developer. Generate clean, optimized, functional scripts without bugs.

CRITICAL RULES:
- Generate each file one at a time with clear markers
- Start each file with: ### FILE: path/filename.lua
- End each file with: ### END FILE
- Only create necessary files
- Do NOT add NUI unless explicitly requested or clearly needed for the functionality
- Do NOT add dependencies, frameworks, or extras unless present in the reference or explicitly requested
- Scripts must behave exactly as described

FRAMEWORK SPECIFICS:
- ESX: Use exports['es_extended']:getSharedObject(), ESX.RegisterServerCallback, ESX.TriggerServerCallback
- QBCore: Use exports['qb-core']:GetCoreObject(), QBCore.Functions.CreateCallback, QBCore.Functions.TriggerCallback  
- Standalone: No framework dependencies, use native events and commands

FILE STRUCTURE:
1. fxmanifest.lua - Resource manifest
2. config.lua - Configuration (if needed)
3. client/main.lua - Client-side logic
4. server/main.lua - Server-side logic
5. sql/install.sql - Database schema (only if database is needed)
6. html/* - NUI files (ONLY if explicitly requested or clearly required)

For each file, briefly explain its purpose before the code.

Generate production-ready code with:
- Server-side validation
- Optimized loops and events
- Professional folder structure
- No placeholder logic`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, framework, scriptName, description, referenceFiles, images, tebexUrl, videoUrl, additionalContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userPrompt = "";
    let messageContent: any[] = [];

    if (mode === "zip") {
      userPrompt = `Recreate this FiveM script for ${framework.toUpperCase()} framework.
Script name: ${scriptName}

Reference files content:
${referenceFiles.map((f: { path: string; content: string }) => `
=== ${f.path} ===
${f.content}
`).join('\n')}

Recreate the script with new, clean code that behaves identically to the original.
Do NOT add NUI unless it exists in the reference.
Generate each file with ### FILE: and ### END FILE markers.`;
      messageContent = [{ type: "text", text: userPrompt }];
      
    } else if (mode === "text") {
      userPrompt = `Create a new FiveM script for ${framework.toUpperCase()} framework.
Script name: ${scriptName}

Description:
${description}

IMPORTANT: Only create what is described. Do NOT add NUI, database, or other features unless explicitly mentioned in the description.
Generate each file with ### FILE: and ### END FILE markers.`;
      messageContent = [{ type: "text", text: userPrompt }];
      
    } else if (mode === "image") {
      const imageContents = images.map((img: string) => ({
        type: "image_url",
        image_url: { url: img }
      }));
      
      userPrompt = `Analyze these images of a FiveM script and recreate it for ${framework.toUpperCase()} framework.
Script name: ${scriptName}

Look at the images carefully and identify:
1. UI elements (menus, notifications, prompts)
2. Gameplay mechanics shown
3. Commands or interactions visible
4. Any text, labels, or configurations shown

Recreate the exact functionality shown in the images as a complete, working script.
Do NOT add NUI unless there's a visible UI in the images that requires it.
Generate each file with ### FILE: and ### END FILE markers.`;

      messageContent = [
        { type: "text", text: userPrompt },
        ...imageContents
      ];
      
    } else if (mode === "tebex") {
      userPrompt = `I need you to create a FiveM script based on this Tebex/store page: ${tebexUrl}

Framework: ${framework.toUpperCase()}
Script name: ${scriptName}

Based on the typical features found in such scripts on Tebex stores, create a complete, functional script.

Think about what features would typically be included:
- Common commands and interactions
- Configuration options
- Database structure if needed
- Client and server logic

Create a professional, production-ready script that would match what's typically sold on Tebex.
Do NOT add NUI unless it's a script that would clearly need a UI (like a menu, shop, etc).
Generate each file with ### FILE: and ### END FILE markers.`;
      messageContent = [{ type: "text", text: userPrompt }];
      
    } else if (mode === "video") {
      userPrompt = `Create a FiveM script based on this video showcase: ${videoUrl}

Framework: ${framework.toUpperCase()}
Script name: ${scriptName}

${additionalContext ? `Additional context from user:\n${additionalContext}\n` : ''}

Based on typical FiveM script videos and the URL provided, think about:
1. What type of script this likely is (job, vehicle, menu, etc)
2. Commands and keybinds typically used
3. UI elements that might be shown
4. Interactions between player and game

Create a complete, working script that would produce similar results to what's shown in such videos.
Do NOT add NUI unless the description clearly mentions a visual UI/menu.
Generate each file with ### FILE: and ### END FILE markers.`;
      messageContent = [{ type: "text", text: userPrompt }];
      
    } else {
      throw new Error("Invalid mode");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: FIVEM_SYSTEM_PROMPT },
          { role: "user", content: messageContent },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("generate-script error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
