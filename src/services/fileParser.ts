import mammoth from 'mammoth';

export type DocumentFormat = 'txt' | 'docx';

export interface ParsedDocument {
  content: string;
  title: string;
  format: DocumentFormat;
  charCount: number;
}

export async function parseFile(filePath: string, fileName: string): Promise<ParsedDocument> {
  const format = getFormat(fileName);

  if (format === 'txt') {
    return parseTxtFile(filePath, fileName);
  } else {
    return parseDocxFile(filePath, fileName);
  }
}

function getFormat(fileName: string): DocumentFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'docx') return 'docx';
  return 'txt';
}

async function parseTxtFile(filePath: string, fileName: string): Promise<ParsedDocument> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const buffer = await readFile(filePath);
  const content = decodeBuffer(buffer);
  const title = fileName.replace(/\.(txt|docx)$/i, '');

  return {
    content,
    title,
    format: 'txt',
    charCount: content.length,
  };
}

async function parseDocxFile(filePath: string, fileName: string): Promise<ParsedDocument> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const buffer = await readFile(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const result = await mammoth.extractRawText({ arrayBuffer });
  const title = fileName.replace(/\.(txt|docx)$/i, '');

  return {
    content: result.value,
    title,
    format: 'docx',
    charCount: result.value.length,
  };
}

function decodeBuffer(buffer: Uint8Array): string {
  // 1) Check for UTF-16 BOM (Windows "Unicode" encoding)
  if (buffer.length >= 2) {
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // UTF-16 LE with BOM
      return new TextDecoder('utf-16le').decode(buffer).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // UTF-16 BE with BOM (rare, but handle it)
      return new TextDecoder('utf-16be').decode(buffer).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
  }

  // 2) Try UTF-8
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const cleanUtf8 = utf8.charCodeAt(0) === 0xFEFF ? utf8.slice(1) : utf8;

  if (!cleanUtf8.includes('\uFFFD')) {
    return cleanUtf8.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  // 3) Try GBK (Chinese Windows ANSI encoding) — more common than UTF-16 without BOM
  try {
    const gbk = new TextDecoder('gbk').decode(buffer);
    if (!gbk.includes('\uFFFD') || gbk.length > cleanUtf8.length * 0.8) {
      return gbk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
  } catch {
    // fall through
  }

  // 4) Try UTF-16 without BOM (e.g. truncated files or edge cases)
  try {
    const utf16 = new TextDecoder('utf-16le', { fatal: false }).decode(buffer);
    if (!utf16.includes('\uFFFD')) {
      return utf16.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
  } catch {
    // fall through
  }

  return cleanUtf8.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function getFileCharCount(text: string): number {
  // Remove whitespace and count actual characters
  return text.replace(/\s/g, '').length;
}
