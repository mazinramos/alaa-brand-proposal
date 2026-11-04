// أنماط الفحص. الأنماط الحساسة تُبنى بالتقطيع (j) حتى لا تظهر الكلمات القديمة حرفياً في هذا الملف،
// فلا تكتشف الأداةُ نفسَها لو انتقلت يوماً خارج الاستثناء الصريح لمجلدها.
const j = (...p) => p.join('');
const D = '[\\u064B-\\u0652\\u0640]*'; // تشكيل وتطويل بين الحروف العربية

const OLD = j('wish', 'ly'); // الاسم القديم
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// مجموعة suppress: لو تداخلت نتيجتان في نفس المجموعة يُبلَّغ عن الأطول فقط (تجنب تكرار نفس الموضع).
export const PATTERNS = [
  { id: 'old-name-en', group: 'old-name', label: 'الاسم القديم (إنجليزي)', re: new RegExp(esc(OLD), 'gi') },
  { id: 'old-name-ar', group: 'old-name', label: 'الاسم القديم (عربي)', re: new RegExp(`و${D}(?:[يى]${D})?ش${D}ل${D}[يى]`, 'g') },
  { id: 'old-email-domain', group: 'old-name', label: 'نطاق الإيميل القديم', re: new RegExp(esc(j(OLD, '-atelier')), 'gi') },
  { id: 'old-instagram', group: 'old-name', label: 'حساب إنستغرام قديم', re: new RegExp(esc(j(OLD, 'gift.favors')), 'gi') },
  { id: 'old-tiktok', group: 'old-name', label: 'حساب تيك توك قديم', re: new RegExp(esc(j(OLD, '.sd')) + '(?![\\w])', 'gi') },
  { id: 'old-firebase-a', group: 'old-name', label: 'معرّف مشروع Firebase قديم', re: new RegExp(esc(j(OLD, '-82ae9')), 'gi') },
  { id: 'old-name-file', group: 'old-name', label: 'معرّف أو اسم ملف بصيغة الاسم القديم', re: new RegExp(`${esc(OLD)}[-_][\\w-]*`, 'gi') },
  { id: 'old-firebase-b', group: 'firebase-b', label: 'معرّف مشروع Firebase قديم', re: new RegExp(esc(j('twins', '-30485')), 'gi') },

  { id: 'phone-intl', group: 'phone', label: 'رقم واتساب/هاتف قديم (دولي)', re: new RegExp(j('2499', '04298584'), 'g') },
  { id: 'phone-local', group: 'phone', label: 'رقم هاتف قديم (محلي)', re: new RegExp(j('0904', '298584'), 'g') },
  { id: 'phone-core', group: 'phone', label: 'رقم هاتف قديم', re: new RegExp(j('904', '298584'), 'g') },
  {
    id: 'phone-spaced', group: 'phone', label: 'رقم هاتف قديم (بفواصل أو مسافات)',
    re: /\+?\d(?:[\d\s().\-]{7,}\d)/g,
    filter: (m) => /\D/.test(m.replace(/^\+/, '')) && m.replace(/\D/g, '').includes(j('904', '298584')),
  },

  { id: 'google-verification', group: null, label: 'كود التحقق من ملكية جوجل', re: /google-site-verification/gi },
  { id: 'google-verification-value', group: null, label: 'قيمة كود التحقق من جوجل', re: new RegExp(j('IH_dYUXH_BQW7TR7uUDlCoLQvJy0kQdNy503aX', 'l8W8w'), 'g') },

  {
    id: 'wa-link', group: null, label: 'رابط wa.me برقم غير الرمز المؤقت',
    re: /wa\.me\/([^\s"'`<>)]*)/gi,
    filter: (m, g1, line) => waCheck(g1, line),
  },
  {
    id: 'wa-send-link', group: null, label: 'رابط واتساب (send?phone) برقم غير الرمز المؤقت',
    re: /(?:api|web)\.whatsapp\.com\/send\/?\?[^"'`\s<>]*?phone=([^&"'`\s<>]*)/gi,
    filter: (m, g1, line) => waCheck(g1, line),
  },

  { id: 'google-api-key', group: null, label: 'مفتاح يشبه مفاتيح جوجل (AIza)', re: /AIza[0-9A-Za-z_-]{20,}/g },
  {
    id: 'api-key-literal', group: null, label: 'apiKey مكتوب نصاً داخل الكود',
    re: /\bapiKey["']?\s*[:=]\s*(["'])([^"']+)\1/g,
    filter: (m, g1, line, g2) => g2.length > 0,
  },
  {
    id: 'any-email', group: null, label: 'إيميل (غير الرمز المؤقت ALAA_EMAIL)',
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
    filter: (m) => {
      const tld = m.split('.').pop().toLowerCase();
      if (FILE_EXT.has(tld)) return false; // مثل icon@2x.png
      if (m.toLowerCase().includes(OLD)) return false; // مُبلَّغ عنه بنمط الاسم القديم
      return true;
    },
  },
];

const FILE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'ico', 'woff', 'woff2', 'ttf', 'otf', 'css', 'js', 'mjs', 'map', 'json']);

// رقم واتساب مقبول فقط لو الرمز المؤقت، أو تعبير ديناميكي مصدره brand.
function waCheck(value, line) {
  if (value.startsWith('ALAA_WHATSAPP_NUMBER')) return false;
  if (value.startsWith('${')) return !/brand\b/i.test(value.slice(0, value.indexOf('}') + 1) || line);
  if (value === '') return !/brand\.|ALAA_WHATSAPP_NUMBER/.test(line);
  return true;
}

// تحذيرات لا أخطاء.
export const PLACEHOLDER_RE = /ALAA_[A-Z0-9_]+/g;
export const EXTERNAL_IMAGE_RE = /(?:images|photos|source|plus)\.unsplash\.com/gi;
