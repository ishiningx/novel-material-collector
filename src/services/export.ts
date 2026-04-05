import type { MaterialItem } from '../types';

// Export as Excel-compatible CSV (with BOM for proper encoding)
export function exportToExcel(materials: MaterialItem[]): string {
  const header = '分类\t内容\t来源\t日期\t备注\n';
  const rows = materials.map((m) => {
    const content = m.content.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const note = m.note.replace(/\t/g, ' ').replace(/\n/g, ' ');
    return `${m.category}\t${content}\t${m.source}\t${m.date}\t${note}`;
  });
  // BOM for UTF-8 to ensure Excel recognizes encoding correctly
  return '\uFEFF' + header + rows.join('\n');
}

// Export as CSV string
export function exportToCSV(materials: MaterialItem[]): string {
  const header = '分类,内容,来源,日期,备注\n';
  const rows = materials.map((m) => {
    const content = escapeCsvField(m.content);
    const note = escapeCsvField(m.note);
    return `${m.category},"${content}","${m.source}","${m.date}","${note}"`;
  });
  return '\uFEFF' + header + rows.join('\n');
}

// Export as Markdown string
export function exportToMarkdown(materials: MaterialItem[]): string {
  const lines: string[] = ['# 素材库\n'];

  // Group by category
  const grouped = new Map<string, MaterialItem[]>();
  materials.forEach((m) => {
    const list = grouped.get(m.category) || [];
    list.push(m);
    grouped.set(m.category, list);
  });

  grouped.forEach((items, category) => {
    lines.push(`\n## ${category}（${items.length}条）\n`);
    items.forEach((item, i) => {
      lines.push(`### ${i + 1}. ${item.source}`);
      lines.push(`> ${item.content}`);
      lines.push(`\n- 日期：${item.date}`);
      if (item.note) {
        lines.push(`- 备注：${item.note}`);
      }
      lines.push('');
    });
  });

  return lines.join('\n');
}

// Export as plain text
export function exportToTxt(materials: MaterialItem[]): string {
  const lines: string[] = ['素材库', '=' .repeat(40), ''];

  materials.forEach((m, i) => {
    lines.push(`${i + 1}. 【${m.category}】${m.source}`);
    lines.push(`   ${m.content}`);
    lines.push(`   日期：${m.date}${m.note ? ' | 备注：' + m.note : ''}`);
    lines.push('');
  });

  lines.push(`共 ${materials.length} 条素材`);
  return lines.join('\n');
}

function escapeCsvField(field: string): string {
  return field.replace(/"/g, '""').replace(/\n/g, ' ');
}
