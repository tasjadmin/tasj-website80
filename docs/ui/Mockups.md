# Updated UI Mockups (Annotated)

These mockups outline the redesigned structure, hierarchy, spacing, and interactions. They are implementation-ready guidance aligned with the Style Guide.

## Home
- Hero
  - Large headline (Display), supporting subtitle (H3), two CTAs: `Become a Member` (primary), `View Events` (secondary)
  - Background: deep navy gradient with subtle pattern overlay; focus-visible for CTAs
- Highlights (cards)
  - 3–4 cards with icon, title (H4), short description
  - Hover: translateY(-2px), border accent, subtle shadow increase
- Events preview
  - Grid of 3 event cards: banner image, date/time, member/non-member price (if applicable), CTA `Register`
  - Consistent spacing and alignment; responsive collapse to single column on mobile

## Events Listing
- Filters (chips): `All`, `Upcoming`, `Past`, `Category`
  - Active chip: accent bg, white text; others: outline navy
- Cards
  - Image, title (H3), metadata (date/time/location), prices (member/non-member), CTA `View Details`
  - Accessibility: labels for all metadata; keyboard reachable

## Event Detail
- Banner with category badge; title (H1); metadata row (date/time/location)
- Description and organizer message; registration status; deadline
- Registration modal
  - Membership selector (yes/no)
  - Attendees and price summary (unit + total)
  - Clear error states; 48px minimum tap targets; accessible labels

## Payment Page
- Amount header with total prominently displayed
- Payment method selector:
  - `Pay Online` (Stripe), `Pay via Stripe Link` (if available), `Pay Offline`
  - Each option: icon, title, summary text
- Forms:
  - Online: Stripe Elements card form; clear success/error states
  - Offline: instrument selector (cash/check/bank transfer), inputs for reference
  - Info box explaining pending verification

## Admin Dashboard
- Header with branding loop; navigation chips for sections
- Registrations
  - Filters: All, Online • Member, Online • Non-Member, Offline • Member, Offline • Non-Member
  - Table columns: Name, Email, Phone, Attendees, Membership, Payment Method, Payment Status, Actions
  - Approve action for offline/pending; “Approved” indicator otherwise

## Navigation
- Sticky top bar with translucent navy gradient
- Mobile: hamburger toggle; menu slides down; focus-visible rings
- Logo: emblem + abbreviated text on small screens

## Footer
- Compact layout with branding, links, contact, social icons
- Legal links and accessibility statement

## Responsive Behavior
- Tablet: reduce grid columns; tighten type scale by one step
- Mobile: single column; larger tap targets; collapsible sections as needed

