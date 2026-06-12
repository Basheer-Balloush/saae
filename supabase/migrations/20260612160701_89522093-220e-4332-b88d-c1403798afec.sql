ALTER TABLE public.news ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
UPDATE public.news SET categories = ARRAY[category] WHERE (categories IS NULL OR array_length(categories,1) IS NULL) AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS news_categories_gin ON public.news USING gin (categories);