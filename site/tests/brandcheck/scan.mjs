import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { EXTERNAL_IMAGE_RE, PATTERNS, PLACEHOLDER_RE } from './patterns.mjs';

// استثناءات مؤقتة (نسبة إلى جذر site/). تُقلَّص في التنظيف النهائي (مهمة 5).
// مجلد الأداة نفسها مستثنى صراحة.
export const EXCLUDED_DIRS = ['node_modules', 'dist', 'legacy', 'tests/parity', 'tests/brandcheck', 'tasks', '.git'];
export const EXCLUDED_FILES = ['MIGRATION.md', 'REBRAND.md', 'package-lock.json'];

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.pdf', '.zip', '.gz', '.mp4', '.mp3']);
const MAX_BYTES = 10 * 1024 * 1024;

const toPosix = (p) => p.split(path.sep).join('/');

function isExcluded(rel) {
  if (EXCLUDED_FILES.includes(rel)) return true;
  return EXCLUDED_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
}

function walk(root, dir = root, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === '.git' || name.name === 'node_modules') continue;
      walk(root, full, out);
    } else if (name.isFile()) {
      out.push(toPosix(path.relative(root, full)));
    }
  }
  return out;
}

// الملفات المتتبَّعة وغير المتتبَّعة (غير المتجاهَلة) عبر git، وإلا مشي عادي مع تجاهل .env*.
function listSourceFiles(root) {
  try {
    const raw = execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z'], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    const files = raw.toString('utf8').split('\0').filter(Boolean);
    if (files.length) return { files, via: 'git' };
  } catch {
    /* ليس مستودع git */
  }
  return { files: walk(root).filter((f) => !path.basename(f).startsWith('.env')), via: 'walk' };
}

function readText(full) {
  const ext = path.extname(full).toLowerCase();
  if (BINARY_EXT.has(ext)) return null;
  let st;
  try { st = statSync(full); } catch { return null; }
  if (!st.isFile() || st.size > MAX_BYTES) return null;
  const buf = readFileSync(full);
  if (buf.subarray(0, 8000).includes(0)) return null;
  return buf.toString('utf8');
}

function snippet(line, start, end) {
  const pre = line.slice(Math.max(0, start - 20), start);
  const mid = line.slice(start, end);
  const post = line.slice(end, end + 20);
  const text = `${pre}«${mid.length > 70 ? mid.slice(0, 70) + '…' : mid}»${post}`;
  return text.replace(/\s+/g, ' ');
}

function scanLine(line) {
  const hits = [];
  PATTERNS.forEach((p, order) => {
    p.re.lastIndex = 0;
    for (const m of line.matchAll(p.re)) {
      if (p.filter && !p.filter(m[0], m[1], line, m[2])) continue;
      hits.push({ p, order, start: m.index, end: m.index + m[0].length });
    }
  });
  // تداخل داخل نفس المجموعة: نبقي الأطول فقط
  hits.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.order - b.order);
  const kept = [];
  for (const h of hits) {
    const dup = h.p.group && kept.some((k) => k.p.group === h.p.group && h.start >= k.start && h.end <= k.end);
    if (!dup) kept.push(h);
  }
  return kept.sort((a, b) => a.start - b.start);
}

function scanFile(full, rel, scope, result) {
  const text = readText(full);
  if (text === null) { result.skipped++; return; }
  result.filesScanned++;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line) return;
    for (const h of scanLine(line)) {
      result.findings.push({
        scope, file: rel, line: i + 1, col: h.start + 1,
        patternId: h.p.id, label: h.p.label, text: snippet(line, h.start, h.end),
      });
    }
    for (const m of line.matchAll(PLACEHOLDER_RE)) {
      result.placeholders.push({ scope, file: rel, line: i + 1, token: m[0] });
    }
    if (EXTERNAL_IMAGE_RE.test(line)) {
      result.externalImages.push({ scope, file: rel, line: i + 1, text: snippet(line, line.search(EXTERNAL_IMAGE_RE), line.search(EXTERNAL_IMAGE_RE) + 20) });
    }
    EXTERNAL_IMAGE_RE.lastIndex = 0;
  });
}

/** يفحص ملفات المصدر (مع الاستثناءات) ثم dist (بدون استثناءات) لو موجودة. */
export function scan({ root, includeDist = true }) {
  const result = { root, findings: [], placeholders: [], externalImages: [], filesScanned: 0, skipped: 0, distScanned: false, listedVia: '' };
  const { files, via } = listSourceFiles(root);
  result.listedVia = via;
  for (const rel of files.sort()) {
    if (isExcluded(rel)) continue;
    const full = path.join(root, rel);
    if (!existsSync(full)) continue;
    scanFile(full, rel, 'مصدر', result);
  }
  const dist = path.join(root, 'dist');
  if (includeDist && existsSync(dist) && statSync(dist).isDirectory()) {
    result.distScanned = true;
    for (const rel of walk(dist).sort()) scanFile(path.join(dist, rel), 'dist/' + rel, 'dist', result);
  }
  return result;
}
