
CREATE OR REPLACE FUNCTION public.initiative_top_donors_by_type(_donor_type text, _limit integer DEFAULT 10)
RETURNS TABLE(donor_name text, donor_display_name text, logo_url text, total_chairs bigint, total_amount numeric, last_donation_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    donor_name,
    MAX(donor_display_name) AS donor_display_name,
    MAX(logo_url) AS logo_url,
    SUM(chairs_count)::bigint AS total_chairs,
    SUM(amount) AS total_amount,
    MAX(confirmed_at) AS last_donation_at
  FROM public.initiative_donations
  WHERE status = 'confirmed' AND donor_type::text = _donor_type
  GROUP BY donor_name
  ORDER BY SUM(chairs_count) DESC, SUM(amount) DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.initiative_top_donors_by_type(text, integer) TO anon, authenticated;

UPDATE public.initiative_settings SET
  mission_ar = 'نسعى لتمكين مليون سوري من إتقان واستخدام أدوات الذكاء الاصطناعي، بهدف سد الفجوة الرقمية، وتعزيز القدرات التنافسية في سوق العمل، وبناء مجتمع مبتكر قادر على المساهمة بفعالية في صناعة المستقبل التكنولوجي.',
  values_ar = E'التمكين: تزويد الأفراد بالمهارات والأدوات اللازمة للنجاح والتطور في عصر الذكاء الاصطناعي.\n\nالشمولية: إتاحة المعرفة وتوفير فرص التعلم للجميع، بغض النظر عن خلفياتهم أو مستوياتهم التقنية السابقة.\n\nالابتكار: تحفيز التفكير الإبداعي وتوظيف التقنية لإيجاد حلول ذكية تخدم الفرد والمجتمع.\n\nالتشارك: بناء مجتمع سوري داعم، يتبادل المعرفة والخبرات وينمو معاً.\n\nالمواكبة: الالتزام بالتعلم المستمر والتحديث الدائم لمجاراة التطور المتسارع في عالم التقنية.';
