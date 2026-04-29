// 简易更新检查：拉取 Gitee 上的 latest.json，对比版本号，提示用户前往下载页
// 放弃 Tauri 自带 updater（签名流程复杂），改为"检查 → 跳转浏览器下载"模式
// 请求走 @tauri-apps/plugin-http（Rust 侧发请求），绕开 webview 的 CORS 限制

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { UpdateStatus, UpdateInfo } from '../types';

// Gitee 上维护的 latest.json 地址（带 cache buster 防止 CDN 缓存）
const LATEST_JSON_URL =
  'https://gitee.com/ishiningx/novel-material-collector/raw/main/latest.json';

// 跳转下载用的 Gitee release 页面
const RELEASE_PAGE_URL =
  'https://gitee.com/ishiningx/novel-material-collector/releases';

/**
 * 简化后的 latest.json 结构：
 * {
 *   "version": "1.1.5",
 *   "releaseDate": "2026-04-29",
 *   "releaseNotes": "更新说明...",
 *   "downloadPageUrl": "https://gitee.com/..."  // 可选，缺省用 RELEASE_PAGE_URL
 * }
 *
 * 兼容老格式：读 version / notes / pub_date
 */
interface RemoteManifest {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  downloadPageUrl?: string;
  // legacy
  notes?: string;
  pub_date?: string;
}

export async function checkForUpdate(
  currentVersion: string,
  onStatusChange: (status: UpdateStatus) => void
): Promise<UpdateInfo | null> {
  onStatusChange('checking');

  try {
    // 加 cache-buster 避开 Gitee raw 的 CDN 缓存；tauriFetch 从 Rust 侧走，自动跟随 302 重定向
    const url = `${LATEST_JSON_URL}?t=${Date.now()}`;
    const res = await tauriFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest: RemoteManifest = await res.json();

    if (!manifest.version) {
      throw new Error('latest.json 缺少 version 字段');
    }

    if (compareVersion(manifest.version, currentVersion) > 0) {
      onStatusChange('available');
      return {
        version: manifest.version,
        currentVersion,
        date: manifest.releaseDate || manifest.pub_date,
        body: manifest.releaseNotes || manifest.notes,
      };
    }

    onStatusChange('not-available');
    setTimeout(() => onStatusChange('idle'), 3000);
    return null;
  } catch (error) {
    console.error('[Updater] Check failed:', error);
    onStatusChange('error');
    setTimeout(() => onStatusChange('idle'), 3000);
    return null;
  }
}

/**
 * 跳转到下载页（默认 Gitee release 页面）
 */
export async function openDownloadPage(url?: string): Promise<void> {
  try {
    await openUrl(url || RELEASE_PAGE_URL);
  } catch (error) {
    console.error('[Updater] Open download page failed:', error);
    throw error;
  }
}

/**
 * 语义化版本比较：返回正数表示 a > b，负数表示 a < b，0 表示相等
 * 只比较主/次/修订三段数字，忽略预发布后缀
 */
export function compareVersion(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.-]/)
      .slice(0, 3)
      .map((s) => parseInt(s, 10) || 0);
  const av = parse(a);
  const bv = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (av[i] || 0) - (bv[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}
