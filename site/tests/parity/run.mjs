import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { SetupError, assertEnvCoversRedacted, loadEnvFile } from './lib/env.mjs';
import { buildVite, startStaticServer, startVite } from './lib/servers.mjs';
import { captureAdminTabs, capturePage } from './lib/capture.mjs';
import { compareCaptures, pixelDiff } from './lib/compare.mjs';
import { writeReport } from './lib/report.mjs';
import { ADMIN_PAGE, PAGES, VIEWPORTS } from './pages.mjs';

const SITE_ROOT = path.resolve(import.meta.dirname, '..', '..');
const log = (...a) => console.log(...a);

function parseArgs(argv) {
  const o = {};
  for (const a of argv) {
    if (a === '--self') o.self = true;
    else if (a === '--dev') o.dev = true;
    else if (a === '--skip-build') o.skipBuild = true;
    else if (a === '--no-freeze') o.noFreeze = true;
    else if (a === '--no-admin') o.noAdmin = true;
    else if (a.startsWith('--tolerance=')) o.tolerance = Number(a.split('=')[1]);
    else if (a.startsWith('--pages=')) o.pageIds = a.split('=')[1].split(',');
    else if (a.startsWith('--viewports=')) o.viewports = a.split('=')[1].split(',').map(Number);
    else throw new SetupError(`خيار غير معروف: ${a}`);
  }
  return o;
}

async function launchBrowser() {
  const args = (process.env.PARITY_BROWSER_ARGS || '').split(' ').filter(Boolean);
  const executablePath = process.env.PARITY_CHROMIUM_PATH || undefined;
  try {
    return await chromium.launch({ headless: true, executablePath, args });
  } catch (e) {
    throw new SetupError(
      'تعذر تشغيل المتصفح (Chromium).\nالحل: شغّل مرة واحدة: npx playwright install chromium\n' +
        `(تفاصيل: ${e.message.split('\n')[0]})`
    );
  }
}

const slim = (c) => ({ ...c, text: undefined, tokens: undefined, withRule: undefined });

/**
 * options: self, dev, skipBuild, noFreeze, noAdmin, tolerance, pageIds, viewports, outDir,
 *          env, pages, legacyDir, sideBDir (اختبار ذاتي: خادم ثابت بدل Vite), modeLabel, quiet
 */
export async function runParity(options = {}) {
  const startedAt = new Date();
  const o = {
    tolerance: 0.2,
    viewports: VIEWPORTS,
    pages: PAGES,
    siteRoot: SITE_ROOT,
    legacyDir: path.join(SITE_ROOT, 'legacy'),
    outDir: path.join(SITE_ROOT, 'tests', 'parity', 'output'),
    ...options,
  };
  let pages = o.pages;
  if (o.pageIds) {
    pages = pages.filter((p) => o.pageIds.includes(p.id));
    if (!pages.length) throw new SetupError(`لا توجد صفحة بهذا الاسم: ${o.pageIds.join(',')}`);
  }

  // 1) إعداد البيئة والتحقق من قيم Firebase قبل تشغيل أي شي
  const env = o.env ?? loadEnvFile(o.siteRoot);
  assertEnvCoversRedacted(
    pages.map((p) => path.join(o.legacyDir, p.paths.legacy)),
    env
  );

  const closers = [];
  let browser;
  try {
    // 2) الخوادم
    const legacy = await startStaticServer(o.legacyDir);
    closers.push(legacy.close);
    const sideA = { label: 'legacy', origin: legacy.origin, rewrite: true, pathKey: 'legacy' };
    let sideB;
    let mode;
    if (o.self) {
      sideB = { ...sideA, label: 'legacy2' };
      mode = 'الأصل مقابل نفسه (المتوقع: نجاح كامل)';
    } else if (o.sideBDir) {
      const b = await startStaticServer(o.sideBDir);
      closers.push(b.close);
      sideB = { label: 'vite', origin: b.origin, rewrite: true, pathKey: 'legacy' };
      mode = o.modeLabel || 'الأصل مقابل مجلد اختبار';
    } else {
      if (!o.skipBuild && !o.dev) {
        log('بناء Vite (vite build)...');
        await buildVite(o.siteRoot);
      }
      log(o.dev ? 'تشغيل vite dev...' : 'تشغيل vite preview...');
      const v = await startVite(o.siteRoot, { dev: o.dev });
      closers.push(v.close);
      sideB = { label: 'vite', origin: v.origin, rewrite: false, pathKey: 'vite' };
      mode = 'الأصل مقابل Vite';
    }

    // 3) المتصفح
    browser = await launchBrowser();
    const shotDir = path.join(o.outDir, 'screenshots');
    const diffDir = path.join(o.outDir, 'diffs');
    const rows = [];

    const cap = (side, pageDef, viewport) =>
      capturePage({
        browser, side, pageDef, viewport, env, noFreeze: o.noFreeze,
        shotPath: path.join(shotDir, `${pageDef.id}-${viewport}-${side.label}.png`),
      });

    const finish = (title, viewport, id, A, B, diffName) => (async () => {
      const pixel = await pixelDiff(browser, A.screenshot, B.screenshot, path.join(diffDir, diffName));
      const cmp = compareCaptures(A, B, pixel, o.tolerance);
      const row = {
        id, title, viewport, pass: cmp.pass, reasons: cmp.reasons, checks: cmp.checks,
        shotA: A.screenshot, shotB: B.screenshot, notesA: A.notes, notesB: B.notes,
        a: slim(A), b: slim(B),
      };
      rows.push(row);
      log(`${cmp.pass ? '✓' : '✗'} ${title} ${viewport}px  اختلاف ${pixel.ratio.toFixed(3)}%`);
    })();

    for (const pageDef of pages) {
      for (const viewport of o.viewports) {
        const A = await cap(sideA, pageDef, viewport);
        if (!A.ok) {
          throw new SetupError(`فشل تحميل الأصل (${pageDef.title} ${viewport}px):\n${A.error}\nتحقق من قيم .env.local ومن الاتصال بالإنترنت (الأصل يحمّل مكتبات من CDN).`);
        }
        if (pageDef.expectFirestore && !A.firestoreSeen) {
          throw new SetupError(
            `الأصل لم يتصل بـ Firestore (${pageDef.title} ${viewport}px). غالباً قيم Firebase في .env.local غير صحيحة أو لا يوجد اتصال إنترنت.`
          );
        }
        const B = await cap(sideB, pageDef, viewport);
        if (!B.ok) {
          rows.push({ id: pageDef.id, title: pageDef.title, viewport, pass: false, error: B.error, reasons: [B.error] });
          log(`✗ ${pageDef.title} ${viewport}px  ${B.error}`);
          continue;
        }
        await finish(pageDef.title, viewport, pageDef.id, A, B, `${pageDef.id}-${viewport}.png`);
      }
    }

    // 4) اختياري: تبويبات اللوحة بعد الدخول (قراءة فقط)
    const notes = [];
    const adminOn = !o.noAdmin && env.TEST_ADMIN_EMAIL && env.TEST_ADMIN_PASSWORD && pages.includes(ADMIN_PAGE);
    if (adminOn) {
      for (const viewport of o.viewports) {
        const A = await captureAdminTabs({ browser, side: sideA, viewport, env, shotDir, pageDef: ADMIN_PAGE });
        const B = await captureAdminTabs({ browser, side: sideB, viewport, env, shotDir, pageDef: ADMIN_PAGE });
        if (!A.ok) {
          notes.push(`تبويبات اللوحة ${viewport}px: فشل الدخول في الأصل: ${A.error}`);
          continue;
        }
        for (const [key, a] of Object.entries(A.tabs)) {
          const b = B.tabs[key];
          const title = `تبويب اللوحة: ${key}`;
          if (!b) {
            rows.push({ id: `admin-tab-${key}`, title, viewport, pass: false, error: B.error || 'التبويب غير موجود في Vite', reasons: ['التبويب غير موجود في Vite'] });
            log(`✗ ${title} ${viewport}px  غير موجود في Vite`);
            continue;
          }
          await finish(title, viewport, `admin-tab-${key}`, a, b, `admin-tab-${key}-${viewport}.png`);
        }
      }
    } else if (!o.noAdmin) {
      notes.push('تبويبات اللوحة لم تُفحص: أضف TEST_ADMIN_EMAIL وTEST_ADMIN_PASSWORD إلى .env.local لتفعيلها (اختياري).');
    }

    const reportPath = await writeReport({ outDir: o.outDir, mode, tolerance: o.tolerance, rows, notes, startedAt });
    const failed = rows.filter((r) => !r.pass).length;
    log(`\nالتقرير: ${path.relative(process.cwd(), reportPath)}`);
    log(failed === 0 ? 'النتيجة: نجاح كامل' : `النتيجة: فشل ${failed} من ${rows.length}`);
    return { rows, ok: failed === 0, reportPath };
  } finally {
    if (browser) await browser.close().catch(() => {});
    for (const close of closers.reverse()) await close().catch(() => {});
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  try {
    const result = await runParity(parseArgs(process.argv.slice(2)));
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    if (e instanceof SetupError) {
      console.error('\nتوقفت أداة المطابقة:\n' + e.message);
      process.exit(2);
    }
    console.error(e);
    process.exit(2);
  }
}
