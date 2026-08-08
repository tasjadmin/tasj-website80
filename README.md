# TASJ Website - Telugu Association of Southern Jersey

A modern, responsive React website for the Telugu Association of Southern Jersey, built with comprehensive user stories and enhanced user experience.

## 🚀 Features

### Homepage Experience
- **TASJ Homepage Hero** - Captivating hero section with smooth animations and call-to-action buttons
- **Dynamic Content Carousel** - Auto-rotating carousel showcasing latest events and news
- **About/Mission Overview** - Engaging overview of TASJ's purpose and impact
- **Featured Events/News Grid** - Curated display of important events and community news

### Events Page
- **Interactive Event Calendar** - Visual calendar with event highlights and category color-coding
- **Event Listing with Filters** - Advanced filtering by category, month, and location
- **Event Details** - Comprehensive event information with registration capabilities

### Membership Page
- **Membership Pricing Table** - Clear pricing tiers with highlighted popular options
- **Multi-step Registration Form** - Guided registration process with progress indicators
- **Membership Benefits Accordion** - Detailed benefits explanation with interactive sections

### Additional Pages
- **About Us** - Organization history, values, and achievements
- **Leadership** - Team member profiles and leadership information
- **Gallery** - Photo and video collections from past events
- **Sponsors** - Sponsor recognition and partnership information
- **Contact** - Contact forms and organization information

## 🎨 Design System

### Brand Colors
- **Saffron Orange**: #FF6B35 (Primary)
- **Navy**: #1a1a2e (Secondary)
- **White**: #ffffff (Background)
- **Light Gray**: #f8f9fa (Section backgrounds)
- **Gold**: #FFD700 (Accent)

### Hero Section Background
- **Unified Background Image**: All hero sections use the same background image (`photo-1578662996442-48f60103fc96` from Unsplash)
- **Gradient Overlay**: Consistent gradient from `rgba(26, 35, 126, 0.85)` to `rgba(255, 153, 51, 0.4)`
- **Styling**: `background-size: cover`, `background-position: center`, `background-repeat: no-repeat`
- **Pages**: Home, About Us, Events, Membership, Leadership, Contact, Gallery

### Typography
- **Font Family**: Poppins (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Responsive scaling** for all screen sizes

### Interactive Elements
- **Hover Effects**: Lift animations, color transitions, and shadow enhancements
- **Smooth Scrolling**: Seamless navigation between sections
- **Loading Animations**: Fade-in and slide-up effects on scroll
- **Form Validation**: Real-time feedback and error handling

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks and functional components
- **React Router DOM** - Client-side routing
- **Framer Motion** - Smooth animations and transitions
- **React Intersection Observer** - Scroll-triggered animations
- **CSS3** - Custom styling with CSS Grid and Flexbox
- **Responsive Design** - Mobile-first approach

## 📱 Responsive Design

The website is fully responsive and optimized for:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

### Mobile UX Enhancements
- **Touch-Optimized**: All interactive elements meet 44px minimum tap target (WCAG AAA)
- **Smart Navigation**: Auto-closes menu on navigation, body scroll lock when menu open
- **Larger Tap Targets**: Buttons (48px), social icons (48px), menu items (56px)
- **Optimized Typography**: Responsive font sizes and line heights for readability
- **Back to Top Button**: Larger on mobile (48px), positioned to avoid footer overlap
- **No Tap Flash**: Removed `-webkit-tap-highlight-color` for cleaner interactions

## ♿ Accessibility Features

- **Keyboard Navigation** - Full keyboard accessibility
- **Focus States** - Clear focus indicators
- **ARIA Labels** - Screen reader support
- **Semantic HTML** - Proper heading hierarchy and structure
- **Color Contrast** - WCAG compliant color combinations

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TASJ_Website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## 📁 Project Structure

```
TASJ_Website/
├── docs/                    # 📚 All documentation (organized by category)
│   ├── README.md           # Documentation index
│   ├── setup/              # Setup guides (Supabase, Netlify, Stripe)
│   ├── payment/            # Payment system documentation
│   ├── mobile/             # Mobile responsiveness guides
│   ├── features/           # Feature-specific documentation
│   └── ui/                 # UI/UX design specs
├── src/
│   ├── components/
│   │   ├── Home/
│   │   ├── Events/
│   │   ├── Membership/
│   │   ├── About/
│   │   ├── Admin/
│   │   ├── Payment/
│   │   ├── Navigation.js
│   │   └── Footer.js
│   ├── pages/
│   ├── lib/                # Utilities (Supabase client, session manager)
│   ├── contexts/           # React contexts
│   ├── App.js
│   └── index.js
├── public/
└── README.md               # This file
```

> **📚 For detailed documentation, see [docs/README.md](docs/README.md)**

## 🎯 User Stories Implementation

The website implements comprehensive user stories covering:

1. **Homepage Experience** - Engaging first-time visitor experience
2. **Membership Journey** - Complete membership registration process
3. **Event Discovery** - Easy event browsing and filtering
4. **Community Engagement** - Multiple ways to connect and participate
5. **Information Access** - Clear navigation and content organization

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder, organized by category:

- **[Documentation Index](docs/README.md)** - Complete documentation navigation
- **[Setup Guides](docs/setup/)** - Supabase, Netlify, and Stripe configuration
- **[Payment System](docs/payment/)** - Complete payment integration documentation
- **[Mobile Responsiveness](docs/mobile/)** - Mobile UX and responsive design
- **[Features](docs/features/)** - Individual feature documentation
- **[UI/UX Design](docs/ui/)** - Design system and style guide

## 👨‍💻 Development

### Adding New Events
Events are managed in the `EventCalendar.js` and `EventListing.js` components. Update the events array with new event data.

### Updating Content
Content can be easily updated by modifying the respective component files. All text content is centralized within components for easy maintenance.

### Styling Changes
Global styles are defined in `index.css` with CSS custom properties for easy color and typography updates.

## 📞 Support

For technical support or questions about the website implementation, please contact the development team.

## 📄 License

This project is proprietary to the Telugu Association of Southern Jersey (TASJ).

---

**Built with ❤️ for the TASJ Community**
