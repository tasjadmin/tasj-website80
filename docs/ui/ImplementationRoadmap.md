# UI Redesign Implementation Roadmap

## Goals
- Improve visual hierarchy and engagement with zero backend impact
- Maintain workflows and accessibility compliance (WCAG 2.1 AA)
- Optimize performance and cross-browser compatibility

## Phased Plan

### Phase 1 — Foundations
- Introduce design tokens mapped to existing CSS variables (`index.css`)
- Audit components for typography and spacing consistency
- Create global utility classes (spacing, layout, visually-hidden)
- Performance budget: enforce image sizes, lazy load, reduce shadows on mobile

### Phase 2 — Navigation & Hero
- Update navigation styling (sticky, gradient, accessible focus states)
- Redesign home hero (headline, subtitle, CTAs, background pattern)
- Validate keyboard navigation and focus order

### Phase 3 — Cards & Lists
- Standardize event cards: image, metadata, price blocks
- Add hover states (translateY, border accent)
- Harmonize spacing for About/Achievements/Values sections

### Phase 4 — Forms & Modals
- Payment method selector enhancements (icons, descriptive copy)
- Stripe & Offline forms visual alignment and error states
- Registration modal improvements (membership selector, dynamic pricing)

### Phase 5 — Admin
- Filter chips styles and feedback
- Actions column: Approve offline payments workflow
- Table readability: sticky header, zebra rows

### Phase 6 — Accessibility & QA
- Run WCAG automated checks; manual keyboard testing
- Cross-browser: Chrome, Safari, Firefox, Edge on desktop; iOS Safari, Android Chrome
- Performance: Lighthouse ≥ 90; reduce layout shifts; cache assets

## Non-Breaking Strategy
- No changes to Supabase or API calls
- CSS-only modifications and small component markup adjustments
- Feature flags optional for staged rollout

## Acceptance Criteria
- Visual hierarchy aligns with Style Guide
- All existing features preserved and accessible
- Performance and compatibility targets met

## Rollout
- Staging deploy with A/B preview
- Collect feedback, iterate, then production release

