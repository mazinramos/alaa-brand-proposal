// الصفحات المفحوصة. paths.legacy مسار الأصل داخل site/legacy، وpaths.vite مسار نسخة Vite.
export const PAGES = [
  {
    id: 'store',
    title: 'المتجر',
    paths: { legacy: '/store.html', vite: '/' },
    expectFirestore: true, // المتجر يقرأ المنتجات من Firestore عند التحميل
    freezeTime: true, // العدّ التنازلي للعروض يعتمد على Date.now
    waitSelector: null,
  },
  {
    id: 'admin-login',
    title: 'شاشة دخول اللوحة',
    paths: { legacy: '/admin.html', vite: '/admin/' },
    expectFirestore: false,
    freezeTime: false,
    waitSelector: '#loginScreen',
  },
];

export const VIEWPORTS = [390, 768, 1366];

// صفحة الدخول التي تُستعمل لالتقاط تبويبات اللوحة (اختياري).
export const ADMIN_PAGE = PAGES.find((p) => p.id === 'admin-login');
