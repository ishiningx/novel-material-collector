import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { UpdateStatus, UpdateInfo, DownloadProgress } from '../types';

let currentUpdate: Update | null = null;

export async function checkForUpdate(
  onStatusChange: (status: UpdateStatus) => void
): Promise<UpdateInfo | null> {
  onStatusChange('checking');
  
  try {
    const update = await check();
    
    if (update) {
      currentUpdate = update;
      onStatusChange('available');
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        date: update.date,
        body: update.body,
      };
    } else {
      onStatusChange('not-available');
      setTimeout(() => onStatusChange('idle'), 3000);
      return null;
    }
  } catch (error) {
    console.error('[Updater] Check failed:', error);
    onStatusChange('error');
    setTimeout(() => onStatusChange('idle'), 3000);
    throw error;
  }
}

export async function downloadAndInstall(
  onStatusChange: (status: UpdateStatus) => void,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  if (!currentUpdate) {
    throw new Error('No update available');
  }
  
  onStatusChange('downloading');
  
  try {
    let downloaded = 0;
    let total = 0;
    
    await currentUpdate.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          total = event.data.contentLength || 0;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          if (total > 0) {
            onProgress?.({
              downloaded,
              total,
              percent: Math.round((downloaded / total) * 100),
            });
          }
          break;
        case 'Finished':
          break;
      }
    });
    
    // 自动重启应用
    await relaunch();
  } catch (error) {
    console.error('[Updater] Download/install failed:', error);
    onStatusChange('error');
    throw error;
  }
}
