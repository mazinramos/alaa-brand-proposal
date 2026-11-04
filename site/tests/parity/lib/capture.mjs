import fs from 'node:fs/promises';
import path from 'node:path';
import { substituteRedacted } from './env.mjs';

const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;animation-delay:0s!important;transition:none!important;' +
  'transition-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important}';

// وقت ثابت لتجميد Date (العدّ التنازلي في المتجر مثلاً) حتى لا تظهر اختلافات كاذبة.
const FIXED_NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

function initScript(freezeTime) {
  return `(() => {
    const si = window.setInterval.bind(window);
    // المؤقتات الطويلة (مثل تدوير التقييمات كل 6 ثوانٍ) تُعطَّل أثناء الفحص في الجهتين.
    window.setInterval = (fn, ms, ...rest) => (ms >= 3000 ? 0 : si(fn, ms, ...rest));
    ${
      freezeTime
        ? `const FIXED = ${FIXED_NOW}; const RD = Date;
    class FD extends RD { constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); } static now() { return FIXED; } }
    window.Date = FD;`
        : ''
    }
  })();`;
}

const isHtmlPath = (p) => p.endsWith('.html') || p.endsWith('/');

function normMsg(text, origins) {
  let t = String(text);
  for (const o of origins) t = t.split(o).join('<origin>');
  return t.replace(/:\d+:\d+/g, '').replace(/\s+/g, ' ').trim();
}

function normReq(url, origins) {
  try {
    const u = new URL(url);
    const origin = origins.includes(u.origin) ? '<origin>' : u.origin;
    return origin + u.pathname;
  } catch {
    return url;
  }
}

async function waitDomStable(page, quiet = 1000, max = 10000) {
  // نعتبر الصفحة مستقرة لما تتوقف إضافة/حذف العناصر (تحديث النص فقط، مثل العدّاد، لا يُحسب).
  await page.evaluate(
    ({ quiet, max }) =>
      new Promise((resolve) => {
        let t;
        const finish = () => {
          obs.disconnect();
          clearTimeout(t);
          clearTimeout(cap);
          resolve();
        };
        const obs = new MutationObserver((muts) => {
          const structural = muts.some(
            (m) => [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1)
          );
          if (structural) {
            clearTimeout(t);
            t = setTimeout(finish, quiet);
          }
        });
        obs.observe(document.documentElement, { subtree: true, childList: true });
        t = setTimeout(finish, quiet);
        const cap = setTimeout(finish, max);
      }),
    { quiet, max }
  );
}

async function scrollThrough(page) {
  // تمرير الصفحة لتفعيل IntersectionObserver (reveal) والصور الكسولة، ثم الرجوع للأعلى.
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let i = 0; i < 80; i++) {
      const before = window.scrollY;
      window.scrollBy(0, step);
      await wait(120);
      if (window.scrollY === before || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight) break;
    }
    await wait(300);
    window.scrollTo(0, 0);
    await wait(300);
  });
}

async function waitImages(page) {
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
              setTimeout(r, 8000);
            })
      )
    );
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
    const text = document.body.innerText
      .replace(/\r/g, '')
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const elementCount = [...document.body.querySelectorAll('*')].filter((e) => !skip.has(e.tagName)).length;

    // كل الكلاسات المستعملة في الـ DOM، ومنها ما له قاعدة CSS فعلية في أوراق الأنماط المقروءة.
    const selectors = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // ورقة من نطاق آخر (خطوط، Font Awesome): لا تُقرأ
      }
      const walk = (rs) => {
        for (const r of rs) {
          if (r.selectorText) selectors.push(r.selectorText);
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(rules);
    }
    const idRe = /\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w\u00A0-\uFFFF-])+)/g;
    const known = new Set();
    for (const s of selectors) for (const m of s.matchAll(idRe)) known.add(m[1]);

    const tokens = new Set();
    for (const el of document.querySelectorAll('html, html *')) {
      if (skip.has(el.tagName)) continue;
      const c = el.getAttribute('class');
      if (c) c.split(/\s+/).filter(Boolean).forEach((t) => tokens.add(t));
    }
    const list = [...tokens].sort();
    const withRule = list.filter((t) => known.has(CSS.escape(t)));
    return { text, elementCount, tokens: list, withRule };
  });
}

/**
 * يفتح سياقاً جديداً ويحمّل الصفحة ويجمع الأخطاء. يرجع كائناً فيه page وbucket للأخطاء.
 */
async function openSession({ browser, side, viewport, env, freezeTime }) {
  const ctx = await browser.newContext({
    viewport: { width: viewport, height: 900 },
    deviceScaleFactor: 1,
    timezoneId: 'UTC',
    locale: 'en-US',
    colorScheme: 'light',
    serviceWorkers: 'block',
  });
  await ctx.addInitScript({ content: initScript(freezeTime) });
  if (side.rewrite) {
    await ctx.route(
      (u) => u.origin === side.origin && isHtmlPath(u.pathname),
      async (route) => {
        const resp = await route.fetch();
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('text/html')) return route.fulfill({ response: resp });
        const body = substituteRedacted(await resp.text(), env);
        await route.fulfill({ response: resp, body });
      }
    );
  }
  const page = await ctx.newPage();
  const origins = [side.origin];
  const bucket = { consoleErrors: [], failedRequests: [], notes: [], firestoreSeen: false };
  page.on('console', (m) => {
    if (m.type() === 'error') bucket.consoleErrors.push(normMsg(m.text(), origins));
  });
  page.on('pageerror', (e) => bucket.consoleErrors.push('pageerror: ' + normMsg(e.message, origins)));
  page.on('requestfailed', (r) => {
    const reason = r.failure()?.errorText || '';
    if (reason.includes('ERR_ABORTED')) return; // إلغاء طبيعي (قنوات Firestore)
    bucket.failedRequests.push(`${r.method()} ${normReq(r.url(), origins)} [${reason}]`);
  });
  page.on('response', (r) => {
    if (r.url().includes('firestore.googleapis.com')) bucket.firestoreSeen = true;
    if (r.status() >= 400) bucket.failedRequests.push(`${r.status()} ${normReq(r.url(), origins)}`);
  });
  return { ctx, page, bucket };
}

async function load(page, bucket, url, pageDef) {
  let resp;
  try {
    resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  } catch (e) {
    throw new Error(`فشل تحميل ${url}: ${e.message.split('\n')[0]}`);
  }
  if (!resp || resp.status() >= 400) {
    throw new Error(`فشل تحميل ${url}: حالة الاستجابة ${resp ? resp.status() : 'بدون استجابة'}`);
  }
  if (pageDef.waitSelector) {
    await page
      .waitForSelector(pageDef.waitSelector, { state: 'visible', timeout: 10000 })
      .catch(() => bucket.notes.push(`العنصر ${pageDef.waitSelector} لم يظهر خلال 10 ثوانٍ`));
  }
  await page
    .waitForLoadState('networkidle', { timeout: 15000 })
    .catch(() => bucket.notes.push('الشبكة لم تهدأ خلال 15 ثانية (اتصال Firestore المفتوح أمر طبيعي)'));
  if (pageDef.expectFirestore) {
    const t0 = Date.now();
    while (!bucket.firestoreSeen && Date.now() - t0 < 15000) await page.waitForTimeout(250);
    if (!bucket.firestoreSeen) bucket.notes.push('لم يظهر أي طلب إلى Firestore');
  }
}

async function settle(page) {
  await page.addStyleTag({ content: FREEZE_CSS });
  await waitDomStable(page);
  await scrollThrough(page);
  await waitDomStable(page, 600, 6000);
  await waitImages(page);
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.waitForTimeout(300);
}

async function snapshot(page, bucket, shotPath) {
  await fs.mkdir(path.dirname(shotPath), { recursive: true });
  await page.screenshot({ path: shotPath, fullPage: true, animations: 'disabled', caret: 'hide' });
  const m = await collectMetrics(page);
  return {
    ok: true,
    screenshot: shotPath,
    text: m.text,
    elementCount: m.elementCount,
    tokens: m.tokens,
    withRule: m.withRule,
    consoleErrors: [...bucket.consoleErrors],
    failedRequests: [...bucket.failedRequests],
    notes: [...bucket.notes],
    firestoreSeen: bucket.firestoreSeen,
  };
}

/** يلتقط صفحة واحدة بمقاس واحد من جهة واحدة. لا يرمي خطأ: يرجع {ok:false,error}. */
export async function capturePage({ browser, side, pageDef, viewport, env, shotPath, noFreeze }) {
  const { ctx, page, bucket } = await openSession({
    browser, side, viewport, env, freezeTime: pageDef.freezeTime && !noFreeze,
  });
  try {
    await load(page, bucket, side.origin + pageDef.paths[side.pathKey], pageDef);
    await settle(page);
    return await snapshot(page, bucket, shotPath);
  } catch (e) {
    return { ok: false, error: e.message, notes: [...bucket.notes], firestoreSeen: bucket.firestoreSeen };
  } finally {
    await ctx.close();
  }
}

/**
 * اختياري (للقراءة فقط): يدخل اللوحة ثم يلتقط كل تبويب.
 * الضغطات الوحيدة المسموحة: زر الدخول، وأزرار التنقل داخل #adminNav (data-act="goTab").
 * لا يُضغط أي زر حفظ أو حذف أو إتمام.
 */
export async function captureAdminTabs({ browser, side, viewport, env, shotDir, pageDef }) {
  const { ctx, page, bucket } = await openSession({ browser, side, viewport, env, freezeTime: false });
  const results = {};
  try {
    await load(page, bucket, side.origin + pageDef.paths[side.pathKey], pageDef);
    await page.fill('#loginEmail', env.TEST_ADMIN_EMAIL);
    await page.fill('#loginPassword', env.TEST_ADMIN_PASSWORD);
    await page.click('#loginSubmitBtn');
    await page.waitForSelector('#adminNav [data-act="goTab"][data-tab]', { state: 'attached', timeout: 25000 });
    await settle(page);
    const keys = await page.$$eval('#adminNav [data-act="goTab"][data-tab]', (bs) => bs.map((b) => b.dataset.tab));
    for (const key of keys) {
      bucket.consoleErrors.length = 0;
      bucket.failedRequests.length = 0;
      // dispatchEvent لأن الشريط الجانبي على الجوال خارج الشاشة. التنقل فقط، بدون أي كتابة.
      await page.dispatchEvent(`#adminNav [data-act="goTab"][data-tab="${key}"]`, 'click');
      await settle(page);
      results[key] = await snapshot(page, bucket, path.join(shotDir, `admin-tab-${key}-${viewport}-${side.label}.png`));
    }
    return { ok: true, tabs: results };
  } catch (e) {
    return { ok: false, error: e.message, tabs: results };
  } finally {
    await ctx.close();
  }
}
