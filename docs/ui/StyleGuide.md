# TASJ Website UI Style Guide

## Brand Foundations

### Color Palette (WCAG-compliant)
- Primary: Deep Navy `#1A237E` (AA contrast on white at 7.9:1)
- Accent: Saffron Orange `#FF9933` (AA contrast on deep navy at 4.6:1)
- Secondary: Gold `#FFD700` (use sparingly; not for body text)
- Neutrals: Warm Gray `#F5F5F5`, Medium Gray `#6C757D`, Dark Gray `#343A40`
- Success: Emerald `#22C55E`
- Error: Crimson `#DC3545`
- Info: Indigo `#4F46E5`
- Background: White `#FFFFFF`

Usage guidelines:
- Text on `#1A237E`: use white for headings, medium gray for body text overlays
- Buttons: solid primary (deep navy) with accent hover, or accent with navy text
- Cards: white background, subtle shadow, 2px border with warm gray

### Typography
- Font family: `Poppins`, sans-serif
- Type scale:
  - Display: 48–56 px (hero)
  - H1: 40 px
  - H2: 32 px
  - H3: 24 px
  - H4: 20 px
  - Body: 16–18 px
  - Small: 14 px
- Line-height: 1.3 for headings, 1.6 for body
- Letter-spacing: tighten by -0.01em for headings

### Spacing System
- 4-pt base grid
- Tokens: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`
- Section padding: desktop `80px`, tablet `60px`, mobile `40px`
- Card padding: desktop `24–32px`, mobile `20–24px`

### Radius and Elevation
- Radius: `8px` for buttons, `12–16px` for cards
- Shadows:
  - Card: `0 10px 30px rgba(0,0,0,0.1)`
  - Hover: `0 20px 40px rgba(0,0,0,0.15)`
  - Focus ring: `outline: 3px solid #FF9933; outline-offset: 2px;`

### Components
- Buttons:
  - Primary: deep navy bg, white text; hover: slightly lighter navy + elevation
  - Secondary: saffron bg, white text; hover: darker saffron + elevation
  - Outline: deep navy border/text, white bg; hover: navy bg + white text
- Cards:
  - White bg, subtle shadow, 2px transparent border; hover: border saffron
  - Header accent bar (`4px` height) for emphasis (events/achievements)
- Navigation:
  - Sticky, translucent navy gradient; mobile collapsible menu; focus-visible rings
- Forms:
  - 48px minimum tap target, clear labels, helper text, error states (red with icon)
  - Accessible color contrast for error/warning/info

### Motion
- Use subtle transitions (`0.2–0.3s`) for hover and focus
- List/table row hover: translateY `-2px`, small shadow increase
- Modal/dialog entrance: fade+scale; avoid abrupt animations
- Do not animate layout that impairs readability; respect reduced motion (`@media (prefers-reduced-motion: reduce)`)

### Accessibility (WCAG 2.1 AA)
- Heading structure in logical order (H1→H2→H3)
- Keyboard navigable menus, modals, forms
- Focus-visible styles for interactive elements
- Text contrast ratio ≥ 4.5:1 for body and ≥ 3:1 for large text
- Alt text for images; aria-labels for icons; descriptive button text

### Breakpoints
- Mobile: ≤480px
- Tablet: ≤768px
- Desktop: >768px

## Design Tokens (to map to CSS variables)

```css
:root {
  --color-primary: #1A237E;
  --color-accent: #FF9933;
  --color-secondary: #FFD700;
  --color-bg: #FFFFFF;
  --color-surface: #FFFFFF;
  --color-muted: #6C757D;
  --color-warm-gray: #F5F5F5;
  --color-danger: #DC3545;
  --color-success: #22C55E;
  --shadow-card: 0 10px 30px rgba(0,0,0,0.1);
  --shadow-hover: 0 20px 40px rgba(0,0,0,0.15);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;
  --space-10: 64px;
}
```

## Usage Patterns
- Hero sections: gradient navy background, white text, accent CTA
- Cards lists: balanced grid, consistent padding, hover affordance
- Admin tables: sticky header, zebra rows, filter chips with clear active state
- Payment flows: clear steps, reinforced copy for offline vs online, accessible affordances

