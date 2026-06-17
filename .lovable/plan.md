## الخطة

### 1. توليد صورة خريطة سوريا
- استخدام `imagegen` لتوليد صورة فنية لخريطة سوريا (PNG بخلفية شفافة) بأسلوب يتناسب مع التصميم (ألوان primary/secondary، خطوط ناعمة، شكل سيلويت للبلاد).
- حفظها في `src/assets/syria-map.png`.

### 2. تحديث `GeographySection` في `src/routes/one-million-initiative.tsx`
استبدال الـ grid الحالي بتخطيط جديد:
- **عمود الصورة (يسار/يمين حسب الاتجاه):** الخريطة معروضة بحجم كبير مع تأثيرات حركية:
  - دخول ناعم (`animate-fade-in` + `scale-in`)
  - توهج خلفي (blur glow بألوان primary/secondary)
  - نقاط متحركة (pulsing dots) فوق الخريطة تمثّل مدناً سورية رئيسية (حلب، دمشق، اللاذقية، حمص، الحسكة، دير الزور) باستخدام `absolute` positioning مع `animate-ping` و `animate-pulse`
  - خطوط متقطّعة متحركة تربط النقاط (SVG overlay اختياري) لإيحاء "التوزيع الشامل"
- **عمود النص:** البطاقتان الحاليتان (lead1/body1 و lead2/body2) مكدّستان عمودياً بدل grid أفقي.

### 3. التفاصيل التقنية
- تخطيط responsive: `grid md:grid-cols-2` — صورة + نص، يتكدّس على الموبايل.
- النقاط المتحركة: عناصر `<span>` مطلقة الموضع بنسب مئوية تقريبية لمواقع المدن داخل الصورة، مع `animate-pulse` و overlay `animate-ping`.
- لا تغيير على باقي الصفحة.

### الملفات المعدّلة
- `src/assets/syria-map.png` (جديد، عبر imagegen)
- `src/routes/one-million-initiative.tsx` (تعديل `GeographySection` + إضافة import للصورة)
