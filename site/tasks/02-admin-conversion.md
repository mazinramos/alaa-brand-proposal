# مهمة 2: تحويل لوحة التحكم إلى Vite

> **المسارات في هذا الملف نسبة إلى مجلد `site/`** داخل ريبو `alaa-brand-proposal`. افتح الريبو، وادخل `site/`، وتشتغل من هناك. كل الأوامر (`npm ...`) تُشغَّل داخل `site/`.

- **الـ branch:** `acct-2-admin-vite`
- **ملفاتك فقط:** `admin/index.html` و`src/admin/**`
- **اقرا أولاً:** `MIGRATION.md` (القواعد كلها هناك، والتزم بها حرفياً)
- **المصدر:** `legacy/admin.html` (هي النسخة الأحدث من ريبو المتجر). لا تستعمل `legacy/admin-standalone.html`.

## المطلوب

1. استبدل `admin/index.html` (الـ placeholder) بنسخة من `legacy/admin.html` بعد:
   - حذف سكربتات CDN لـ Tailwind وChart.js وhtml2canvas وjsPDF، وحذف سكربت `tailwind.config` الداخلي.
   - **إبقاء** السكربت الصغير الأول الخاص بعرض أخطاء JS داخل `<head>` كما هو (inline).
   - حذف `<style>` الداخلي ونقله حرفياً إلى `src/admin/styles.css`.
   - حذف `<script type="module">` الداخلي الكبير (حوالي 1400 سطر) ونقله حرفياً إلى `src/admin/main.js`.
   - إضافة `<script type="module" src="/src/admin/main.js"></script>` قبل `</body>`.
2. في `src/admin/main.js`:
   - أول سطور: `import '../tailwind.css'` و`import './styles.css'`.
   - استيراد Firebase من `firebase/app` و`firebase/firestore` و`firebase/auth` بنفس الأسماء الحالية.
   - استيراد `chart.js/auto` و`html2canvas` و`jspdf`. الكود الأصلي يستعمل `Chart` و`html2canvas` و`jspdf` كمتغيرات عامة، لذلك: `window.Chart = Chart` و`window.html2canvas = html2canvas` و`window.jspdf = { jsPDF }` قبل أي كود يستعملها (تأكد من الشكل الذي يستعمله الأصل بالضبط).
   - استبدال `firebaseConfig` بـ `import { firebaseConfig } from '../shared/firebaseConfig.js'`.
   - **لا تقسّم الملف** لوحدات، ولا تغيّر أسماء ولا ترتيب. نقل فقط.
3. لوحة التحكم تحتاج تسجيل دخول. بدون حساب اختبار، قارن شاشة الدخول بالأصل، وتأكد إن الكود يشتغل بدون أخطاء console حتى حدّ شاشة الدخول. لا تدخل بحساب حقيقي.

## تحقق قبل التسليم

- `npm run build` ينجح، وحجم الناتج منطقي (Chart.js وjsPDF يدخلون في الحزمة).
- `npm run dev`، افتح `/admin/` وقارن شاشة الدخول بالأصل.
- لا أخطاء جديدة في console. لو ظهرت `Chart is not defined` أو ما شابه، المشكلة في ترتيب تعريف المتغيرات العامة.
- `diff` بين سكربت الأصل و`main.js`: فقط import وإعداد المكتبات وFirebase.
- نموذج بيانات Firestore (أسماء المجموعات) كما هو.

## التسليم

ارفع على الـ branch المحدد، وأرسل تقرير التسليم بالصيغة في آخر `MIGRATION.md`. لو الرفع فشل (مشكلة صلاحيات) قل ذلك صراحة ولا تتحايل.
