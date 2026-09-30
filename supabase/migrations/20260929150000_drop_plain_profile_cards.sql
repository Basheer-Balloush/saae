-- The profile cards now live only encrypted in public.private_cards
-- (see src/lib/profile-card-crypto.ts). Remove the earlier plain copy.
drop function if exists public.get_private_profile_card(text);
drop function if exists public.get_private_profile_contact(text);
drop function if exists public.get_private_profile_image(text, text);
drop table if exists public.private_profile_cards;
