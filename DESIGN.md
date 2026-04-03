# Design System — Krokyo

## Product Context
- **What this is:** AI-powered tutoring platform using the Socratic method
- **Who it's for:** Students studying for exams, self-paced learners
- **Space/industry:** EdTech, AI tutoring (competitors: Brilliant, Khan Academy, OpenNote)
- **Project type:** Web app with conversation-first interface
- **Vision:** Domain-agnostic — starts with statistics, expands to any subject

## Aesthetic Direction
- **Direction:** Warm Minimal
- **Decoration level:** Intentional — subtle gradients, soft shadows, no clutter
- **Mood:** Calm and focused, like a well-designed independent bookstore or thoughtful co-working space. Premium without being flashy. A serious learning tool that respects your time.
- **Reference sites:** OpenNote (for premium feel), Brilliant (for educational clarity)

## Typography
- **Display/Hero:** Satoshi Bold/700 — modern geometric, friendly but professional
  - Letter-spacing: -0.03em on hero (48px+), -0.02em on headings
- **Body:** DM Sans Regular/400 — highly readable, warm character
  - Line-height: 1.6-1.7 for comfortable reading
- **UI/Labels:** DM Sans Medium/500
- **Data/Tables:** DM Sans with tabular-nums
- **Code/Math:** JetBrains Mono — clear distinction for formulas
- **Loading:** Google Fonts + Fontshare CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
  ```
- **Scale:**
  - Hero: 3.5rem (56px)
  - H1: 2.5rem (40px)
  - H2: 1.75rem (28px)
  - H3: 1.25rem (20px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)
  - XSmall: 0.75rem (12px)

## Color
- **Approach:** Restrained with warm neutrals
- **Primary:** #0F766E (deep teal) — calm, trustworthy, works across subjects
- **Primary Light:** #14B8A6 — hover states, gradients
- **Primary Lighter:** #2DD4BF — accents, highlights
- **Accent:** #D97706 (warm amber) — used sparingly for highlights, NOT for primary CTAs
  - Use for: active states, special callouts, homepage CTAs
  - Don't use for: send buttons, in-flow actions
- **Neutrals:** Stone palette (warm grays)
  - 950: #0C0A09 (dark mode background)
  - 900: #1C1917 (text primary, dark surfaces)
  - 800: #292524
  - 700: #44403C
  - 600: #57534E (text secondary)
  - 500: #78716C (text muted)
  - 400: #A8A29E
  - 300: #D6D3D1
  - 200: #E7E5E4 (borders)
  - 100: #F5F5F4
  - 50: #FAFAF9 (background)
- **Semantic:**
  - Success: #10B981 (green)
  - Warning: #F59E0B (amber)
  - Error: #EF4444 (red)
  - Info: #3B82F6 (blue) — NOT teal, to distinguish from primary
- **Dark mode:** Invert surfaces (stone-950 background, stone-900 cards), reduce saturation on accents

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — generous whitespace for reading-heavy interface
- **Scale:**
  - 2xs: 2px
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px
  - 3xl: 64px
  - 4xl: 96px

## Layout
- **Approach:** Conversation-first
- **Grid:** Sidebar (280px fixed) + Main content (fluid, max-width 800px for chat)
- **Max content width:** 1200px for pages, 800px for chat interface
- **Border radius:**
  - sm: 6px (inline elements)
  - md: 10px (buttons, inputs)
  - lg: 14px (cards, messages)
  - xl: 20px (large cards, modals)
  - full: 9999px (pills, avatars)

## Motion
- **Approach:** Minimal-functional — only what aids comprehension
- **Easing:**
  - Enter: ease-out
  - Exit: ease-in
  - Move: ease-in-out
- **Duration:**
  - Micro: 50-100ms (button hover)
  - Short: 150ms (state transitions)
  - Medium: 200-250ms (panel slides)

## Shadows
- **Approach:** Soft and subtle for premium feel
- **sm:** 0 1px 2px rgba(28, 25, 23, 0.04)
- **md:** 0 4px 12px rgba(28, 25, 23, 0.06)
- **lg:** 0 8px 24px rgba(28, 25, 23, 0.08)
- Dark mode: increase opacity (0.2, 0.3, 0.4)

## Component Patterns

### Buttons
- **Primary:** Gradient background (primary → primary-light), white text, subtle shadow
- **Secondary:** Stone-100 background, stone border, stone-900 text
- **Ghost:** Transparent, primary text, primary/8% hover background
- **Accent:** Use only for homepage CTAs, not in-app actions

### Chat Interface
- **User messages:** Gradient background (primary → primary-light), rounded-lg, bottom-right corner sharper
- **Tutor messages:** White/stone-800 background, border, rounded-lg, bottom-left corner sharper
- **Tutor avatar:** Gradient ring (primary → primary-lighter) around avatar
- **Send button:** Primary gradient, NOT accent color
- **Feedback buttons:** Ghost style, primary color on active

### Alerts
- Each has distinct hue: green/amber/red/blue
- Light gradient background in light mode
- Transparent gradient in dark mode
- 1px border matching the hue

### Topic Pills
- Default: Stone-100 background
- Hover: Primary/10% background
- Active: Primary gradient, white text, subtle shadow

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Initial design system | Created by /design-consultation based on competitive research |
| 2026-04-02 | Deep teal as primary | Calm, trustworthy, works across subjects (domain-agnostic future) |
| 2026-04-02 | Warm stone neutrals | Warmer feel than cold grays, "coffee shop" vibe |
| 2026-04-02 | Amber for highlights only | Send button was amber → changed to teal for cohesion |
| 2026-04-02 | Blue for info alerts | Distinct from teal success alerts |
| 2026-04-02 | Premium refinements | Tighter letter-spacing, softer shadows, gradient ring on avatar |
| 2026-04-02 | Satoshi + DM Sans | Premium but accessible fonts, not overused |
