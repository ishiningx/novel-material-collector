import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { save, open } from '@tauri-apps/plugin-dialog';

const DATA_DIR = 'novel-material-collector';

const DATA_FILES = [
  'materials.json',
  'categories.json',
  'articles.json',
  'article-genres.json',
  'settings.json',
  'migration.json',
  'weekly-reports.json',
  'works.json',
  'encouragement-messages.txt',
];

export interface BackupManifest {
  version: string;
  exportedAt: string;
  appVersion: string;
  files: Record<string, string>;
}

export interface BackupMeta {
  appVersion: string;
  exportedAt: string;
  fileCount: number;
}

export async function exportAllData(appVersion: string): Promise<boolean> {
  try {
    const files: Record<string, string> = {};
    for (const fileName of DATA_FILES) {
      try {
        const content = await readTextFile(`${DATA_DIR}/${fileName}`, {
          baseDir: BaseDirectory.AppData,
        });
        files[fileName] = content;
      } catch {
        // File doesn't exist, skip
      }
    }

    const manifest: BackupManifest = {
      version: '1',
      exportedAt: new Date().toISOString(),
      appVersion,
      files,
    };

    const date = new Date().toISOString().split('T')[0];
    const filePath = await save({
      defaultPath: `素材收集助手_备份_${date}.json`,
      filters: [{ name: 'JSON 备份文件', extensions: ['json'] }],
    });

    if (!filePath) return false;

    await writeTextFile(filePath as string, JSON.stringify(manifest, null, 2));
    return true;
  } catch (err) {
    console.error('[Backup] export failed:', err);
    throw err;
  }
}

export async function importAllData(): Promise<BackupManifest | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON 备份文件', extensions: ['json'] }],
    });

    if (!selected) return null;

    const content = await readTextFile(selected as string);
    const manifest = JSON.parse(content);

    if (!manifest.version || !manifest.files || typeof manifest.files !== 'object') {
      throw new Error('无效的备份文件格式');
    }

    return manifest as BackupManifest;
  } catch (err) {
    console.error('[Backup] import failed:', err);
    throw err;
  }
}

export type ImportMode = 'overwrite' | 'merge';

// JSON array files with 'id' fields — can be deduplicated on merge
const MERGEABLE_JSON_FILES = ['works.json', 'materials.json', 'articles.json', 'categories.json'];

// Files that should keep existing data on merge
const SKIP_ON_MERGE = ['settings.json', 'migration.json', 'encouragement-messages.txt'];

async function mergeJsonArray(existingContent: string | null, backupContent: string): Promise<string> {
  const existing = existingContent ? JSON.parse(existingContent) : [];
  const backup = JSON.parse(backupContent);

  if (!Array.isArray(existing) || !Array.isArray(backup)) {
    return backupContent;
  }

  const map = new Map<string, any>();
  for (const item of existing) {
    if (item.id) map.set(item.id, item);
  }
  for (const item of backup) {
    if (item.id) {
      map.set(item.id, item);
    } else {
      map.set(`__import_${Math.random().toString(36).slice(2)}`, item);
    }
  }

  return JSON.stringify([...map.values()], null, 2);
}

export async function restoreAllData(files: Record<string, string>, mode: ImportMode = 'overwrite'): Promise<void> {
  try {
    for (const [fileName, content] of Object.entries(files)) {
      if (mode === 'merge') {
        if (SKIP_ON_MERGE.includes(fileName)) continue;

        if (MERGEABLE_JSON_FILES.includes(fileName)) {
          let existingContent: string | null = null;
          try {
            existingContent = await readTextFile(`${DATA_DIR}/${fileName}`, {
              baseDir: BaseDirectory.AppData,
            });
          } catch { /* file doesn't exist yet */ }
          const merged = await mergeJsonArray(existingContent, content);
          await writeTextFile(`${DATA_DIR}/${fileName}`, merged, {
            baseDir: BaseDirectory.AppData,
          });
        } else {
          await writeTextFile(`${DATA_DIR}/${fileName}`, content, {
            baseDir: BaseDirectory.AppData,
          });
        }
      } else {
        await writeTextFile(`${DATA_DIR}/${fileName}`, content, {
          baseDir: BaseDirectory.AppData,
        });
      }
    }
  } catch (err) {
    console.error('[Backup] restore failed:', err);
    throw err;
  }
}

export function extractMeta(manifest: BackupManifest): BackupMeta {
  return {
    appVersion: manifest.appVersion || '未知',
    exportedAt: manifest.exportedAt || '',
    fileCount: Object.keys(manifest.files).length,
  };
}
