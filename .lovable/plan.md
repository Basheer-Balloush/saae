## المشكلة

لما تفتح رابط الموقع (مثلاً `aisyria.org`)، الصفحة لحظياً بتظهر عند قسم الشركاء، وبعدين بتطلع لفوق. ده مزعج بصرياً.

## السبب

في `src/routes/index.tsx` ترتيب الأقسام: `FeaturedNews → Partners → Achievements → Communities`. عند تحميل الصفحة:

1. السيرفر يرسم HTML كامل (SSR) — كل الأقسام مرتفعة، بما فيها Partners.
2. المتصفح (بسبب browser scroll restoration / bfcache) يستعيد آخر مكان كان فيه المستخدم بزيارة سابقة — غالباً عند Partners أو تحته.
3. بعدها بمللي ثوان، TanStack Router مع `scrollRestoration: true` يقفز لأعلى الصفحة.

النتيجة: ومضة من Partners ثم قفزة للأعلى.

## الحل

تعديلين صغيرين على `src/routes/index.tsx`:

1. **تعطيل استعادة سكرول المتصفح للصفحة الرئيسية** عبر ضبط `history.scrollRestoration = "manual"` بمجرد التحميل، إذا ما كان فيه hash بالـ URL.
2. **القفز الفوري لأعلى الصفحة (`window.scrollTo(0, 0)`) في أول رسمة** قبل ما المتصفح يحاول يستعيد مكان قديم، فقط لما يكون فيه ما في hash. لو فيه hash (مثلاً `/#partners`) السلوك الحالي يبقى كما هو ويتم التمرير للقسم المطلوب.

التعديل محدود بملف واحد فقط ولا يلمس باقي الأقسام ولا الترتيب ولا أي ستايل.

## القسم التقني

```tsx
// في بداية مكوّن Index، قبل الـ useEffect الموجود
useEffect(() => {
  if (typeof window === "undefined") return;
  // إيقاف استعادة سكرول المتصفح للصفحة الرئيسية
  const prev = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  // إذا فتح المستخدم الجذر بدون hash، اضمن أنه يبدأ من الأعلى فوراً
  if (!location.hash) {
    window.scrollTo(0, 0);
  }
  return () => {
    window.history.scrollRestoration = prev;
  };
}, []);
```

لا تغييرات على `src/router.tsx` أو على ترتيب أقسام الصفحة.
