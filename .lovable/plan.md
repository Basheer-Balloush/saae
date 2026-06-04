Simplify the password strength indicator from 3 levels (Weak / Medium / Strong) to 2 levels (Weak / Strong).

Changes:
1. `src/lib/lms-i18n.ts` — remove `passwordMedium` from the type definition and from both `ar` and `en` translation objects.
2. `src/routes/learning-management-system.signup.tsx` — update `getStrengthInfo` to return only 2 states:
   - `score <= 3` → Weak (red)
   - `score >= 4`  → Strong (green)