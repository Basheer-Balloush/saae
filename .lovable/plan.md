
## Goal
Create a new Arabic (RTL) landing page at `/ai-tot-graduation` that presents the content of the uploaded PDF (الندوة الوطنية السورية الأولى للذكاء الاصطناعي — sponsorship deck), using the same visual language as `/one-million-initiative` (Navbar, Footer, ministry logo header, gradient hero, eyebrow-titled sections, stat tiles, icon cards, network/pulse decorative bits where appropriate).

## Route
- New file: `src/routes/ai-tot-graduation.tsx`
- `createFileRoute("/ai-tot-graduation")` with full `head()` meta (title, description, og:title/description/url, canonical) localized to Arabic, matching the SEO pattern of the existing page.

## Page structure (sections, in order)

1. **Hero**
   - Ministry logo + small badge: "وزارة الاتصالات وتقانة المعلومات — رعاية استراتيجية".
   - Title: "الندوة الوطنية السورية الأولى للذكاء الاصطناعي".
   - Subtitle: "عرض الرعاية الاستراتيجي للفعالية التقنية الأضخم محلياً".
   - Back-to-home link.

2. **Stat tiles** (4 tiles, same component style as one-million page)
   - "الأولى" / ندوة وطنية
   - "3" / محاور رئيسية
   - "دفعة أولى" / مدربو ذكاء اصطناعي معتمدون
   - "1,000,000" / مستخدم مستهدف

3. **المحاور الرئيسية للندوة** (3 icon cards)
   - مبادرة مليون مستخدم
   - الجلسة الحوارية
   - تخريج المدربين
   (Copy verbatim from PDF page 2.)

4. **تخريج الدفعة الأولى — بناء قدرات المستقبل** (highlighted feature block, GraduationCap icon, two-paragraph body from page 3).

5. **مبادرة مليون مستخدم — نحو مجتمع ممكّن رقمياً** (feature block + CTA linking to `/one-million-initiative`, body from page 4).

6. **لماذا ترعى هذا الحدث؟** (eyebrow section intro from page 5).

7. **مزايا باقة الرعاية الحصرية** (4 icon cards from page 6: شهادات الخريجين، اللوحات الإعلانية، التغطية الرقمية، بطاقات الدعوة).

8. **استثمر في مستقبل التكنولوجيا** (3 bullet cards from page 7: تعزيز الهوية المؤسسية، الوصول المباشر، المسؤولية المجتمعية).

9. **Closing CTA**: "معاً لنصنع المستقبل — رعايتكم تصنع الفارق" with a contact button linking to `/contact`.

10. Footer.

## Style/implementation notes
- Reuse `Navbar`, `Footer`, ministry asset import, lucide icons (GraduationCap, Sparkles, Users, Award, Megaphone, IdCard, Globe, HeartHandshake, Building2, Target, CheckCircle2, ArrowLeft).
- Same Tailwind tokens (primary/secondary gradients, `bg-card`, `border-border`, `text-muted-foreground`), same eyebrow + title pattern, same card hover/glow treatment.
- RTL layout matching existing page; no language toggle needed (Arabic-only content, mirroring how the existing page's Arabic content is structured).
- No backend / data changes; pure presentation route.

## Out of scope
- No nav-menu link addition unless requested later.
- No new translations file; copy lives inline in the route file like the existing one.
