# مهمة 1: تحويل المتجر إلى Vite

> **المسارات في هذا الملف نسبة إلى مجلد `site/`** داخل ريبو `alaa-brand-proposal`. افتح الريبو، وادخل `site/`، وتشتغل من هناك. كل الأوامر (`npm ...`) تُشغَّل داخل `site/`.

- **الـ branch:** `acct-1-store-vite`
- **ملفاتك فقط:** `index.html` و`src/store/**`
- **اقرا أولاً:** `MIGRATION.md` (القواعد كلها هناك، والتزم بها حرفياً)
- **المصدر:** `legacy/store.html` (للقراءة فقط)

## المطلوب

1. استبدل `index.html` (الـ placeholder) بنسخة من `legacy/store.html` بعد:
   - حذف سكربت Tailwind CDN وسكربت `tailwind.config` الداخلي.
   - حذف `<style>` الداخلي ونقله حرفياً إلى `src/store/styles.css`.
   - حذف `<script type="module">` الداخلي ونقله حرفياً إلى `src/store/main.js`.
   - إضافة `<script type="module" src="/src/store/main.js"></script>` قبل `</body>`.
   - الإبقاء على كل ما تبقى كما هو (الـ `<head>` وروابط الخطوط وFont Awesome والـ HTML كله والـ `onclick`).
2. في `src/store/main.js`:
   - أول سطرين: `import '../tailwind.css'` و`import './styles.css'`.
   - استيراد Firebase من `firebase/app` و`firebase/firestore` بدل روابط `gstatic`، بنفس الأسماء المستوردة.
   - استبدال كائن `firebaseConfig` بـ `import { firebaseConfig } from '../shared/firebaseConfig.js'`.
   - الباقي حرفياً.
3. تأكد إن الدوال المستعملة في `onclick` متاحة (الأصل كان module أيضاً، فهو يعيّنها على `window` بالفعل).

## تحقق قبل التسليم

- `npm run build` ينجح.
- `npm run dev`، افتح `/` وقارن بالأصل بعينك: الهيدر، الأقسام كلها، السلة، المعاينة السريعة، الفوتر، زر الواتساب.
- قارن كلاسات Tailwind المبنية: لو في عنصر في الأصل له كلاس ما اتولّد (مثل `h-[340px]` أو `bg-[#25D366]`)، افحص `tailwind.config.js` `content` ولا تعدّله، بل اكتبه للمشرف.
- `diff` بين محتوى سكربت الأصل و`main.js`: لازم يظهر فقط سطور import والإعداد.
- لا تضغط "إتمام الطلب" ولا تكتب أي بيانات.

## التسليم

ارفع على الـ branch المحدد، وأرسل تقرير التسليم بالصيغة في آخر `MIGRATION.md`. لو الرفع فشل (مشكلة صلاحيات) قل ذلك صراحة ولا تتحايل.
