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
  // Try UTF-8 first
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  // Check for GBK encoding: if UTF-8 has replacement chars, try GBK
  if (utf8.includes('\uFFFD')) {
    try {
      const gbk = new TextDecoder('gbk').decode(buffer);
      // Normalize line endings: convert all \r\n and \r to \n
      return gbk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    } catch {
      return utf8;
    }
  }

  // Normalize line endings: convert all \r\n and \r to \n
  return utf8.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function getFileCharCount(text: string): number {
  // Remove whitespace and count actual characters
  return text.replace(/\s/g, '').length;
}
