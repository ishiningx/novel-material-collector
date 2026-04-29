#!/usr/bin/env node
/**
 * 一键发布脚本
 *   npm run release 1.2.0
 *
 * 脚本会做 6 件事：
 *   1. 校验工作区干净、分支为 main、版本号格式正确
 *   2. 交互式读取发布说明（releaseNotes）
 *   3. 同步 4 处版本号：
 *      - package.json
 *      - src-tauri/tauri.conf.json
 *      - src-tauri/Cargo.toml
 *      - latest.json（并写入 releaseNotes + 当前日期）
 *   4. git commit + 打 tag
 *   5. 二次确认后 push 到 origin（GitHub）
 *   6. 打印 GitHub Actions 进度链接
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ANSI 颜色
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = (msg) => console.log(msg);
const ok = (msg) => log(`${c.green}✓${c.reset} ${msg}`);
const step = (msg) => log(`\n${c.bold}${c.cyan}▸ ${msg}${c.reset}`);
const fail = (msg) => {
  log(`\n${c.red}✗ ${msg}${c.reset}\n`);
  process.exit(1);
};

const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: root });
const cap = (cmd) => execSync(cmd, { cwd: root }).toString().trim();

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (ans) => { rl.close(); res(ans.trim()); }));
}

async function askMultiline(prompt) {
  log(`\n${c.bold}${prompt}${c.reset}`);
  log(`${c.gray}(可输入多行；输入单独一行 "END" 或连续空行两次结束)${c.reset}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = [];
  let emptyStreak = 0;
  for await (const line of rl) {
    if (line.trim() === 'END') break;
    if (line === '') {
      emptyStreak++;
      if (emptyStreak >= 2) { lines.pop(); break; }
    } else {
      emptyStreak = 0;
    }
    lines.push(line);
  }
  return lines.join('\n').trim();
}

// ---------------- main ----------------

const [, , newVersion] = process.argv;
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  fail('用法: npm run release <版本号>，例如 npm run release 1.2.0');
}

step('校验 git 状态');

const status = cap('git status --porcelain');
if (status) fail(`工作区有未提交改动，请先处理：\n${status}`);
ok('工作区干净');

const branch = cap('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') fail(`当前分支为 "${branch}"，请切到 main 再发布`);
ok(`分支 = main`);

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
log(`\n当前版本: ${c.gray}${pkg.version}${c.reset}`);
log(`目标版本: ${c.bold}${newVersion}${c.reset}`);

if (pkg.version === newVersion) fail('目标版本与当前版本相同');

const tagExists = cap(`git tag -l v${newVersion}`);
if (tagExists) fail(`tag v${newVersion} 已存在，请换个版本号或先删除旧 tag`);

const confirm1 = await ask(`${c.yellow}确认发布 v${newVersion}? (y/N) ${c.reset}`);
if (confirm1.toLowerCase() !== 'y') fail('已取消');

step('输入发布说明');
const releaseNotes = await askMultiline('请输入本次更新说明：');
if (!releaseNotes) fail('发布说明不能为空');

log(`\n${c.gray}───── 预览 ─────${c.reset}`);
log(releaseNotes);
log(`${c.gray}────────────────${c.reset}`);

const confirm2 = await ask(`${c.yellow}说明是否 OK? (y/N) ${c.reset}`);
if (confirm2.toLowerCase() !== 'y') fail('已取消');

step('同步 4 处版本号');

const today = new Date().toISOString().slice(0, 10);

// 1. package.json
pkg.version = newVersion;
writeFileSync(resolve(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
ok('package.json');

// 2. tauri.conf.json
const confPath = resolve(root, 'src-tauri/tauri.conf.json');
const conf = JSON.parse(readFileSync(confPath, 'utf-8'));
conf.version = newVersion;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n');
ok('src-tauri/tauri.conf.json');

// 3. Cargo.toml
const cargoPath = resolve(root, 'src-tauri/Cargo.toml');
let cargo = readFileSync(cargoPath, 'utf-8');
const cargoNew = cargo.replace(/^version\s*=\s*".+?"/m, `version = "${newVersion}"`);
if (cargoNew === cargo) fail('Cargo.toml 里没找到 version 行，请检查文件');
writeFileSync(cargoPath, cargoNew);
ok('src-tauri/Cargo.toml');

// 4. latest.json
const latestPath = resolve(root, 'latest.json');
const latest = {
  version: newVersion,
  releaseDate: today,
  releaseNotes,
  downloadPageUrl: 'https://gitee.com/ishiningx/novel-material-collector/releases',
};
writeFileSync(latestPath, JSON.stringify(latest, null, 2) + '\n');
ok('latest.json');

step('git commit + tag');
run('git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml latest.json');
run(`git commit -m "release: v${newVersion}"`);
run(`git tag v${newVersion}`);
ok(`已打 tag v${newVersion}`);

log(`\n${c.gray}本地改动已 commit，tag 已打。${c.reset}`);
log(`${c.gray}如需撤销：${c.reset} git tag -d v${newVersion} && git reset --hard HEAD~1`);

const confirm3 = await ask(`\n${c.yellow}push 到 origin 并触发 CI? (y/N) ${c.reset}`);
if (confirm3.toLowerCase() !== 'y') {
  log(`\n${c.gray}未 push。稍后手动执行：${c.reset}`);
  log(`  git push origin main`);
  log(`  git push origin v${newVersion}`);
  process.exit(0);
}

step('push 到 origin');
run('git push origin main');
run(`git push origin v${newVersion}`);

log(`\n${c.green}${c.bold}🎉 发布流水线已启动${c.reset}`);
log(`\n查看进度：https://github.com/ishiningx/novel-material-collector/actions`);
log(`稍后验证：https://gitee.com/ishiningx/novel-material-collector/releases`);
