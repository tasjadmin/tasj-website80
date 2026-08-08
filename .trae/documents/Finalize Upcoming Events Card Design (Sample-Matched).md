## Goals
- Make the Learn More button clearly visible and placed properly inside the card
- Match the sample card layout (smaller text sizes, tidy spacing, category chip on image)
- Keep card size the same, preserve 3D carousel behaviour, and ensure the description is shown

## Visual Tweaks
- Reduce `circle-card-image` height to 150–160px to free space below
- Keep image top corners rounded; keep the category chip at top-left ("Event")
- Ensure the card content area has fixed height so the button is never pushed out

## Typography
- Title: font-size 1rem, font-weight 700, color `var(--navy)`
- Meta (date/time, location): font-size ~0.9rem, color `var(--medium-gray)`; keep icon + text spacing tight
- Description: font-size ~0.9rem, color `var(--medium-gray)`, clamp to 3 lines (2 lines on mobile), consistent line-height

## Button Placement & Style
- Use `btn btn-outline` with full width inside `.circle-card-actions`
- `.circle-card-actions`: `margin-top: auto`, `padding-top: 8–10px`, flex layout to keep the button pinned at the bottom
- Button: padding ~12px 16px, border-radius 12px, font-size ~0.95rem, font-weight 600

## Responsive Behaviour
- On mobile: slightly lower image height (~140px), description clamp to 2 lines, maintain button full width
- Ensure the card height remains fixed (`300x360`), so content doesn’t overflow

## File Changes (No code executed yet)
- Update `src/components/Home/UpcomingEvents3D.css`:
  - `.circle-card-image { height: 150–160px }`
  - `.circle-card-content { padding: 14–18px; gap: 8px; height: calc(100% - imageHeight) }`
  - `.circle-card-title { font-size: ~1rem; margin tightened }`
  - `.circle-meta { font-size: ~0.9rem }`
  - `.circle-card-description { font-size: ~0.9rem; -webkit-line-clamp: 3 (2 on mobile) }`
  - `.circle-card-actions { margin-top: auto; padding-top: ~8–10px; }`
  - `.circle-card-actions .btn { width: 100%; min-width: 0; font-size: ~0.95rem; }`
  - Ensure `.circle-card-category` chip style matches sample
- Update `src/components/Home/UpcomingEvents3D.js`:
  - Keep `Link` to `/events/${item.id}` in the button
  - Ensure `item.description` is rendered and visible under meta

## Verification
- Build and run the app; test desktop and mobile widths
- Confirm the button is fully visible and clickable inside the card
- Confirm the design matches the sample: category chip, title/meta sizing, description shown, button placement
- Navigate to event details via Learn More and verify correct routing

## Next Steps
- After approval, I will apply these CSS and small JSX adjustments, rebuild, and share a preview to confirm the exact look aligns with the sample.