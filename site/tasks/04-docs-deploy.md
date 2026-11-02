# مهمة 4: التوثيق والنشر ومراجعة المشاكل المعروفة

> **المسارات في هذا الملف نسبة إلى مجلد `site/`** داخل ريبو `alaa-brand-proposal`. افتح الريبو، وادخل `site/`، وتشتغل من هناك. كل الأوامر (`npm ...`) تُشغَّل داخل `site/`.

- **الـ branch:** `acct-4-docs-deploy`
- **ملفاتك فقط:** `README.md` و`docs/**` و`firebase.json` و`.firebaserc.example` و`public/_headers` و`public/_redirects`
- **اقرا أولاً:** `MIGRATION.md`, `docs/KNOWN-ISSUES.md`, وفي جذر الريبو (خارج `site/`): `../docs/03-backend-comparison.md` و`../docs/04-pricing-plans.md`

## المطلوب

1. **`docs/KNOWN-ISSUES.md`:** تحقق من كل بند على `legacy/admin.html` و`legacy/store.html` (و`legacy/admin-standalone.html` للبند 1)، وأضف **أرقام السطور** والتأثير الفعلي، وغيّر الحالة إلى "مؤكد" أو "غير صحيح" مع السبب. أضف أي مشاكل جديدة تلقاها (أمان، بيانات، تجربة مستخدم) بنفس الجدول. لا تصلح شي.
2. **`docs/ARCHITECTURE.md`:** خريطة من ملفات الأصل إلى ملفات المشروع (أين ذهب كل جزء)، المجموعات في Firestore وحقولها كما تُكتب وتُقرأ من الكود (جدول لكل مجموعة)، تدفق الطلب من السلة إلى اللوحة.
3. **`docs/DEPLOY.md`:** خطوات النشر على **Firebase Hosting** وعلى **Cloudflare Pages** (الخيارين، مختصرين). أمر البناء `npm run build` ومجلد الإخراج `dist`. إعداد متغيرات البيئة `VITE_FIREBASE_*` في كل منصة. الصفحتان `/` و`/admin/` متعدد الصفحات.
4. **`firebase.json` و`.firebaserc.example`** كمسودة لـ Hosting (`public: dist`). و`public/_headers` و`public/_redirects` لـ Cloudflare Pages لو لزم.
5. **`README.md`:** حدّثه (التشغيل المحلي، البناء، الهيكل). التزم بقواعد صاحب المشروع: أوامر التشغيل بالترتيب، رابط التشغيل المحلي، خطوات اختبار سريعة، أخطاء شائعة وكيف تتحقق.
6. **`docs/ENV.md`:** شرح كل متغير بيئة، من أين يُؤخذ، وأن `.env.local` لا يُرفع.

## قيود

- لا تعدّل أي كود في `src/` أو `index.html` أو `admin/` أو `package.json` أو إعدادات Vite وTailwind.
- لا تضع مفاتيح أو بيانات مشروع Firebase فعلية في أي ملف (أمثلة بقيم وهمية فقط).
- مصادر أي معلومة منصات (Firebase/Cloudflare) من صفحات التوثيق الرسمية الحديثة، ولا تخمّن.

## معيار الاكتمال

- كل بند في `KNOWN-ISSUES.md` له حالة وسطر.
- أي زول جديد يقدر يشغّل المشروع وينشره بالقراءة فقط.
