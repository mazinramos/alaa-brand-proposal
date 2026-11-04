import fs from 'node:fs/promises';
import path from 'node:path';

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const mark = (c) => (c.pass ? '✓' : '✗');

export async function writeReport({ outDir, mode, tolerance, rows, notes, startedAt }) {
  const rel = (p) => (p ? path.relative(outDir, p).split(path.sep).join('/') : '');
  const lines = [];
  const failedRows = rows.filter((r) => !r.pass);

  lines.push('# تقرير مطابقة الموقع (Parity)');
  lines.push('');
  lines.push(`- الوضع: ${mode}`);
  lines.push(`- التاريخ: ${startedAt.toISOString()}`);
  lines.push(`- تسامح البكسل: ${tolerance}% من مساحة الصفحة`);
  lines.push(`- النتيجة: ${failedRows.length === 0 ? 'نجاح كامل' : `فشل ${failedRows.length} من ${rows.length}`}`);
  lines.push('');
  lines.push('| الصفحة | المقاس | نسبة الاختلاف | نجاح/فشل | صورة الفرق | السبب |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.error) {
      lines.push(`| ${cell(r.title)} | ${r.viewport} | - | فشل | - | ${cell(r.error)} |`);
      continue;
    }
    const diff = r.checks.pixel.diffImage ? `[فرق](${rel(r.checks.pixel.diffImage)})` : '-';
    lines.push(
      `| ${cell(r.title)} | ${r.viewport} | ${r.checks.pixel.ratio.toFixed(3)}% | ${r.pass ? 'نجاح' : 'فشل'} | ${diff} | ${cell(r.reasons.join('؛ '))} |`
    );
  }

  lines.push('');
  lines.push('## تفصيل الفحوص');
  lines.push('');
  lines.push('| الصفحة | المقاس | البكسل | النص | العناصر | console | الشبكة | Tailwind |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.error) continue;
    const c = r.checks;
    lines.push(
      `| ${cell(r.title)} | ${r.viewport} | ${mark(c.pixel)} | ${mark(c.text)} | ${mark(c.elements)} | ${mark(c.console)} | ${mark(c.network)} | ${mark(c.tailwind)} |`
    );
  }

  const shots = rows.filter((r) => !r.error);
  if (shots.length) {
    lines.push('');
    lines.push('## اللقطات');
    lines.push('');
    for (const r of shots) {
      lines.push(`- ${r.title} ${r.viewport}: [الأصل](${rel(r.shotA)}) | [Vite](${rel(r.shotB)})`);
    }
  }

  for (const r of failedRows) {
    lines.push('');
    lines.push(`## تفاصيل الفشل: ${r.title} (${r.viewport})`);
    if (r.error) {
      lines.push('', r.error);
      continue;
    }
    const c = r.checks;
    const list = (title, arr) => {
      if (!arr || !arr.length) return;
      lines.push('', `${title}:`);
      for (const x of arr) lines.push(`- ${cell(x)}`);
    };
    if (!c.pixel.pass) lines.push('', `- البكسل: ${c.pixel.reason}`);
    if (!c.elements.pass) lines.push('', `- العناصر: ${c.elements.reason}`);
    if (!c.text.pass) {
      list('أسطر موجودة في الأصل فقط (أول 8)', c.text.onlyA);
      list('أسطر موجودة في Vite فقط (أول 8)', c.text.onlyB);
    }
    if (!c.console.pass) list('أخطاء console جديدة في Vite', c.console.onlyB);
    if (!c.network.pass) list('طلبات فاشلة جديدة في Vite', c.network.onlyB);
    if (!c.tailwind.pass) list(`كلاسات بلا قاعدة CSS في Vite (${c.tailwind.missingCount})`, c.tailwind.missing);
  }

  const withNotes = rows.filter((r) => (r.notesA && r.notesA.length) || (r.notesB && r.notesB.length));
  if (withNotes.length || (notes && notes.length)) {
    lines.push('', '## ملاحظات التشغيل', '');
    for (const n of notes || []) lines.push(`- ${cell(n)}`);
    for (const r of withNotes) {
      for (const n of r.notesA || []) lines.push(`- ${r.title} ${r.viewport} (الأصل): ${cell(n)}`);
      for (const n of r.notesB || []) lines.push(`- ${r.title} ${r.viewport} (Vite): ${cell(n)}`);
    }
  }

  lines.push('', '## حدود الفحص', '');
  lines.push('- يفحص حالة الصفحة الأولية فقط، وليس الحالات الناتجة عن تفاعلات (نوافذ، سلة، تبويبات المتجر).');
  lines.push('- كلاسات Font Awesome وخطوط Google من نطاق آخر ولا تُقرأ قواعدها، فتظهر في "بلا قاعدة في الجهتين" وهي لا تُحسب فشلاً.');
  lines.push('- البيانات حيّة من Firestore: تغيّر البيانات بين لقطة الأصل ولقطة Vite قد يعطي اختلافاً كاذباً، فأعد التشغيل للتأكد.');
  lines.push('');

  await fs.mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'report.md');
  await fs.writeFile(reportPath, lines.join('\n'), 'utf8');
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(rows, null, 2), 'utf8');
  return reportPath;
}
