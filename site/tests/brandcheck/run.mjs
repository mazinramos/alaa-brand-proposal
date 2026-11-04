import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { scan } from './scan.mjs';

const SITE_ROOT = path.resolve(import.meta.dirname, '..', '..');

function parseArgs(argv) {
  const o = { max: 200 };
  for (const a of argv) {
    if (a === '--no-dist') o.noDist = true;
    else if (a === '--all') o.max = Infinity;
    else if (a === '--summary') o.max = 0;
    else if (a.startsWith('--max=')) o.max = Number(a.split('=')[1]);
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
    else if (a.startsWith('--root=')) o.root = path.resolve(a.split('=')[1]);
    else { console.error(`خيار غير معروف: ${a}`); process.exit(2); }
  }
  return o;
}

const cell = (s) => String(s).replace(/\|/g, '\\|');
const count = (arr, key) => arr.reduce((m, x) => m.set(key(x), (m.get(key(x)) || 0) + 1), new Map());
const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);

export function format(result, { max = 200, noDist = false } = {}) {
  const L = [];
  const f = result.findings;
  L.push('# نتيجة فحص الهوية (brandcheck)');
  L.push('');
  L.push(`- ملفات المصدر والمخرجات المفحوصة: ${result.filesScanned} (تُركت ${result.skipped} ثنائية أو كبيرة)`);
  L.push(`- فحص dist: ${result.distScanned ? 'نعم' : noDist ? 'لا (--no-dist)' : 'لا (غير موجود، شغّل npm run build أولاً)'}`);
  L.push(`- النتائج (أخطاء): **${f.length}**${f.length ? '' : ' ✓ نظيف'}`);

  if (f.length) {
    L.push('', '## ملخص حسب النمط', '', '| النمط | العدد |', '|---|---|');
    const byLabel = count(f, (x) => `${x.label} (${x.patternId})`);
    for (const [k, n] of sorted(byLabel)) L.push(`| ${cell(k)} | ${n} |`);

    L.push('', '## ملخص حسب النطاق', '', '| النطاق | العدد |', '|---|---|');
    for (const [k, n] of sorted(count(f, (x) => x.scope))) L.push(`| ${k} | ${n} |`);

    L.push('', '## أكثر الملفات نتائج', '', '| الملف | العدد |', '|---|---|');
    for (const [k, n] of sorted(count(f, (x) => x.file)).slice(0, 15)) L.push(`| ${cell(k)} | ${n} |`);

    if (max > 0) {
      L.push('', '## التفاصيل', '', '| الملف | السطر:العمود | النمط | النص المطابق |', '|---|---|---|---|');
      for (const x of f.slice(0, max)) L.push(`| ${cell(x.file)} | ${x.line}:${x.col} | ${cell(x.patternId)} | ${cell(x.text)} |`);
      if (f.length > max) L.push('', `(عُرض ${max} من ${f.length}. استعمل --all أو --out=ملف لعرض الكل)`);
    }
  }

  L.push('', '## تحذيرات (لا تؤثر على رمز الخروج)', '');
  const ph = result.placeholders;
  L.push(`### الرموز المؤقتة المتبقية (ALAA_*): ${ph.length}`);
  if (ph.length) {
    L.push('', '| الرمز | العدد | المواضع (أول 5) |', '|---|---|---|');
    for (const [tok, n] of sorted(count(ph, (x) => x.token))) {
      const where = ph.filter((x) => x.token === tok).slice(0, 5).map((x) => `${x.file}:${x.line}`).join('، ');
      L.push(`| ${tok} | ${n} | ${cell(where)} |`);
    }
  } else {
    L.push('', 'لا توجد رموز مؤقتة.');
  }
  const ex = result.externalImages;
  L.push('', `### روابط صور خارجية (Unsplash): ${ex.length}`);
  if (ex.length) {
    L.push('', '| الملف | السطر |', '|---|---|');
    for (const x of ex.slice(0, 10)) L.push(`| ${cell(x.file)} | ${x.line} |`);
    if (ex.length > 10) L.push('', `(و${ex.length - 10} أخرى)`);
  }
  L.push('');
  return L.join('\n');
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const o = parseArgs(process.argv.slice(2));
  const result = scan({ root: o.root ?? SITE_ROOT, includeDist: !o.noDist });
  if (o.out) {
    writeFileSync(o.out, format(result, { max: Infinity }), 'utf8');
    console.log(`كُتب التقرير الكامل في ${o.out}`);
  }
  console.log(format(result, { max: o.max, noDist: o.noDist }));
  if (result.findings.length) {
    console.error(`\nفشل الفحص: ${result.findings.length} نتيجة تخص الهوية القديمة.`);
    process.exit(1);
  }
  console.log('نجح الفحص: لا أثر للهوية القديمة.');
}
