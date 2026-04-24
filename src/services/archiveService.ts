import { readTextFile, writeTextFile, copyFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import type { ArchiveRecord } from '../types';

// 格式化日期为 YYYY.MM.DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// 生成 Markdown 记录
function generateMarkdownRecord(record: ArchiveRecord): string {
  // 构建标签
  const tags = [
    record.platform,
    ...record.categories
  ].filter(Boolean).map(t => `\`${t}\``).join(' ');

  // 经典标记
  const classicMark = record.isClassic ? ' ⭐经典' : '';

  // 文件链接
  const fileLink = ` · [[${record.title}.txt]]`;

  // 构建记录
  let md = `**${record.title}**${tags ? ' ' + tags : ''}${classicMark}\n`;

  // 核心梗
  if (record.coreGimmick) {
    md += `🎯 ${record.coreGimmick}\n`;
  }

  // 付费点
  if (record.payPoint) {
    md += `> ${record.payPoint}\n`;
  }

  // 梗概
  if (record.synopsis) {
    md += `📖 ${record.synopsis}\n`;
  }

  // 亮点 + 文件链接
  md += `💡 ${record.highlight || '（暂无亮点记录）'}${fileLink}\n`;

  return md;
}

// 查找或创建日期分组的插入位置
function findInsertPosition(content: string, dateStr: string): { found: boolean; position: number } {
  // 查找当天的分组
  const dateHeaderPattern = new RegExp(`^## ${dateStr.replace(/\./g, '\\.')} 扫榜记录`, 'm');
  const match = content.match(dateHeaderPattern);

  if (match && match.index !== undefined) {
    // 找到了当天的分组，找到这个分组下第一条记录的位置
    const afterHeader = content.substring(match.index);
    const lines = afterHeader.split('\n');
    let insertOffset = match.index;

    // 跳过分组标题行
    for (let i = 0; i < lines.length; i++) {
      insertOffset += lines[i].length + 1; // +1 for newline
      if (i === 0) continue; // 跳过标题行
      // 找到第一个以 ** 开头的行，或者在下一个 ## 之前插入
      if (lines[i].startsWith('**') || lines[i].startsWith('## ')) {
        return { found: true, position: insertOffset - lines[i].length - 1 };
      }
      // 空行继续
      if (lines[i].trim() === '') continue;
    }

    return { found: true, position: insertOffset };
  }

  // 没找到当天的分组，需要在文件开头插入新的日期分组
  return { found: false, position: -1 };
}

// 写入例文索引
export async function appendToExampleIndex(
  indexPath: string,
  record: ArchiveRecord
): Promise<void> {
  let content = '';

  try {
    content = await readTextFile(indexPath);
  } catch {
    // 文件不存在，创建新文件
    content = `# 扫榜记录\n\n---\n`;
  }

  const today = formatDate(new Date(record.createdAt));
  const recordMd = generateMarkdownRecord(record);

  const { found, position } = findInsertPosition(content, today);

  if (found && position >= 0) {
    // 在当天分组开头插入记录
    content = content.substring(0, position) + recordMd + '\n' + content.substring(position);
  } else {
    // 创建新的日期分组，插入到文件开头的标题之后
    const newSection = `\n## ${today} 扫榜记录\n\n${recordMd}\n`;

    // 找到第一个 --- 或第一个 ## 来确定插入位置
    const separatorIndex = content.indexOf('\n---\n');
    if (separatorIndex !== -1) {
      content = content.substring(0, separatorIndex + 5) + newSection + content.substring(separatorIndex + 5);
    } else {
      // 没有 separator，直接在开头插入
      const firstHeaderEnd = content.indexOf('\n');
      if (firstHeaderEnd !== -1) {
        content = content.substring(0, firstHeaderEnd + 1) + newSection + content.substring(firstHeaderEnd + 1);
      } else {
        content = newSection + content;
      }
    }
  }

  await writeTextFile(indexPath, content);
}

// 复制原文到存档文件夹
export async function copyToArchive(
  sourcePath: string,
  archiveFolder: string,
  newFileName: string
): Promise<string> {
  // 确保目标文件夹存在
  try {
    const folderExists = await exists(archiveFolder);
    if (!folderExists) {
      await mkdir(archiveFolder, { recursive: true });
    }
  } catch (err) {
    console.error('[Archive] Failed to create folder:', err);
    throw err;
  }

  // 目标文件路径
  const destPath = `${archiveFolder}/${newFileName}.txt`;

  // 复制文件
  await copyFile(sourcePath, destPath);

  return destPath;
}

// 执行完整的归档流程
export async function performArchive(
  record: ArchiveRecord,
  options: {
    exampleIndexPath: string;
    exampleArchivePath: string;
    hotArchivePath: string;
    originalFilePath?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 写入例文索引
    await appendToExampleIndex(options.exampleIndexPath, record);

    // 2. 如果有原文文件，复制到对应文件夹
    if (options.originalFilePath) {
      if (record.isClassic) {
        // 经典热文：只复制到热文库
        if (options.hotArchivePath) {
          await copyToArchive(
            options.originalFilePath,
            options.hotArchivePath,
            record.title
          );
        }
      } else {
        // 普通例文：复制到例文存档
        await copyToArchive(
          options.originalFilePath,
          options.exampleArchivePath,
          record.title
        );
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[Archive] Failed:', err);
    return { success: false, error: String(err) };
  }
}
