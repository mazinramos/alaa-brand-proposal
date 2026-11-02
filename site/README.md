# مشروع الموقع (Vite)

هذا المجلد (`site/`) داخل ريبو `alaa-brand-proposal`. كل أوامر `npm` تُشغَّل من هنا.

متجر براند Alaa Mahjob. الأساس: موقع وشلي محوّل إلى **Vite** بدون أي تغيير في التصميم أو الألوان. بعد اكتمال التحويل نغيّر الهوية ونضيف الميزات.

## الحالة

مرحلة التحويل جارية. التفاصيل والقواعد في [`MIGRATION.md`](MIGRATION.md) والمهام في `tasks/`.

## التشغيل المحلي

```bash
npm install
cp .env.example .env.local     # ثم املأ القيم (انظر MIGRATION.md)
npm run dev
```

- المتجر: http://localhost:5173/
- لوحة التحكم: http://localhost:5173/admin/

```bash
npm run build      # بناء للإنتاج في dist/
npm run preview    # معاينة البناء
```

## الهيكل

```
index.html            المتجر
admin/index.html      لوحة التحكم
src/store/            كود المتجر
src/admin/            كود اللوحة
src/shared/           إعداد Firebase المشترك
src/tailwind.css      Tailwind
legacy/               الأصل من وشلي للمرجع (للقراءة فقط)
tests/                فحوص المطابقة
tasks/                مهام الحسابات
docs/                 توثيق
```
