import JSZip from 'jszip';

export interface ScriptFile {
  name: string;
  path: string;
  content: string;
  type: 'lua' | 'json' | 'sql' | 'html' | 'css' | 'js' | 'other';
}

export const getFileType = (filename: string): ScriptFile['type'] => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'lua':
      return 'lua';
    case 'json':
      return 'json';
    case 'sql':
      return 'sql';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
      return 'js';
    default:
      return 'other';
  }
};

export const parseZipFile = async (file: File): Promise<ScriptFile[]> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  const files: ScriptFile[] = [];

  for (const [path, zipEntry] of Object.entries(contents.files)) {
    if (!zipEntry.dir) {
      const content = await zipEntry.async('text');
      const name = path.split('/').pop() || path;
      files.push({
        name,
        path,
        content,
        type: getFileType(name),
      });
    }
  }

  return files;
};

export const generateZip = async (files: ScriptFile[], scriptName: string): Promise<Blob> => {
  const zip = new JSZip();
  const folder = zip.folder(scriptName);

  if (folder) {
    files.forEach((file) => {
      folder.file(file.path, file.content);
    });
  }

  return zip.generateAsync({ type: 'blob' });
};

export const downloadZip = async (files: ScriptFile[], scriptName: string) => {
  const blob = await generateZip(files, scriptName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${scriptName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
