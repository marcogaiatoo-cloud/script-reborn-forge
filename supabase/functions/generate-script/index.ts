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

// Fetch and extract content from a Tebex/store page
async function fetchTebexContent(url: string): Promise<{ title: string; description: string; features: string[]; images: string[] }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';
    
    // Extract all text content from common content areas
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    
    // Remove scripts and styles
    const cleanContent = bodyContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract features (looking for list items or feature-like content)
    const features: string[] = [];
    const featureMatches = html.matchAll(/<li[^>]*>([^<]+)<\/li>/gi);
    for (const match of featureMatches) {
      const feature = match[1].trim();
      if (feature.length > 5 && feature.length < 200) {
        features.push(feature);
      }
    }
    
    // Extract images
    const images: string[] = [];
    const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      const src = match[1];
      if (src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
        images.push(src);
      }
    }
    
    // Limit content
    const description = cleanContent.slice(0, 3000);
    
    return {
      title,
      description: metaDesc || description.slice(0, 500),
      features: features.slice(0, 20),
      images: images.slice(0, 5)
    };
  } catch (error) {
    console.error('Error fetching Tebex page:', error);
    return {
      title: '',
      description: `Could not fetch page content. URL: ${url}`,
      features: [],
      images: []
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
      console.log("Fetching Tebex page:", tebexUrl);
      
      // Actually fetch and analyze the Tebex page
      const tebexContent = await fetchTebexContent(tebexUrl);
      
      console.log("Tebex content fetched:", {
        title: tebexContent.title,
        featuresCount: tebexContent.features.length,
        imagesCount: tebexContent.images.length
      });
      
      // Build message content with text and images
      const contentParts: any[] = [];
      
      userPrompt = `I scraped this Tebex/store page for a FiveM script. Analyze all the information and recreate this script.

URL: ${tebexUrl}

PAGE TITLE: ${tebexContent.title}

PAGE DESCRIPTION: ${tebexContent.description}

FEATURES LISTED ON PAGE:
${tebexContent.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Based on this REAL information from the store page, create a complete ${framework.toUpperCase()} script.
Script name: ${scriptName}

IMPORTANT: 
- Create ALL features mentioned in the description and feature list
- Match the functionality described on the store page EXACTLY
- If the page mentions NUI/menu/interface, include it. Otherwise, don't add NUI.

Generate each file with ### FILE: and ### END FILE markers.`;

      contentParts.push({ type: "text", text: userPrompt });
      
      // Try to fetch and include images from the page
      for (const imgUrl of tebexContent.images.slice(0, 3)) {
        const base64 = await fetchImageAsBase64(imgUrl);
        if (base64) {
          contentParts.push({
            type: "image_url",
            image_url: { url: base64 }
          });
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
