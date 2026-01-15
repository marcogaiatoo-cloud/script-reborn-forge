import type { ScriptFile } from './zipUtils';

const GENERATE_SCRIPT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-script`;

interface GenerateScriptParams {
  mode: 'zip' | 'text';
  framework: string;
  scriptName: string;
  description?: string;
  referenceFiles?: { path: string; content: string }[];
  onChunk: (text: string) => void;
  onFile: (file: ScriptFile) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamGenerateScript({
  mode,
  framework,
  scriptName,
  description,
  referenceFiles,
  onChunk,
  onFile,
  onDone,
  onError,
}: GenerateScriptParams) {
  try {
    const response = await fetch(GENERATE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        mode,
        framework,
        scriptName,
        description,
        referenceFiles,
      }),
    });

    if (!response.ok || !response.body) {
      if (response.status === 429) {
        onError('Rate limit exceeded. Please try again later.');
        return;
      }
      if (response.status === 402) {
        onError('Payment required. Please add credits.');
        return;
      }
      onError('Failed to start generation');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let fullContent = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullContent += content;
            onChunk(content);
            
            // Parse completed files from content
            const files = parseFilesFromContent(fullContent);
            files.forEach(file => onFile(file));
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch { /* ignore */ }
      }
    }

    // Parse final files
    const finalFiles = parseFilesFromContent(fullContent);
    finalFiles.forEach(file => onFile(file));
    
    onDone();
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}

function parseFilesFromContent(content: string): ScriptFile[] {
  const files: ScriptFile[] = [];
  const fileRegex = /### FILE: (.+?)\n([\s\S]*?)### END FILE/g;
  let match: RegExpExecArray | null;

  while ((match = fileRegex.exec(content)) !== null) {
    const path = match[1].trim();
    let fileContent = match[2].trim();
    
    // Remove markdown code blocks if present
    fileContent = fileContent.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    
    const name = path.split('/').pop() || path;
    const ext = name.split('.').pop()?.toLowerCase();
    
    let type: ScriptFile['type'] = 'other';
    if (ext === 'lua') type = 'lua';
    else if (ext === 'json') type = 'json';
    else if (ext === 'sql') type = 'sql';
    else if (ext === 'html') type = 'html';
    else if (ext === 'css') type = 'css';
    else if (ext === 'js') type = 'js';

    files.push({ name, path, content: fileContent, type });
  }

  return files;
}
