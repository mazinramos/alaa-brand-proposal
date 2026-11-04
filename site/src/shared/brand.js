// المصدر الوحيد لهوية براند ألاء داخل الكود (المتجر + اللوحة).
// أي اسم أو رقم أو رابط أو تصنيف يخص البراند يُقرأ من هنا، لا يُكتب مباشرة في الكود.
//
// القيم التي تبدأ بـ ALAA_ هي رموز مؤقتة (placeholders) لحين ما نستلم البيانات الحقيقية من ألاء.
// استبدالها لاحقاً يتم في هذا الملف وفي المواضع المذكورة في REBRAND.md (بما أن الـ HTML الثابت لا يقرأ منه).

export const brand = {
  nameAr: 'براند ألاء',
  nameEn: 'Alaa Mahjob',
  logoScript: 'Alaa', // الشعار المكتوب بخط Great Vibes في الهيدر والفوتر
  taglineAr: 'تصميم أزياء',
  taglineEn: 'Fashion Designer',

  // التواصل (رموز مؤقتة)
  whatsapp: 'ALAA_WHATSAPP_NUMBER', // أرقام بصيغة دولية بدون + وبدون مسافات
  email: 'ALAA_EMAIL',
  instagram: 'ALAA_INSTAGRAM_HANDLE',
  tiktok: 'ALAA_TIKTOK_HANDLE',

  // أسماء الملفات المصدّرة من اللوحة
  exportPrefix: 'alaa',
};

// تصنيفات المنتجات. المفتاح (key) هو القيمة المخزنة في قاعدة البيانات، والاسم (name) هو المعروض.
// المتجر واللوحة يقرآن من هنا حتى يبقيا متفقين. مقترحة من docs/02-vision-proposal.md وتتغير بقرار ألاء.
export const categories = [
  { key: 'occasion', name: 'فساتين المناسبات' },
  { key: 'thobe',    name: 'الأثواب والعبايات' },
  { key: 'daily',    name: 'الإطلالات اليومية' },
  { key: 'sets',     name: 'إطلالات متكاملة' },
  { key: 'custom',   name: 'تفصيل خاص' },
];
