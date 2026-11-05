// بيانات النسخة التجريبية: منتجات وطلبات وعملاء وهميين لتجربة الموقع بشكل كامل.
// كل الأسماء والأرقام هنا من تأليفنا ولا تخص أي شخص حقيقي.
import { garmentUri, heroUri } from './garments.js';
import { brand } from '../shared/brand.js';

// بيانات دخول لوحة التحكم في النسخة التجريبية فقط (لا علاقة لها بأي حساب حقيقي).
export const DEMO_LOGIN = { email: 'admin@alaa.demo', password: 'Alaa-Demo-2026' };

const DAY = 86400000;

// [اسم، تصنيف، وسم، شارة، سعر، سعر قديم، تكلفة، شكل، لون، لون بديل، مخزون (null = غير متتبع)]
const PRODUCTS = [
  ['فستان سهرة «ليلى»',        'occasion', 'new',        'جديد',        185000, 0,      98000,  'evening',    'plum',      'burgundy', 6],
  ['فستان سهرة «نور»',         'occasion', 'bestseller', 'الأكثر طلباً', 210000, 240000, 112000, 'evening',    'emerald',   'teal',     4],
  ['فستان خطوبة «ريم»',        'occasion', 'new',        'جديد',        165000, 0,      88000,  'engagement', 'champagne', 'rose',     5],
  ['فستان هزاز «سلمى»',        'occasion', 'bestseller', '',            120000, 0,      62000,  'swing',      'rose',      'plum',     9],
  ['فستان هزاز «ديما»',        'daily',    'sale',       'عرض',         89000,  110000, 48000,  'swing',      'teal',      'sage',     12],
  ['ثوب سوداني «النيل»',       'thobe',    'bestseller', 'الأكثر طلباً', 95000,  0,      52000,  'toub',       'indigo',    'black',    15],
  ['ثوب سوداني «الغروب»',      'thobe',    'new',        'جديد',        105000, 0,      58000,  'toub',       'terra',     'burgundy', 11],
  ['عباية «سحر»',              'thobe',    'new',        '',            135000, 0,      72000,  'abaya',      'black',     'plum',     7],
  ['قفطان «أميرة»',            'thobe',    'sale',       'عرض',         115000, 135000, 64000,  'kaftan',     'sage',      'champagne', 2],
  ['طقم «همسة» (بلوزة وتنورة)', 'sets',     'new',        'جديد',        175000, 0,      94000,  'set',        'blush',     'cream',    8],
  ['إطلالة «دانة» (تونك وبنطلون)', 'sets',  'bestseller', '',            98000,  0,      54000,  'outfit',     'cream',     'olive',    14],
  ['فستان يومي «جنى»',         'daily',    'new',        '',            72000,  0,      38000,  'shirt',      'dusty',     'sage',     20],
  ['تفصيل خاص حسب مقاساتك',    'custom',   'new',        'حسب الطلب',   150000, 0,      0,      'custom',     'plum',      'rose',     null],
];

const CUSTOMERS = [
  ['سارة أحمد', '0900000001', 'الخرطوم - الرياض'],
  ['هبة عثمان', '0900000002', 'أمدرمان - الملازمين'],
  ['مروة علي', '0900000003', 'بحري - الدناقلة'],
  ['إيمان حسن', '0900000004', 'القاهرة - مدينة نصر'],
  ['ريماز خالد', '0900000005', 'الخرطوم - العمارات'],
  ['آلاء يوسف', '0900000006', 'أمدرمان - الثورة'],
  ['تسنيم محمد', '0900000007', 'جدة - حي الصفا'],
  ['وفاء إبراهيم', '0900000008', 'الخرطوم - الصحافة'],
];

export function seedData() {
  const now = Date.now();
  const products = {};
  const pid = (i) => `P${String(i + 1).padStart(2, '0')}DEMO`;
  PRODUCTS.forEach((r, i) => {
    const [name, cat, tag, badge, price, old, cost, kind, col, col2, stock] = r;
    const p = {
      name, cat, tag, badge, price, old, cost,
      img: garmentUri(kind, col),
      gallery: [garmentUri(kind, col2)],
      createdAt: now - (40 - i) * DAY,
    };
    if (stock != null) { p.stock = stock; p.minStock = 3; }
    products[pid(i)] = p;
  });
  const line = (i, qty) => { const r = PRODUCTS[i]; return { id: pid(i), name: r[0], price: r[4], qty, cat: r[1], img: '' }; };

  // [زبونة، [قطعة، كمية]..، الحالة، قبل كم يوم، مصدر]
  const ORDERS = [
    [0, [[1, 1]],           'قيد الانتظار', 0.1, 'web'],
    [1, [[5, 1], [3, 1]],   'قيد الانتظار', 0.4, 'web'],
    [2, [[9, 1]],           'قيد التجهيز',  1.2, 'web'],
    [3, [[0, 1]],           'قيد التجهيز',  2.1, 'whatsapp'],
    [4, [[7, 1], [5, 2]],   'جاهز للتسليم', 3.0, 'web'],
    [5, [[10, 1]],          'تم التسليم',   5.5, 'web'],
    [6, [[2, 1]],           'تم التسليم',   8.0, 'whatsapp'],
    [7, [[6, 1], [11, 1]],  'تم التسليم',   12,  'web'],
    [1, [[4, 2]],           'تم التسليم',   18,  'web'],
    [3, [[8, 1]],           'ملغي',         20,  'web'],
  ];
  const orders = {};
  ORDERS.forEach((o, n) => {
    const [ci, items, status, ago, source] = o;
    const [customer, phone, address] = CUSTOMERS[ci];
    const its = items.map(([pi, q]) => line(pi, q));
    const at = now - ago * DAY;
    const flow = ['قيد الانتظار', 'قيد التجهيز', 'جاهز للتسليم', 'تم التسليم'];
    const upTo = status === 'ملغي' ? 1 : flow.indexOf(status);
    const hist = flow.slice(0, upTo + 1).map((s, k) => ({ status: s, at: at + k * 3600000 * 5 }));
    if (status === 'ملغي') hist.push({ status: 'ملغي', at: at + DAY });
    const deducted = !['قيد الانتظار', 'ملغي'].includes(status);
    orders['K' + (4 + n) + 'M' + (n * 7 + 3) + 'Q' + n] = {
      customer, phone, address, items: its, total: its.reduce((s, i) => s + i.price * i.qty, 0),
      status, source, notes: '', createdAt: at, seen: ago > 1, stockDeducted: deducted, statusHistory: hist,
    };
  });

  const customOrders = {
    CUS01DEMO: { name: 'نهى الطيب', phone: '0900000011', occasion: 'زفاف', eventDate: new Date(now + 21 * DAY).toISOString().slice(0, 10), pieces: '2', budget: '350000', description: 'أحتاج ثوب زفاف بلمسة سودانية ورداء سهرة للحنة بألوان الأخضر والذهبي.', status: 'جديد', createdAt: now - 0.3 * DAY, seen: false },
    CUS02DEMO: { name: 'لينا مصطفى', phone: '0900000012', occasion: 'خطوبة', eventDate: new Date(now + 9 * DAY).toISOString().slice(0, 10), pieces: '1', budget: '200000', description: 'فستان خطوبة بأكمام طويلة ولون بيج مع تطريز خفيف.', status: 'قيد التصميم', createdAt: now - 4 * DAY, seen: true },
    CUS03DEMO: { name: 'رنا عبد الله', phone: '0900000013', occasion: 'سهرة', eventDate: '', pieces: '1', budget: '', description: 'عباية سهرة سوداء بتفاصيل ذهبية على الأكمام.', status: 'عرض سعر مُرسل', createdAt: now - 7 * DAY, seen: true },
  };

  const offers = {
    OFF01DEMO: { title: 'عرض الموسم على فساتين المناسبات', discount: 15, endsAt: now + 6 * DAY, category: 'occasion', active: true },
  };

  const settings = {
    store: { heroImage: heroUri(), countryCode: '249', defaultMinStock: 3, lateHours: 24, phone: brand.whatsapp, email: brand.email },
  };

  const stockLogs = {};
  PRODUCTS.forEach((r, i) => {
    if (r[10] == null) return;
    stockLogs['SL' + i + 'DEMO'] = { productId: pid(i), name: r[0], delta: r[10], before: 0, after: r[10], reason: 'مخزون افتتاحي', orderId: '', at: now - (40 - i) * DAY };
  });

  return { products, orders, customOrders, offers, settings, stockLogs, messageTemplates: {} };
}
