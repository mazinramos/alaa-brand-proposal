// فحص ذاتي: ملفات تجريبية فيها كل نمط، وملف نظيف، واستثناءات المجلدات، ونطاق dist.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scan } from './scan.mjs';
import { PATTERNS } from './patterns.mjs';

const j = (...p) => p.join('');
const OLD = j('wish', 'ly');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'brandcheck-'));
const put = (rel, text) => {
  const f = path.join(tmp, rel);
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, text, 'utf8');
};

// نص عيّنة لكل نمط (يجب أن يكتشفه النمط المحدد)
const SAMPLES = {
  'old-name-en': `<title>${j('Wish', 'ly')} Store</title>`,
  'old-name-ar': 'متجر وشلي للهدايا',
  'old-name-file': `a.download = '${OLD}-orders.csv';`,
  'old-email-domain': `mail: info@${OLD}-atelier.org`,
  'old-instagram': `https://instagram.com/${j(OLD, 'gift.favors')}`,
  'old-tiktok': `https://tiktok.com/@${j(OLD, '.sd')}`,
  'old-firebase-a': `projectId: "${j(OLD, '-82ae9')}"`,
  'old-firebase-b': `authDomain: "${j('twins', '-30485')}.firebaseapp.com"`,
  'phone-intl': `tel ${j('2499', '04298584')}`,
  'phone-local': `tel ${j('0904', '298584')}`,
  'phone-core': `n=${j('904', '298584')};`,
  'phone-spaced': `tel +${j('249 90 4', '29 8584')}`,
  'google-verification': '<meta name="google-site-verification" content="x">',
  'google-verification-value': j('IH_dYUXH_BQW7TR7uUDlCoLQvJy0kQdNy503aX', 'l8W8w'),
  'wa-link': 'https://wa.me/249123456789?text=hi',
  'wa-send-link': 'https://api.whatsapp.com/send?phone=249123456789',
  'google-api-key': j('key=AI', 'zaSyA1234567890abcdefghijklmnopqrstu'),
  'api-key-literal': 'const c = { apiKey: "abc123" };',
  'any-email': 'contact: someone@example.com',
};

let bad = 0;
const expect = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) bad++; };

try {
  // 1) كل نمط له عيّنة
  const ids = PATTERNS.map((p) => p.id);
  expect(ids.every((id) => SAMPLES[id]), 'كل نمط له عيّنة اختبار');
  Object.entries(SAMPLES).forEach(([id, text], i) => put(`src/sample-${i}.txt`, text + '\n'));

  // 2) ملف نظيف: رموز مؤقتة وروابط مسموحة وأسماء ملفات صور
  put('src/clean.js', [
    "import { brand } from './brand.js';",
    "const a = `https://wa.me/${brand.whatsapp}`;",
    "const b = 'https://wa.me/ALAA_WHATSAPP_NUMBER';",
    "const c = brand.email; // ALAA_EMAIL",
    "const img = 'hero@2x.png';",
    "const d = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY };",
    "const n = 1234567890123;",
    'const ph = "ALAA_INSTAGRAM_HANDLE ALAA_TIKTOK_HANDLE";',
    '',
  ].join('\n'));

  // 3) مجلدات مستثناة وملفات مستثناة (يجب ألا تُفحص)
  for (const d of ['legacy', 'tests/parity', 'tests/brandcheck', 'tasks', 'node_modules/x']) put(`${d}/f.txt`, `${OLD}\n`);
  for (const f of ['MIGRATION.md', 'REBRAND.md', 'package-lock.json']) put(f, `${OLD}\n`);
  put('.env.local', `VITE_X=${j('twins', '-30485')}\n`);

  // 4) dist بدون استثناءات
  put('dist/assets/app.js', `var s="${j('Wish', 'ly')}";\n`);

  const r = scan({ root: tmp, includeDist: true });
  const foundIds = new Set(r.findings.filter((x) => x.scope === 'مصدر').map((x) => x.patternId));
  for (const id of ids) expect(foundIds.has(id), `يكتشف النمط ${id}`);

  const inFile = (f) => r.findings.filter((x) => x.file === f).length;
  expect(inFile('src/clean.js') === 0, 'الملف النظيف يمر (رموز مؤقتة، brand، icon@2x.png)');
  const ph = new Set(r.placeholders.map((x) => x.token));
  expect(['ALAA_WHATSAPP_NUMBER', 'ALAA_EMAIL', 'ALAA_INSTAGRAM_HANDLE', 'ALAA_TIKTOK_HANDLE'].every((t) => ph.has(t)), 'تقرير الرموز المؤقتة يعدّها');
  const excludedHit = r.findings.filter((x) => /^(legacy|tests\/|tasks|node_modules|MIGRATION|REBRAND|package-lock|\.env)/.test(x.file));
  expect(excludedHit.length === 0, 'المجلدات والملفات المستثناة (وملفات .env) لا تُفحص');
  expect(r.findings.some((x) => x.scope === 'dist' && x.file === 'dist/assets/app.js'), 'مخرجات dist تُفحص');

  // 5) رموز الخروج: فحص جذر نظيف
  const clean = mkdtempSync(path.join(os.tmpdir(), 'brandcheck-clean-'));
  writeFileSync(path.join(clean, 'index.html'), '<title>Alaa Mahjob</title><a href="https://wa.me/ALAA_WHATSAPP_NUMBER">x</a>\n');
  const rc = scan({ root: clean, includeDist: true });
  expect(rc.findings.length === 0, 'مشروع نظيف بالكامل: صفر نتائج');
  rmSync(clean, { recursive: true, force: true });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(bad ? 1 : 0);
