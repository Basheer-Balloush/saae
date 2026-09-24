# New shareable profile card page

## What will be built
- Add one new standalone page at a random-looking URL, separate from the existing site pages.
- Recreate the uploaded reference design: maroon ministry header, warm patterned background, circular portrait placeholder, Arabic calligraphy-style name treatment, title block, contact-save button, and five social/contact buttons.
- Keep the portrait and all destination links as clearly isolated placeholders so they can be replaced when supplied.
- Include an Arabic/English switch and make both directions responsive on desktop and mobile.
- Keep the existing Home, About, navigation, and footer unchanged.

## Technical details
- Create a single TanStack route with unique page metadata.
- Build the card as a focused page-level component with scoped styles and lightweight decorative CSS; no database changes or new dependencies.
- Use semantic links/buttons, accessible labels, keyboard focus states, and a downloadable placeholder contact card action.
- Verify layout, overflow, and interactions in Arabic and English at mobile and desktop sizes.
