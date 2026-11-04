import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * مقارنة بالبكسل بدون أي مكتبة إضافية: فك الصور ورسمها على canvas داخل Chromium نفسه.
 * معادلة الفرق اللوني هي نفسها في pixelmatch (YIQ)، والحد الافتراضي 0.1.
 * إذا اختلف الطول أو العرض تُحسب المنطقة الزائدة اختلافاً كاملاً.
 */
export async function pixelDiff(browser, fileA, fileB, diffPath, threshold = 0.1) {
  const [a, b] = await Promise.all([fs.readFile(fileA), fs.readFile(fileB)]);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    const res = await page.evaluate(
      async ({ a, b, threshold }) => {
        const load = (src) =>
          new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('تعذر قراءة الصورة'));
            i.src = 'data:image/png;base64,' + src;
          });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const W = Math.max(ia.width, ib.width);
        const H = Math.max(ia.height, ib.height);
        const read = (img) => {
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(img, 0, 0);
          return x.getImageData(0, 0, W, H).data;
        };
        const da = read(ia);
        const db = read(ib);
        const out = document.createElement('canvas');
        out.width = W;
        out.height = H;
        const octx = out.getContext('2d');
        const od = octx.createImageData(W, H);
        const o = od.data;
        const maxDelta = 35215 * threshold * threshold;
        const blend = (c, al) => 255 + (c - 255) * al;
        let diff = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const k = (y * W + x) * 4;
            const inA = x < ia.width && y < ia.height;
            const inB = x < ib.width && y < ib.height;
            let isDiff = false;
            let gray = 255;
            if (inA !== inB) {
              isDiff = true;
            } else if (inA) {
              const aa = da[k + 3] / 255;
              const ab = db[k + 3] / 255;
              const r1 = blend(da[k], aa), g1 = blend(da[k + 1], aa), b1 = blend(da[k + 2], aa);
              const r2 = blend(db[k], ab), g2 = blend(db[k + 1], ab), b2 = blend(db[k + 2], ab);
              if (r1 !== r2 || g1 !== g2 || b1 !== b2) {
                const y1 = r1 * 0.29889531 + g1 * 0.58662247 + b1 * 0.11448223;
                const i1 = r1 * 0.59597799 - g1 * 0.2741761 - b1 * 0.32180189;
                const q1 = r1 * 0.21147017 - g1 * 0.52261711 + b1 * 0.31114694;
                const y2 = r2 * 0.29889531 + g2 * 0.58662247 + b2 * 0.11448223;
                const i2 = r2 * 0.59597799 - g2 * 0.2741761 - b2 * 0.32180189;
                const q2 = r2 * 0.21147017 - g2 * 0.52261711 + b2 * 0.31114694;
                const dy = y1 - y2, di = i1 - i2, dq = q1 - q2;
                if (0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq > maxDelta) isDiff = true;
              }
              gray = 255 + (r1 * 0.299 + g1 * 0.587 + b1 * 0.114 - 255) * 0.15;
            }
            if (isDiff) {
              diff++;
              o[k] = 255; o[k + 1] = 0; o[k + 2] = 0; o[k + 3] = 255;
            } else {
              o[k] = o[k + 1] = o[k + 2] = gray; o[k + 3] = 255;
            }
          }
        }
        octx.putImageData(od, 0, 0);
        return {
          width: W,
          height: H,
          diffPixels: diff,
          sizeA: [ia.width, ia.height],
          sizeB: [ib.width, ib.height],
          png: out.toDataURL('image/png').split(',')[1],
        };
      },
      { a: a.toString('base64'), b: b.toString('base64'), threshold }
    );
    const total = res.width * res.height;
    const out = {
      diffPixels: res.diffPixels,
      total,
      ratio: total ? (res.diffPixels / total) * 100 : 0,
      sizeA: res.sizeA,
      sizeB: res.sizeB,
      sameSize: res.sizeA[0] === res.sizeB[0] && res.sizeA[1] === res.sizeB[1],
      diffImage: null,
    };
    if (res.diffPixels > 0) {
      await fs.mkdir(path.dirname(diffPath), { recursive: true });
      await fs.writeFile(diffPath, Buffer.from(res.png, 'base64'));
      out.diffImage = diffPath;
    }
    return out;
  } finally {
    await ctx.close();
  }
}

function multisetDiff(a, b) {
  const count = new Map();
  for (const x of b) count.set(x, (count.get(x) || 0) + 1);
  const only = [];
  for (const x of a) {
    const c = count.get(x) || 0;
    if (c > 0) count.set(x, c - 1);
    else only.push(x);
  }
  return only;
}

/** يقارن لقطتين (الأصل A وVite B) ويرجع نتيجة كل فحص. */
export function compareCaptures(A, B, pixel, tolerancePct) {
  const checks = {};

  checks.pixel = {
    ratio: pixel.ratio,
    diffImage: pixel.diffImage,
    sizeA: pixel.sizeA,
    sizeB: pixel.sizeB,
    pass: pixel.sameSize && pixel.ratio <= tolerancePct,
    reason: !pixel.sameSize
      ? `اختلاف الأبعاد: الأصل ${pixel.sizeA.join('×')} مقابل Vite ${pixel.sizeB.join('×')}`
      : pixel.ratio > tolerancePct
        ? `نسبة الاختلاف ${pixel.ratio.toFixed(3)}% أعلى من التسامح ${tolerancePct}%`
        : '',
  };

  const onlyTextA = multisetDiff(A.text, B.text);
  const onlyTextB = multisetDiff(B.text, A.text);
  checks.text = {
    pass: onlyTextA.length === 0 && onlyTextB.length === 0,
    onlyA: onlyTextA.slice(0, 8),
    onlyB: onlyTextB.slice(0, 8),
    countA: onlyTextA.length,
    countB: onlyTextB.length,
    reason: onlyTextA.length || onlyTextB.length ? `اختلاف نص الصفحة: ${onlyTextA.length} سطر في الأصل فقط، ${onlyTextB.length} في Vite فقط` : '',
  };

  checks.elements = {
    a: A.elementCount,
    b: B.elementCount,
    pass: A.elementCount === B.elementCount,
    reason: A.elementCount === B.elementCount ? '' : `عدد العناصر: الأصل ${A.elementCount} مقابل Vite ${B.elementCount}`,
  };

  const newConsole = multisetDiff(B.consoleErrors, A.consoleErrors);
  checks.console = {
    pass: newConsole.length === 0,
    onlyB: newConsole.slice(0, 8),
    onlyA: multisetDiff(A.consoleErrors, B.consoleErrors).slice(0, 8),
    reason: newConsole.length ? `${newConsole.length} خطأ console جديد في Vite` : '',
  };

  const newReq = multisetDiff([...new Set(B.failedRequests)], [...new Set(A.failedRequests)]);
  checks.network = {
    pass: newReq.length === 0,
    onlyB: newReq.slice(0, 8),
    onlyA: multisetDiff([...new Set(A.failedRequests)], [...new Set(B.failedRequests)]).slice(0, 8),
    reason: newReq.length ? `${newReq.length} طلب شبكة فاشل جديد في Vite` : '',
  };

  // كلاسات لها قاعدة CSS في الأصل لكنها بلا قاعدة في Vite (Tailwind لم يولّدها).
  const ruleA = new Set(A.withRule);
  const ruleB = new Set(B.withRule);
  const missing = B.tokens.filter((t) => ruleA.has(t) && !ruleB.has(t));
  const bare = B.tokens.filter((t) => !ruleA.has(t) && !ruleB.has(t));
  checks.tailwind = {
    pass: missing.length === 0,
    missing: missing.slice(0, 30),
    missingCount: missing.length,
    noRuleEitherSide: bare.length,
    reason: missing.length ? `${missing.length} كلاس بلا قاعدة CSS في Vite` : '',
  };

  const failed = Object.entries(checks).filter(([, c]) => !c.pass);
  return { checks, pass: failed.length === 0, reasons: failed.map(([, c]) => c.reason) };
}
