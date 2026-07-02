#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const outDir = path.join(root, 'dist-upload');
const outFile = path.join(outDir, `${pkg.name || 'game'}-upload.zip`);
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.playwright-cli', 'output', 'dist-upload', '.next', '.vite', 'coverage', 'submission', 'scripts', '备份']);
const EXCLUDED_NAMES = new Set(['.DS_Store', 'npm-debug.log', 'yarn-error.log']);
const EXCLUDED_EXTS = new Set(['.log']);

function shouldSkip(rel) {
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.some((p) => EXCLUDED_DIRS.has(p))) return true;
  const base = parts[parts.length - 1] || '';
  if (EXCLUDED_NAMES.has(base)) return true;
  if (EXCLUDED_EXTS.has(path.extname(base))) return true;
  if (base.endsWith('.zip')) return true;
  return false;
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full);
    if (shouldSkip(rel)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(full, base));
    else if (stat.isFile()) out.push({ full, rel: rel.split(path.sep).join('/') });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function dosTime(date = new Date()) {
  const y = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((y - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }

fs.mkdirSync(outDir, { recursive: true });
const files = listFiles(root);
const chunks = [];
const central = [];
let offset = 0;
for (const f of files) {
  const data = fs.readFileSync(f.full);
  const name = Buffer.from(f.rel);
  const crc = crc32(data);
  const dt = dosTime(fs.statSync(f.full).mtime);
  const local = Buffer.concat([
    u32(0x04034b50), u16(20), u16(0), u16(0), u16(dt.time), u16(dt.day), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name,
  ]);
  chunks.push(local, data);
  central.push(Buffer.concat([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(dt.time), u16(dt.day), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
  ]));
  offset += local.length + data.length;
}
const centralStart = offset;
const centralBuf = Buffer.concat(central);
const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBuf.length), u32(centralStart), u16(0)]);
fs.writeFileSync(outFile, Buffer.concat([...chunks, centralBuf, end]));
console.log(`Created ${path.relative(root, outFile)} (${files.length} files, ${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB)`);
console.log('Excluded: node_modules, .git, .playwright-cli, output, dist-upload, .DS_Store, *.log, existing *.zip');
