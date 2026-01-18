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
- ALWAYS use the MySQL library specified by the user (mysql-async or oxmysql)
- ALWAYS use the lib specified by the user (default natives or ox_lib)

FRAMEWORK SPECIFICS:
- ESX: Use exports['es_extended']:getSharedObject(), ESX.RegisterServerCallback, ESX.TriggerServerCallback
- QBCore: Use exports['qb-core']:GetCoreObject(), QBCore.Functions.CreateCallback, QBCore.Functions.TriggerCallback  
- Standalone: No framework dependencies, use native events and commands

MYSQL LIBRARY SPECIFICS:
- mysql-async: Use MySQL.Async.fetchAll, MySQL.Async.execute, MySQL.Async.insert, MySQL.Async.fetchScalar
- oxmysql: Use MySQL.query, MySQL.insert, MySQL.update, MySQL.scalar, exports.oxmysql:...

LIB SPECIFICS:
- default: Use native FiveM functions, DrawText3D, markers, standard notifications
- ox_lib: Use lib.callback, lib.notify, lib.progressBar, lib.inputDialog, lib.context, lib.zones, etc.
  - Add '@ox_lib/init.lua' as shared_script in fxmanifest
  - Use ox_lib patterns for menus, notifications, progress bars, etc.

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

// Use Firecrawl to scrape Tebex/store pages with full content extraction
async function scrapeTebexWithFirecrawl(url: string): Promise<{ 
  markdown: string; 
  title: string; 
  description: string; 
  screenshot?: string;
  success: boolean;
}> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  
  if (!FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY not configured');
    return {
      success: false,
      markdown: '',
      title: '',
      description: 'Firecrawl not configured'
    };
  }

  try {
    console.log('Scraping with Firecrawl:', url);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'screenshot'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('Firecrawl error:', data);
      return {
        success: false,
        markdown: '',
        title: '',
        description: data.error || 'Failed to scrape'
      };
    }

    console.log('Firecrawl scrape successful, markdown length:', data.data?.markdown?.length || 0);
    
    return {
      success: true,
      markdown: data.data?.markdown || '',
      title: data.data?.metadata?.title || '',
      description: data.data?.metadata?.description || '',
      screenshot: data.data?.screenshot || undefined
    };
  } catch (error) {
    console.error('Firecrawl error:', error);
    return {
      success: false,
      markdown: '',
      title: '',
      description: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Fetch YouTube video info using oEmbed API
async function fetchYouTubeInfo(url: string): Promise<{ title: string; description: string; thumbnails: string[]; channel: string }> {
  try {
    // Extract video ID
    let videoId = '';
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || '';
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }
    
    if (!videoId) {
      throw new Error('Could not extract video ID');
    }
    
    // Use oEmbed to get video info
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    
    if (!oembedRes.ok) {
      throw new Error('Failed to fetch video info');
    }
    
    const oembed = await oembedRes.json();
    
    // Get thumbnails at different resolutions
    const thumbnails = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    ];
    
    // Try to get the video page for description
    let description = '';
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const pageHtml = await pageRes.text();
      
      // Extract description from meta tags
      const descMatch = pageHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch) {
        description = descMatch[1];
      }
    } catch {
      // Ignore errors fetching page
    }
    
    return {
      title: oembed.title || '',
      description,
      thumbnails,
      channel: oembed.author_name || ''
    };
  } catch (error) {
    console.error('Error fetching YouTube info:', error);
    return {
      title: '',
      description: `Video URL: ${url}`,
      thumbnails: [],
      channel: ''
    };
  }
}

// Fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const buffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, framework, scriptName, mysqlType, libType, description, referenceFiles, images, tebexUrl, videoUrl, additionalContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Build preferences string
    const mysqlLib = mysqlType || 'mysql-async';
    const libPreference = libType || 'default';
    const preferencesInfo = `
USER PREFERENCES:
- MySQL Library: ${mysqlLib} (USE THIS for all database operations)
- Libs: ${libPreference === 'ox_lib' ? 'ox_lib (USE ox_lib functions for UI, callbacks, notifications, progress bars, zones, etc.)' : 'default (USE native FiveM functions)'}
`;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userPrompt = "";
    let messageContent: any[] = [];

    if (mode === "zip") {
      userPrompt = `Recreate this FiveM script for ${framework.toUpperCase()} framework.
Script name: ${scriptName}
${preferencesInfo}
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
${preferencesInfo}
Description:
${description}

IMPORTANT: Only create what is described. Do NOT add NUI, database, or other features unless explicitly mentioned in the description.
Generate each file with ### FILE: and ### END FILE markers.`;
      messageContent = [{ type: "text", text: userPrompt }];
      
    } else if (mode === "image") {
      // Images are already base64 from the frontend
      const imageContents = [];
      for (const img of images || []) {
        if (img.startsWith('data:')) {
          imageContents.push({
            type: "image_url",
            image_url: { url: img }
          });
        }
      }
      
      if (imageContents.length === 0) {
        throw new Error("No valid images provided");
      }
      
      userPrompt = `ANALYZE THESE IMAGES CAREFULLY. They show a FiveM script in action.
${preferencesInfo}
Look at EVERY detail in the images:
1. What UI elements are visible? (menus, notifications, HUD, popups)
2. What text/labels can you read? (commands, button labels, titles)
3. What gameplay mechanics are shown? (vehicles, NPCs, markers, blips)
4. What interactions are happening? (player actions, animations, effects)
5. What framework indicators do you see? (ESX/QBCore notifications, etc)

Based on your VISUAL ANALYSIS, recreate this exact script for ${framework.toUpperCase()} framework.
Script name: ${scriptName}

Create a script that produces the EXACT same visual result and functionality shown in the images.
If there's a visible UI/menu, include NUI. Otherwise, do NOT add NUI.
Generate each file with ### FILE: and ### END FILE markers.`;

      messageContent = [
        { type: "text", text: userPrompt },
        ...imageContents
      ];
      
    } else if (mode === "tebex") {
      console.log("Scraping Tebex page with Firecrawl:", tebexUrl);
      
      // Use Firecrawl to get REAL content from the Tebex page
      const scrapeResult = await scrapeTebexWithFirecrawl(tebexUrl);
      
      if (!scrapeResult.success) {
        console.error("Failed to scrape Tebex page:", scrapeResult.description);
      }
      
      console.log("Tebex content scraped:", {
        title: scrapeResult.title,
        markdownLength: scrapeResult.markdown.length,
        hasScreenshot: !!scrapeResult.screenshot
      });
      
      // Build message content with REAL scraped data
      const contentParts: any[] = [];
      
      userPrompt = `I have SCRAPED this FiveM script store page. Here is the ACTUAL content from the page.
ANALYZE EVERYTHING CAREFULLY and recreate this script EXACTLY as described.
${preferencesInfo}
URL: ${tebexUrl}

PAGE TITLE: ${scrapeResult.title}

PAGE META DESCRIPTION: ${scrapeResult.description}

=== FULL PAGE CONTENT (Markdown) ===
${scrapeResult.markdown}
=== END PAGE CONTENT ===

Based on ALL the information above from the REAL store page, create a complete ${framework.toUpperCase()} script.
Script name: ${scriptName}

CRITICAL INSTRUCTIONS:
- READ the scraped content CAREFULLY - it contains all the features and functionality described on the page
- Create EVERY feature mentioned in the page content
- Match the functionality described EXACTLY
- If the page describes a UI/menu system, include NUI files
- If the page mentions commands, implement those exact commands
- If prices/features are listed, implement all those features
- Make the script behave IDENTICALLY to what is described on the store page

Generate each file with ### FILE: and ### END FILE markers.`;

      contentParts.push({ type: "text", text: userPrompt });
      
      // Include the screenshot from Firecrawl if available - must convert URL to base64
      if (scrapeResult.screenshot) {
        console.log("Firecrawl screenshot URL found, fetching and converting to base64...");
        
        // Check if it's already base64 or if it's a URL
        if (scrapeResult.screenshot.startsWith('data:')) {
          // Already base64
          contentParts.push({
            type: "image_url",
            image_url: { url: scrapeResult.screenshot }
          });
        } else {
          // It's a URL - need to fetch and convert to base64
          const base64Image = await fetchImageAsBase64(scrapeResult.screenshot);
          if (base64Image) {
            console.log("Screenshot converted to base64 successfully");
            contentParts.push({
              type: "image_url",
              image_url: { url: base64Image }
            });
          } else {
            console.log("Failed to convert screenshot to base64, skipping image");
          }
        }
      }
      
      messageContent = contentParts;
      
    } else if (mode === "video") {
      console.log("Fetching YouTube info:", videoUrl);
      
      // Fetch actual video information
      const videoInfo = await fetchYouTubeInfo(videoUrl);
      
      console.log("Video info fetched:", {
        title: videoInfo.title,
        channel: videoInfo.channel,
        thumbnailsCount: videoInfo.thumbnails.length
      });
      
      // Build message with video info and thumbnails
      const contentParts: any[] = [];
      
      userPrompt = `Analyze this YouTube video about a FiveM script and recreate what's shown.

VIDEO URL: ${videoUrl}
VIDEO TITLE: ${videoInfo.title}
CHANNEL: ${videoInfo.channel}
VIDEO DESCRIPTION: ${videoInfo.description}

${additionalContext ? `USER'S OBSERVATIONS ABOUT THE VIDEO:\n${additionalContext}\n` : ''}

I'm also including THUMBNAIL images from the video. Analyze them to understand what the script looks like in action.

Based on the video title, description, thumbnails, and any user observations, create a ${framework.toUpperCase()} script that replicates what's shown in the video.
Script name: ${scriptName}

IMPORTANT:
- The video title and description often contain the main features
- Thumbnails show the visual appearance and UI elements
- Create functionality that matches what would be shown in such a video
- Only add NUI if the thumbnails/description clearly show a visual interface

Generate each file with ### FILE: and ### END FILE markers.`;

      contentParts.push({ type: "text", text: userPrompt });
      
      // Fetch and include thumbnails as images for analysis
      for (const thumbUrl of videoInfo.thumbnails.slice(0, 2)) {
        const base64 = await fetchImageAsBase64(thumbUrl);
        if (base64) {
          contentParts.push({
            type: "image_url",
            image_url: { url: base64 }
          });
        }
      }
      
      messageContent = contentParts;
      
    } else {
      throw new Error("Invalid mode");
    }

    console.log("Sending to AI gateway, mode:", mode, "content parts:", messageContent.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
