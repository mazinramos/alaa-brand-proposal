// فحص ذاتي لأداة المطابقة بدون إنترنت: صفحات تجريبية محلية.
// المتوقع: (أ) نفس الصفحة مقابل نفسها تنجح. (ب) صفحة مختلفة عمداً تفشل في كل الفحوص.
import path from 'node:path';
import { runParity } from './run.mjs';
import { FIREBASE_KEYS } from './lib/env.mjs';

const here = import.meta.dirname;
const env = Object.fromEntries(Object.values(FIREBASE_KEYS).map((k) => [k, 'selftest-' + k.toLowerCase()]));
env.VITE_FIREBASE_PROJECT_ID = 'selftest-project';
const pages = [
  { id: 'fixture', title: 'صفحة تجريبية', paths: { legacy: '/page.html', vite: '/page.html' }, expectFirestore: false, freezeTime: false, waitSelector: null },
];
const base = { env, pages, viewports: [390, 1366], noAdmin: true, legacyDir: path.join(here, 'fixtures/a') };

let bad = 0;
const expect = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) bad++; };

console.log('--- (أ) نفس الصفحة مقابل نفسها ---');
const same = await runParity({ ...base, self: true, outDir: path.join(here, 'output/selftest-same') });
expect(same.ok, 'الصفحة المطابقة تنجح في كل الفحوص');
expect(same.rows.every((r) => r.a.elementCount === r.b.elementCount && r.a.elementCount > 0), 'عدد العناصر محسوب ومتطابق');

console.log('--- (ب) صفحة مختلفة عمداً ---');
const diff = await runParity({ ...base, sideBDir: path.join(here, 'fixtures/b'), modeLabel: 'اختبار ذاتي: اختلاف متعمّد', outDir: path.join(here, 'output/selftest-diff') });
expect(!diff.ok, 'الصفحة المختلفة تفشل');
const checks = diff.rows.map((r) => r.checks);
for (const name of ['pixel', 'text', 'elements', 'console', 'network', 'tailwind']) {
  expect(checks.every((c) => !c[name].pass), `فحص "${name}" يكشف الاختلاف في كل المقاسات`);
}
expect(diff.rows.every((r) => r.checks.pixel.diffImage), 'صور الفرق تُولَّد');

process.exit(bad ? 1 : 0);
