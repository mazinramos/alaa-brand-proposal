import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** خطأ إعداد: يوقف الأداة برسالة عربية واضحة (رمز خروج 2). */
export class SetupError extends Error {}

// أسماء حقول Firebase في الأصل، ومتغيرات البيئة المقابلة لها.
export const FIREBASE_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
  measurementId: 'VITE_FIREBASE_MEASUREMENT_ID',
};

const REDACTED_RE = new RegExp(
  `\\b(${Object.keys(FIREBASE_KEYS).join('|')})(\\s*:\\s*)(["'])REDACTED\\3`,
  'g'
);

export function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    } else {
      v = v.replace(/\s+#.*$/, '');
    }
    out[m[1]] = v;
  }
  return out;
}

export function loadEnvFile(siteRoot) {
  const file = path.join(siteRoot, '.env.local');
  if (!existsSync(file)) {
    throw new SetupError(
      'ملف .env.local غير موجود في مجلد site/.\n' +
        'الحل: انسخ .env.example إلى .env.local واملأ قيم Firebase (للقراءة فقط) من سطر firebaseConfig في ريبو المتجر، ثم أعد التشغيل.'
    );
  }
  return parseEnv(readFileSync(file, 'utf8'));
}

/** الحقول التي لا تزال "REDACTED" في ملف HTML. */
export function findRedactedKeys(html) {
  const keys = new Set();
  for (const m of html.matchAll(REDACTED_RE)) keys.add(m[1]);
  return [...keys];
}

/** يعوّض قيم REDACTED بقيم البيئة وقت التحميل فقط (الملفات على القرص لا تتغير). */
export function substituteRedacted(html, env) {
  return html.replace(REDACTED_RE, (whole, key, sep) => {
    const value = env[FIREBASE_KEYS[key]];
    return value ? `${key}${sep}${JSON.stringify(value)}` : whole;
  });
}

/** يتأكد أن كل حقل مخفي في ملفات الأصل له قيمة في .env.local. */
export function assertEnvCoversRedacted(htmlFiles, env) {
  const need = new Set();
  for (const file of htmlFiles) {
    if (!existsSync(file)) {
      throw new SetupError(`ملف الأصل غير موجود: ${file}`);
    }
    for (const key of findRedactedKeys(readFileSync(file, 'utf8'))) need.add(FIREBASE_KEYS[key]);
  }
  const missing = [...need].filter((name) => !env[name]);
  if (missing.length) {
    throw new SetupError(
      'قيم Firebase ناقصة في .env.local، والأصل يحتاجها:\n  ' +
        missing.join('\n  ') +
        '\nالحل: املأها من سطر firebaseConfig في ريبو المتجر (للقراءة فقط).'
    );
  }
}
