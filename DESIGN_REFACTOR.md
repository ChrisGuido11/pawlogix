# DESIGN_REFACTOR.md — PawLogix Visual Redesign Guide

## CRITICAL: READ THIS FIRST

This document defines a complete visual redesign for PawLogix. You are ONLY changing how the app looks and feels — the layout, colors, typography, spacing, shapes, animations, and illustrations. You are NOT changing any features, functionality, navigation structure, data flow, or business logic. Every screen keeps its existing purpose and content. You are reskinning the app with a new visual language.

**Do NOT:**
- Add new screens or remove existing ones
- Change any navigation routes or flow logic
- Modify database queries, API calls, or state management
- Add features that don't already exist (no search bars, no coupon banners, no vet finder)
- Remove any existing features (record scanning, AI interpretation, pet profiles, health trends, settings)

**Do:**
- Replace every color, font, spacing value, border radius, shadow, and layout treatment
- Add the curved header zone pattern to every screen
- Add character illustrations to empty states, onboarding, and loading screens
- Redesign cards, buttons, inputs, badges, and navigation to match the new visual system
- Add micro-interactions and animations per the spec below

---

## THE VISUAL LANGUAGE (What we're replicating)

The reference design uses a distinct visual formula:

1. **Curved sky-blue header zones** that flow into white content areas — every screen has a colored top section with a smooth curve or wave transition into the main content
2. **3D-style mascot character illustrations** — cute, rounded, warm animal characters that appear in onboarding, empty states, promotional cards, and loading screens
3. **Clean white cards** floating on a very light background with subtle shadows
4. **Playful pill-shaped elements** — category filters, badges, and tags use full-round pill shapes
5. **Outline-to-filled icon transitions** in the bottom nav with a colored active state
6. **Generous whitespace** and breathing room between elements
7. **Rounded, friendly typography** — bold headings with warm weight, lighter body text
8. **Soft elevation** — cards feel like they float slightly, using subtle multi-layer shadows
9. **Accent color pops** — star ratings in gold, hearts in coral/pink, active states in the primary blue

---

## NEW COLOR PALETTE

Replace ALL existing colors in `tailwind.config.js` and throughout the app:

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `primary` | Sky Blue | `#5BC5F2` | Header backgrounds, active tab icons, primary buttons, links |
| `primary-dark` | Deep Sky | `#3BA8D8` | Pressed button states, header gradient end |
| `primary-light` | Ice Blue | `#E8F6FC` | Light blue tinted backgrounds, chip/badge backgrounds |
| `secondary` | Warm Amber | `#FFBE3D` | Star ratings, achievement badges, attention-needed highlights |
| `accent-coral` | Soft Coral | `#FF6B8A` | Favorite hearts, urgent flags, love/care accents |
| `background` | Snow | `#F5F5F5` | Main screen background behind cards |
| `surface` | White | `#FFFFFF` | Cards, modals, bottom sheets, content areas |
| `header-gradient-start` | Bright Sky | `#5BC5F2` | Top of header gradient |
| `header-gradient-end` | Medium Sky | `#4AB8E8` | Bottom of header gradient (slightly deeper) |
| `text-heading` | Dark Charcoal | `#1E1E2D` | All headings, bold text |
| `text-body` | Charcoal | `#3D3D4E` | Body text, descriptions |
| `text-muted` | Cool Gray | `#9E9EB0` | Timestamps, captions, placeholder text |
| `text-on-primary` | White | `#FFFFFF` | Text on blue header/buttons |
| `success` | Fresh Green | `#34C759` | Normal range indicators, success states, checkmarks |
| `warning` | Warm Orange | `#FFAA33` | Borderline values, watch flags |
| `error` | Alert Red | `#E53E3E` | Urgent flags, out-of-range values, destructive actions |
| `border` | Soft Gray | `#EAEAEA` | Card borders (very subtle), dividers |
| `disabled` | Muted | `#D0D0D8` | Disabled buttons, inactive toggles |
| `tab-inactive` | Slate Gray | `#B0B0C0` | Inactive bottom nav icons |

### Updated tailwind.config.js
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#5BC5F2',
        'primary-dark': '#3BA8D8',
        'primary-light': '#E8F6FC',
        secondary: '#FFBE3D',
        'accent-coral': '#FF6B8A',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        'text-heading': '#1E1E2D',
        'text-body': '#3D3D4E',
        'text-muted': '#9E9EB0',
        success: '#34C759',
        warning: '#FFAA33',
        error: '#E53E3E',
        border: '#EAEAEA',
        disabled: '#D0D0D8',
        'tab-inactive': '#B0B0C0',
      }
    }
  }
}
```

---

## NEW TYPOGRAPHY

Install and use **Nunito** from Google Fonts via `expo-font`. Nunito has rounded terminals that match the playful, friendly personality of the reference design. If Nunito cannot be loaded, fall back to system fonts.

| Element | Font | Size | Weight | Color | Line Height |
|---------|------|------|--------|-------|-------------|
| Screen Title (in header) | Nunito | 24px | Bold (700) | text-on-primary (#FFF) | 32px |
| Screen Title (in content) | Nunito | 28px | Bold (700) | text-heading | 36px |
| Section Heading | Nunito | 20px | SemiBold (600) | text-heading | 28px |
| Card Title | Nunito | 17px | SemiBold (600) | text-heading | 24px |
| Body Text | Nunito | 15px | Regular (400) | text-body | 22px |
| Secondary Text | Nunito | 13px | Regular (400) | text-muted | 18px |
| Caption/Label | Nunito | 11px | Medium (500) | text-muted | 16px |
| Button Text (primary) | Nunito | 16px | Bold (700) | text-on-primary | 22px |
| Button Text (secondary) | Nunito | 16px | SemiBold (600) | primary | 22px |
| Tab Label | Nunito | 10px | Medium (500) | primary or tab-inactive | 14px |

---

## THE CURVED HEADER PATTERN

This is the single most defining visual element. EVERY screen in the app gets this treatment.

### How it works:
- The top portion of each screen has a **solid sky-blue background** (`primary` #5BC5F2) that extends from the very top of the screen (behind the status bar) down approximately **180–220px**
- At the bottom edge of this blue zone, the shape **curves downward** with a smooth concave arc into the white/light-gray content area below
- The status bar text/icons are WHITE on this blue background
- The screen title and any top-level controls (bell icon, settings icon) sit INSIDE this blue header zone in white text

### Implementation approach:
Create a reusable `<CurvedHeader>` component:

```
Structure:
┌──────────────────────────────────┐
│  STATUS BAR (white text)          │  ← bg-primary, extends behind status bar
│                                   │
│  Screen Title        🔔 icon     │  ← White text, white icon
│                                   │
│  Optional subtitle or greeting    │  ← White text, opacity 80%
│                                   │
╰──────────────────────────────────╯  ← Smooth downward curve (SVG or border-radius trick)
│                                   │
│  CONTENT AREA (white/light bg)    │  ← bg-background (#F5F5F5)
```

**Implementation options (pick the simplest that works):**

Option A — SVG wave: Use a small SVG shape at the bottom of the blue View that creates the curve. The SVG is positioned absolutely, full width, ~30-40px tall, with a concave arc path, filled with the background color (#F5F5F5) overlapping the bottom of the blue zone.

Option B — Oversized border-radius: Make the blue header View slightly taller, then give the content area container a large top border-radius (30-40px) with bg-background, and use negative margin-top to overlap the blue zone. This creates the illusion of the blue curving away.

Option C — React Native's `borderBottomLeftRadius` and `borderBottomRightRadius` on the header View itself (set to 30-40px). Simplest but the curve is less smooth.

**Use Option B as the primary approach** — it matches the reference most closely and is pure NativeWind:

```
<View className="bg-primary pt-[STATUS_BAR_HEIGHT + 16] pb-12 px-4">
  {/* Header content: title, icons */}
</View>
<View className="bg-background -mt-8 rounded-t-[30px] flex-1 pt-6 px-4">
  {/* Main scrollable content */}
</View>
```

### Per-screen header content:

| Screen | Header Title | Header Right Icon | Header Extra |
|--------|-------------|-------------------|--------------|
| Home Dashboard | "Welcome back! 👋" + subtitle "How is [PetName] today?" | Bell icon (notifications) | — |
| Pets List | "My Pets" | — | — |
| Records List | "Health Records" | — | Filter pills below title |
| Profile/Settings | "Settings" | — | — |
| Pet Detail | "[PetName]" | Edit icon | Pet photo circle overlapping header/content boundary |
| Record Detail | "Record Details" | Share icon | — |
| Record Scan | "Scan Record" | — | — |
| AI Chat | "Ask About This Record" | — | — |
| Onboarding | NO curved header — uses full-screen illustration layout instead |

---

## CARD REDESIGN

Replace all existing card styles with this new pattern:

### Standard Card
```
- Background: surface (#FFFFFF)
- Border radius: 16px (rounded-2xl)
- Shadow: 0px 2px 12px rgba(0, 0, 0, 0.06) — softer and more diffused than before
- Padding: 16px (p-4)
- Border: NONE (remove all border-border). The shadow provides elevation.
- Margin between cards: 12px (mb-3)
```

### Pet Profile Card (used in Pet List)
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │ Pet  │  Pet Name      (>)    │
│  │Photo │  Breed • Age          │
│  │(64px)│  ★ Weight: 12kg       │
│  └──────┘                       │
└─────────────────────────────────┘

- Pet photo: 64x64px circle, rounded-full, border-2 border-primary-light
- Name: text-heading, 17px, SemiBold
- Breed + Age: text-muted, 13px
- Chevron right icon on the far right, text-muted
- If pet has recent urgent flags: small coral dot (8px) top-right of photo
```

### Health Record Card (used in Records List)
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │Record│  Record Type Badge    │
│  │ Type │  Date                 │
│  │ Icon │  "3 items flagged"    │
│  │(48px)│                 (>)   │
│  └──────┘                       │
└─────────────────────────────────┘

- Icon container: 48x48px, rounded-xl (12px), bg-primary-light, centered icon in primary color
- Record type badge: pill shape, bg-primary-light, text-primary, text-xs
- Flagged items count: text-warning or text-error depending on severity
```

### AI Interpretation Card (used in Record Detail)
```
┌─────────────────────────────────┐
│  Section Title                  │
│  ───────────────────────────    │
│  Content text in body style     │
│  with generous line height      │
│  and readable paragraph         │
│  spacing                        │
│                                 │
│  [Flagged items use colored     │
│   left border strip: 3px wide, │
│   success/warning/error color]  │
└─────────────────────────────────┘

- Left border accent: 3px wide strip on the left edge of each interpretation section
- Green (#34C759) for normal, Amber (#FFAA33) for watch, Red (#E53E3E) for urgent
- This replaces the old badge-only system — the colored left border is more visual and scannable
```

### Promotional/Feature Card (used on Dashboard for "Scan a Record" CTA)
```
┌─────────────────────────────────┐
│                                 │
│  Scan your pet's       [Mascot │
│  vet record for         illust-│
│  instant clarity!       ration]│
│                                 │
│  ┌──────────────┐              │
│  │  Scan Now →  │              │
│  └──────────────┘              │
│                                 │
└─────────────────────────────────┘

- Background: gradient from primary (#5BC5F2) to primary-dark (#3BA8D8)
- All text: white
- Border radius: 20px (rounded-[20px])
- Right side: mascot character illustration (dog/cat with magnifying glass or stethoscope)
- Button inside: white bg, primary text, rounded-full (pill), px-6 py-2.5
- This is the HERO card at the top of the dashboard, full width, ~160px height
```

---

## BUTTON REDESIGN

### Primary Button
```
- Background: primary (#5BC5F2)
- Text: white, Nunito Bold, 16px
- Border radius: 12px (rounded-xl)
- Padding: py-3.5 px-6
- Shadow: 0px 4px 12px rgba(91, 197, 242, 0.3) — brand-tinted shadow
- Active/pressed: scale to 0.97, bg primary-dark (#3BA8D8), 100ms
- Full width on forms, auto width elsewhere
```

### Secondary Button
```
- Background: transparent
- Border: 1.5px solid primary (#5BC5F2)
- Text: primary, Nunito SemiBold, 16px
- Border radius: 12px
- Active/pressed: bg primary-light (#E8F6FC), 100ms
```

### Small Pill Button (used for inline actions, "See all", etc.)
```
- Background: primary-light (#E8F6FC)
- Text: primary (#5BC5F2), Nunito Medium, 13px
- Border radius: rounded-full
- Padding: py-1.5 px-4
- Active/pressed: bg primary, text white, 150ms
```

### Destructive Button (Delete Account, etc.)
```
- Background: transparent
- Border: 1.5px solid error (#E53E3E)
- Text: error, Nunito SemiBold
- Active/pressed: bg error/10
```

---

## FILTER/CATEGORY PILLS

Used where the app has category selections (record type filter on Records List, pet type on Pet Create):

```
┌──────┐  ┌──────────┐  ┌───────────────┐
│  All │  │ Popular  │  │ Recommended  │
└──────┘  └──────────┘  └───────────────┘

Active pill:
  - Background: primary (#5BC5F2)
  - Text: white, Nunito Medium, 14px
  - Border radius: rounded-full
  - Padding: py-2 px-4
  - Shadow: 0px 2px 8px rgba(91, 197, 242, 0.25)

Inactive pill:
  - Background: transparent
  - Text: text-muted (#9E9EB0), Nunito Medium, 14px
  - No border
  - Padding: py-2 px-4

Animation: when tapping a new pill, the blue background slides/morphs from the old pill to the new one (use react-native-reanimated shared layout animation or simple spring translateX). Duration: 200ms.
```

For PawLogix, use these on:
- **Records List**: "All", "Lab Results", "Vet Records", "Prescriptions"
- **Pet Create species selector**: show Dog and Cat as large tappable pills (not a dropdown)

---

## BOTTOM TAB NAVIGATION

Replace the current tab bar completely:

```
┌───────────────────────────────────────────┐
│                                           │
│   🏠        🐾        📷        👤       │
│  Home      Health    Scan     Profile     │
│                                           │
└───────────────────────────────────────────┘

- Background: white (#FFFFFF)
- Top border: 0.5px solid rgba(0,0,0,0.06) — barely visible
- Height: 60px (plus safe area bottom padding)
- Shadow: 0px -2px 10px rgba(0,0,0,0.04) — very subtle upward shadow

Icons:
- Size: 24px
- Inactive: outline variant, color tab-inactive (#B0B0C0)
- Active: FILLED variant, color primary (#5BC5F2)
- Transition: cross-fade from outline to filled, 150ms

Labels:
- Size: 10px, Nunito Medium
- Inactive: tab-inactive color
- Active: primary color

Active indicator: 
- A small dot (6px circle) in primary color appears ABOVE the active icon (not below)
- Or: the active icon + label group scales up slightly (1.05x) with spring animation

Scan tab (center):
- The Scan tab should be visually elevated — use a 52px circular button with primary background and white camera icon, raised 8px above the tab bar surface
- This makes the core action (scanning a vet record) unmissable
- Shadow: 0px 4px 12px rgba(91, 197, 242, 0.3)
```

Tab mapping:
| Position | Label | Icon (outline) | Icon (filled) | Route |
|----------|-------|----------------|---------------|-------|
| 1 | Home | home-outline | home | /(tabs)/ |
| 2 | Health | heart-outline | heart | /(tabs)/pets |
| 3 | Scan | camera-outline (in elevated circle) | camera | /record/scan |
| 4 | Profile | person-outline | person | /(tabs)/profile |

NOTE: The "Records" tab merges into the Health tab. Pet list and records are accessed from the Home dashboard and Health tab respectively. This simplifies the nav to 4 tabs max. If you cannot change navigation structure, keep the existing 4 tabs but apply this visual treatment.

---

## INPUT FIELDS

```
- Background: surface (#FFFFFF)  
- Border: 1.5px solid border (#EAEAEA)
- Border radius: 14px (rounded-[14px]) — more rounded than before
- Padding: px-4 py-3.5
- Font: Nunito Regular, 15px, text-body
- Placeholder: Nunito Regular, 15px, text-muted

Focus state:
  - Border color: primary (#5BC5F2)
  - Shadow: 0px 0px 0px 3px rgba(91, 197, 242, 0.15) — blue focus ring

Error state:
  - Border color: error (#E53E3E)
  - Error text below: Nunito Regular, 12px, text-error, mt-1

Search input (if used):
  - Same as above but with a search icon (🔍) on the left inside the input, 20px, text-muted
  - And optionally a filter icon button on the right outside the input (48x48, rounded-[14px], border, centered sliders icon)
```

---

## MASCOT CHARACTER ILLUSTRATION SYSTEM

The reference design uses 3D-rendered animal mascot characters. For PawLogix, use a consistent illustration style for character moments throughout the app. Since we cannot generate 3D renders in code, use one of these approaches:

### 3D-Style Mascot Character Illustrations

PawLogix uses custom 3D-style mascot character illustrations throughout the app. These are warm, rounded, friendly animal characters rendered in a soft 3D style — similar to the reference design's Shiba Inu character. They bring personality, emotional connection, and brand identity to every screen.

**Character design specs:**
- Style: Soft 3D render look — rounded forms, subtle shading, warm lighting, friendly expressions
- Characters: A golden/orange dog (primary mascot) and a gray/white cat (secondary mascot)
- Color palette: Characters use warm orange/golden tones (matching the reference Shiba), with primary blue (#5BC5F2) used for accessories, backgrounds, and props
- Proportions: Slightly chibi/oversized head, large expressive eyes, small rounded body
- Props change per context: stethoscope, magnifying glass, clipboard, phone, book, chart, etc.
- Background: Each character sits on or in front of a soft blue (#E8F6FC) organic blob/circle shape

**Source these illustrations using one of these methods:**
1. **AI image generation** — Use Midjourney, DALL-E, or Leonardo.ai to generate a consistent set of 3D mascot poses. Prompt style: "cute 3D rendered golden dog character, Pixar style, rounded forms, friendly expression, simple clean background, mobile app mascot"
2. **Illustration marketplace** — Source from Creative Market, Envato Elements, or similar. Search "3D pet mascot illustrations" or "3D animal character pack"
3. **Custom commission** — Hire an illustrator on Fiverr/Upwork for a consistent 12-pose character set

**Store illustrations as PNG files with transparent backgrounds in `/assets/illustrations/`:**

```
assets/
└── illustrations/
    ├── mascot-welcome.png          (dog waving, for onboarding screen 1)
    ├── mascot-magnify.png          (cat with magnifying glass, for onboarding screen 2)
    ├── mascot-chart.png            (dog + cat with health chart, for onboarding screen 3)
    ├── mascot-stethoscope.png      (dog with stethoscope, for dashboard hero card)
    ├── mascot-sleeping.png         (sleeping dog/cat, for pet list empty state)
    ├── mascot-confused.png         (dog looking at paper confused, for records empty state)
    ├── mascot-searching.png        (dog with magnifying glass, for record processing/loading)
    ├── mascot-reading.png          (cat reading a book, for AI chat empty state)
    ├── mascot-running.png          (dog on treadmill, for health trends empty state)
    ├── mascot-tangled.png          (sad dog tangled in cables, for error states)
    ├── mascot-celebrating.png      (happy dog jumping, for success states)
    └── mascot-waving-goodbye.png   (sad dog waving, for delete account confirmation)
```

**Display these using `expo-image` (never react-native Image):**
```jsx
import { Image } from 'expo-image';

<Image
  source={require('@/assets/illustrations/mascot-welcome.png')}
  style={{ width: 240, height: 240 }}
  contentFit="contain"
/>
```

**If illustrations are not yet available:** Use a placeholder View — a 120-160px circle with `bg-primary-light` (#E8F6FC) and a large paw print icon (Ionicons `paw`, 64px, primary color) centered inside. This placeholder MUST be replaced with actual 3D mascot illustrations before shipping. Add a TODO comment on every placeholder: `{/* TODO: Replace with 3D mascot illustration — mascot-[pose].png */}`

### Where mascot illustrations appear in PawLogix:

| Screen | Character Moment | Illustration File | Size |
|--------|-----------------|-------------------|------|
| Onboarding Screen 1 | Hero illustration | `mascot-welcome.png` | 240px |
| Onboarding Screen 2 | Hero illustration | `mascot-magnify.png` | 240px |
| Onboarding Screen 3 | Hero illustration | `mascot-chart.png` | 240px |
| Home Dashboard hero card | Inside the "Scan a Record" CTA card | `mascot-stethoscope.png` | 100px |
| Pet List empty state | Centered above "Add your first pet" | `mascot-sleeping.png` | 140px |
| Records List empty state | Centered above "Scan your first record" | `mascot-confused.png` | 140px |
| Record Processing/Loading | Animated pulse | `mascot-searching.png` | 80px |
| AI Chat empty state | Above "Ask a question about this record" | `mascot-reading.png` | 120px |
| Health Trends empty state | Above "More records = better trends" | `mascot-running.png` | 120px |
| Error states | Centered above error message | `mascot-tangled.png` | 120px |
| Success (record interpreted) | Brief celebration | `mascot-celebrating.png` | 80px |
| Delete Account confirmation | In the confirmation dialog | `mascot-waving-goodbye.png` | 80px |

---

## ONBOARDING REDESIGN

The reference design's onboarding uses a full-screen layout with a large character illustration taking up the top 55% of the screen, a blue accent shape behind the character, pagination dots, centered title + subtitle, and a forward button.

### PawLogix onboarding layout (per screen):

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│    ┌────────────────────────┐    │
│    │                        │    │
│    │   CHARACTER            │    │   ← 240px tall illustration
│    │   ILLUSTRATION         │    │     on a soft blue blob/shape
│    │                        │    │     background (#E8F6FC circle
│    │                        │    │     or organic blob behind it)
│    └────────────────────────┘    │
│                                  │
│          ● ○ ○                   │   ← Pagination dots: primary active, gray inactive
│                                  │
│    Big Bold Title Text           │   ← Nunito Bold, 28px, text-heading, center
│                                  │
│    Subtitle description text     │   ← Nunito Regular, 15px, text-muted, center
│    that explains the feature     │     max 2 lines
│                                  │
│                                  │
│         ┌──────────┐             │
│         │    →     │             │   ← 56x56px circle button, bg-primary
│         └──────────┘             │     white arrow icon, shadow
│                                  │     On last screen: "Get Started" full-width button instead
└──────────────────────────────────┘
```

### Screen content:
| Screen | Title | Subtitle | Character |
|--------|-------|----------|-----------|
| 1 | "Scan any vet record" | "Take a photo or upload — we'll handle the rest" | Dog holding up a document |
| 2 | "AI translates the jargon" | "Complex medical terms become plain English instantly" | Cat with magnifying glass over text |
| 3 | "Track your pet's health" | "See trends, get reminders, stay on top of care" | Dog + cat with health chart going up |

Pagination dots: 8px circles, 8px gap. Active = primary (#5BC5F2), 24px wide pill shape. Inactive = #D0D0D8.

Transition between screens: horizontal slide with spring animation (300ms, slight overshoot).

---

## HOME DASHBOARD REDESIGN

```
┌──────────────────────────────────┐
│  CURVED BLUE HEADER              │
│  "Welcome back! 👋"              │
│  "How is Luna today?"       🔔   │
╰──────────────────────────────────╯
│                                   │
│  ┌─────────────────────────────┐  │  ← Hero CTA Card (gradient blue)
│  │  Scan your pet's   [Dog    │  │    with mascot illustration
│  │  vet record!       illust] │  │
│  │  ┌─────────────┐          │  │
│  │  │ Scan Now →  │          │  │
│  │  └─────────────┘          │  │
│  └─────────────────────────────┘  │
│                                   │
│  Active Pet                       │
│  ┌─────────────────────────────┐  │  ← Pet card with photo, name, quick stats
│  │ 🐕 Luna  •  Golden Retriever│  │
│  │ 3 yrs  •  28kg  •  ❤️ Healthy│  │
│  └─────────────────────────────┘  │
│                                   │
│  Recent Records           See all │
│  ┌──────────────┐ ┌──────────────┐│  ← Horizontal scroll of record cards
│  │ Lab Results  │ │ Vet Visit   ││
│  │ Feb 15, 2026 │ │ Feb 1, 2026 ││
│  │ 2 flagged    │ │ All clear ✓ ││
│  └──────────────┘ └──────────────┘│
│                                   │
│  Health Snapshot                  │
│  ┌──────────┐ ┌──────────┐       │  ← Two small stat tiles side by side
│  │ Weight   │ │ Next     │       │
│  │ 28 kg    │ │ Vaccine  │       │
│  │ ↑ +0.5kg │ │ Mar 15   │       │
│  └──────────┘ └──────────┘       │
│                                   │
└──────────────────────────────────┘
```

Key design details:
- The hero CTA card has a gradient primary background and a mascot character illustration on the right side (~100px)
- Recent records use a horizontal FlatList/ScrollView showing compact record cards
- Stat tiles use bg-primary-light (#E8F6FC) background with primary colored numbers/icons
- If no records yet: replace "Recent Records" section with an empty state card featuring the mascot + "Scan your first record to get started!" + CTA

---

## PET DETAIL VIEW REDESIGN

```
┌──────────────────────────────────┐
│  CURVED BLUE HEADER              │
│  "Luna"                     ✏️   │
╰──────────┬───────────────────────╯
│          │                        │
│    ┌─────┴──────┐                 │  ← Pet photo (96px circle) centered,
│    │   Pet      │                 │    overlapping the header/content boundary
│    │   Photo    │                 │    with white border (3px)
│    └────────────┘                 │
│    Golden Retriever • 3 yrs      │  ← Centered under photo
│                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐     │  ← Quick stat pills in a row
│  │28 kg │ │Female│ │Spayed│     │    bg-primary-light, rounded-full
│  └──────┘ └──────┘ └──────┘     │
│                                   │
│  Health Records           See all │
│  [Record cards list...]           │
│                                   │
│  Health Trends                    │
│  [Charts if data exists]          │
│                                   │
└──────────────────────────────────┘
```

The pet photo overlapping the header boundary is a signature move from the reference design — the avatar sits at the intersection of the blue curve and the white content, anchored by a white circular border.

---

## RECORD DETAIL / AI INTERPRETATION REDESIGN

```
┌──────────────────────────────────┐
│  CURVED BLUE HEADER              │
│  "Lab Results"              📤   │
╰──────────────────────────────────╯
│                                   │
│  Feb 15, 2026 • Luna             │  ← Date and pet name
│                                   │
│  ┌─────────────────────────────┐  │
│  │ 📋 AI Summary               │  │  ← Card with left accent border (primary)
│  │ ─────────────────────────── │  │
│  │ Luna's bloodwork looks      │  │
│  │ mostly normal with two      │  │
│  │ values to discuss with      │  │
│  │ your vet...                 │  │
│  └─────────────────────────────┘  │
│                                   │
│  Detailed Findings                │
│                                   │
│  ┌─────────────────────────────┐  │  ← Green left border = normal
│  │ ✅ Complete Blood Count     │  │
│  │ All values within normal    │  │
│  │ range for Golden Retrievers │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │  ← Amber left border = watch
│  │ ⚠️ Liver Enzymes (ALT)      │  │
│  │ 78 U/L — slightly elevated  │  │
│  │ Normal range: 10-65 U/L     │  │
│  │ ┌───────────────────┐       │  │  ← Horizontal bar showing value position
│  │ │████████████░░░░░░░│       │  │     in the normal range
│  │ └───────────────────┘       │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │ 💬 Questions for your vet   │  │
│  │ • Ask about the ALT level   │  │
│  │ • Discuss follow-up timing  │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │ 💬 Ask AI a Follow-Up       │  │  ← Full-width button, primary
│  └─────────────────────────────┘  │
│                                   │
│  ⚕️ AI interpretation — always   │  ← Disclaimer banner
│  consult your vet                │
│                                   │
└──────────────────────────────────┘
```

Each finding card uses a **3px left border** color-coded by severity. The horizontal range bar for lab values is a standout visual — a rounded pill (height 8px, rounded-full) with the normal range in green and the actual value marked with a small circle indicator.

---

## SETTINGS/PROFILE REDESIGN

```
┌──────────────────────────────────┐
│  CURVED BLUE HEADER              │
│  "Settings"                      │
╰──────────────────────────────────╯
│                                   │
│  ┌─────────────────────────────┐  │  ← Account card (if anonymous)
│  │ 🔒 Create an Account        │  │     bg-primary-light, rounded-2xl
│  │ Back up your data and       │  │
│  │ access it on any device     │  │
│  │         ┌────────────────┐  │  │
│  │         │  Sign Up →     │  │  │     Primary button inside
│  │         └────────────────┘  │  │
│  │ Already have an account?    │  │     Subtle text link below
│  │ Log In                      │  │
│  └─────────────────────────────┘  │
│                                   │
│  Notifications                    │  ← Section heading
│  ┌─────────────────────────────┐  │
│  │ Medication Reminders    🔘  │  │  ← Toggle rows, card style
│  │─────────────────────────────│  │     Divider between rows
│  │ Vaccine Reminders       🔘  │  │
│  └─────────────────────────────┘  │
│                                   │
│  Support                          │
│  ┌─────────────────────────────┐  │
│  │ Privacy Policy          (>) │  │  ← Grouped list card
│  │─────────────────────────────│  │
│  │ Terms of Service        (>) │  │
│  │─────────────────────────────│  │
│  │ Support & FAQ           (>) │  │
│  └─────────────────────────────┘  │
│                                   │
│  Data                             │
│  ┌─────────────────────────────┐  │
│  │ Export My Data          (>) │  │
│  │─────────────────────────────│  │
│  │ 🔴 Delete Account       (>) │  │  ← Red text for destructive action
│  └─────────────────────────────┘  │
│                                   │
│  PawLogix v1.0.0 (Beta)          │  ← Centered, text-muted, small
│                                   │
└──────────────────────────────────┘
```

Settings uses **grouped card sections** (like iOS Settings) — each group is a white card with dividers between rows. Section headings sit OUTSIDE the cards in text-muted, uppercase, 12px, with letter-spacing.

---

## SHADOWS (Updated)

Replace all shadow values throughout the app:

```
Card shadow (default):
  shadow: 0px 2px 12px rgba(0, 0, 0, 0.06)
  NativeWind: Use style prop for custom shadow

Elevated card (hero CTA, modals):
  shadow: 0px 4px 20px rgba(0, 0, 0, 0.08)

Primary button shadow:
  shadow: 0px 4px 12px rgba(91, 197, 242, 0.3)

Tab bar shadow:
  shadow: 0px -2px 10px rgba(0, 0, 0, 0.04)

Bottom sheet shadow:
  shadow: 0px -4px 20px rgba(0, 0, 0, 0.1)

Elevated scan button (tab bar):
  shadow: 0px 4px 14px rgba(91, 197, 242, 0.35)
```

All shadows use the softer, more diffused style from the reference — never harsh drop shadows.

---

## BORDER RADIUS (Updated)

| Element | Radius | NativeWind |
|---------|--------|------------|
| Cards, containers | 16px | `rounded-2xl` |
| Hero/feature cards | 20px | `rounded-[20px]` |
| Buttons (standard) | 12px | `rounded-xl` |
| Pill buttons, badges, pills | 9999px | `rounded-full` |
| Input fields | 14px | `rounded-[14px]` |
| Bottom sheet | 24px (top only) | `rounded-t-[24px]` |
| Curved header content overlap | 30px (top only) | `rounded-t-[30px]` |
| Profile photos, avatars | Full circle | `rounded-full` |
| Image thumbnails | 12px | `rounded-xl` |
| Stat tiles | 14px | `rounded-[14px]` |
| Tab bar scan button | Full circle | `rounded-full` |

---

## SPACING (Updated)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon-to-label gap, tight related items |
| `space-2` | 8px | Inline padding, small gaps |
| `space-3` | 12px | Between cards, internal card element gaps |
| `space-4` | 16px | Screen edge padding (px-4), standard section gap |
| `space-5` | 20px | Card internal padding (p-5) |
| `space-6` | 24px | Between sections |
| `space-8` | 32px | Major section breaks |
| `space-10` | 40px | Large breathing room |
| `space-12` | 48px | Screen top/bottom safe padding |

Screen horizontal padding: `px-4` (16px) — same as before.
Card internal padding: increase from `p-4` to `p-5` (20px) for more breathing room.

---

## MICRO-INTERACTIONS & ANIMATIONS

### Card Press
- On touch down: scale to 0.97, 80ms (use `Pressable` with `react-native-reanimated`)
- On release: spring back to 1.0, damping: 15, stiffness: 300
- Adds a tactile feel that the reference design implies

### Screen Load (Card Cascade)
- Cards stagger-animate from bottom on screen mount
- Each card: translateY(16) → 0, opacity 0 → 1
- Duration: 250ms per card, stagger delay: 60ms between cards
- Easing: ease-out-cubic

### Tab Switch
- Active icon cross-fades from outline to filled, 150ms
- Active label fades to primary color, 150ms
- Inactive icon/label fades to gray simultaneously
- The elevated Scan button should have a subtle pulse glow animation when no records exist (encouraging first scan)

### Pull-to-Refresh
- Custom refresh indicator using primary color spinner (not default green)
- Or: a paw print icon that rotates during refresh

### Record Processing Animation
- Paw print icon pulses (scale 1.0 → 1.12 → 1.0, 1.2s loop, ease-in-out)
- Below: "Analyzing Luna's record..." text with animated ellipsis (dots appear one by one)
- Background: subtle radial gradient pulse in primary-light color

### Health Score Ring Animation
- If health trends screen shows a wellness score:
- Ring fills clockwise, 800ms, ease-out-cubic
- Number counts up from 0, synced with ring fill

### Button Press
- Scale to 0.95 on press, bg shifts to primary-dark
- Spring back on release, 150ms
- expo-haptics light impact on press

---

## DISCLAIMER BANNER (Updated style)

```
- Background: primary-light (#E8F6FC)
- Border radius: 12px (rounded-xl)
- Padding: 12px (p-3)
- Left icon: ℹ️ info circle in primary color, 16px
- Text: Nunito Regular, 12px, text-muted
- Text content: "AI interpretation — always consult your veterinarian for medical decisions"
- Position: bottom of any screen showing AI-generated health content
- No border — the tinted background is sufficient
```

---

## ICONOGRAPHY (Updated)

Continue using Ionicons from `@expo/vector-icons` but with these rules:

- All icons: **outline** variant by default
- Active/selected state: **filled** variant
- Icon sizes: 24px (tabs), 20px (cards/buttons), 16px (inline)
- Icon color follows the element it's in (primary on active, text-muted on inactive, white on blue headers/buttons)
- For record type icons inside colored containers (48x48, rounded-xl, bg-primary-light):
  - Lab Results: flask icon
  - Vet Visit: clipboard icon
  - Prescription: medical icon
  - Vaccination: shield-checkmark icon

---

## LOADING STATES (Updated)

### Skeleton Screens
- Skeleton blocks use `bg-[#E8E8E8]` (slightly darker than before for contrast on #F5F5F5 background)
- Border radius matches the element being loaded (16px for cards, rounded-full for avatars)
- Shimmer animation: translateX left-to-right sweep of a lighter gradient, 1.5s loop
- The curved header should still be rendered (in primary color) during skeleton states — only the content area shows skeletons

### Full-Screen Loading (Record Processing)
- White background
- Centered `mascot-searching.png` illustration (80px) on a soft blue blob (120px circle, bg-primary-light) with pulse animation
- "Analyzing [PetName]'s record..." below in text-heading, 17px
- Animated ellipsis dots below that
- Subtle primary-light radial gradient behind the character, pulsing

---

## EMPTY STATES (Updated)

All empty states follow this layout:
```
Centered vertically in available space:

    [Mascot 3D illustration from /assets/illustrations/ — 120-160px]
    (on a soft blue blob: 180px circle, bg-primary-light, behind the illustration)

    Title text (Nunito SemiBold, 20px, text-heading)

    Subtitle (Nunito Regular, 15px, text-muted, max 2 lines, center-aligned)

    [CTA Button — primary pill style, mt-6]
```

| Screen | Illustration | Title | Subtitle | CTA |
|--------|-------------|-------|----------|-----|
| Pet List (no pets) | `mascot-sleeping.png` | "No pets yet!" | "Add your first furry friend to get started" | "Add Pet" |
| Records List (no records) | `mascot-confused.png` | "No records yet" | "Scan a vet record to see AI-powered insights" | "Scan Record" |
| Health Trends (no data) | `mascot-running.png` | "More records, better insights" | "Keep scanning records to see health trends over time" | "Scan Record" |
| AI Chat (no messages) | `mascot-reading.png` | "Ask about this record" | "Get plain-English answers about your pet's health data" | (Input field is the CTA) |

---

## IMPLEMENTATION ORDER

Follow this sequence when refactoring. Do ONE step at a time, test, then move on:

### Phase 1 — Foundation
1. Update `tailwind.config.js` with new color tokens
2. Install and configure Nunito font via `expo-font`
3. Create the reusable `<CurvedHeader>` component
4. Update the bottom tab bar with new styling (colors, icons, elevated scan button)

### Phase 2 — Core Components  
5. Update the `<Card>` component (new shadow, radius, padding, no border)
6. Update `<Button>` variants (primary, secondary, pill, destructive)
7. Update `<Input>` fields (new border radius, focus ring, styling)
8. Update `<Badge>` / pill components
9. Create `<FilterPills>` component for category selection
10. Update `<DisclaimerBanner>` with new style

### Phase 3 — Screen Redesigns
11. Redesign Home Dashboard (curved header, hero CTA card, layout restructure)
12. Redesign Pet List (curved header, updated pet cards)
13. Redesign Records List (curved header, filter pills, updated record cards)
14. Redesign Profile/Settings (curved header, grouped list cards)
15. Redesign Pet Detail (curved header with overlapping photo)
16. Redesign Record Detail / AI Interpretation (colored left borders, range bars)
17. Redesign Onboarding screens (full-screen character layout)
18. Redesign Record Scan screen (curved header, category chips)
19. Redesign Record Processing / Loading screen (character + pulse animation)
20. Redesign AI Chat screen (curved header, chat bubble styling)

### Phase 4 — Animations & Polish
21. Add card press micro-interaction (scale spring)
22. Add card cascade stagger animation on screen load
23. Add tab bar icon transition animation
24. Add filter pill slide animation
25. Add button press feedback (scale + haptics)
26. Update skeleton shimmer colors and radii
27. Add empty state illustrations (emoji containers or SVG if available)
28. Final spacing/alignment pass on every screen

---

## CHECKLIST BEFORE MARKING COMPLETE

- [ ] Every screen has the curved blue header with white text
- [ ] No screen uses the old teal (#0D7377) or amber (#F5A623) colors
- [ ] All cards use 16px radius, new shadow, no border
- [ ] All buttons use new styles (rounded-xl, brand-tinted shadow on primary)
- [ ] Nunito font loads and renders on all text elements
- [ ] Bottom tab bar has elevated scan button, outline/filled icon states
- [ ] Filter pills appear on Records List with slide animation
- [ ] Pet Detail has overlapping avatar at header/content boundary
- [ ] Record Detail cards have colored left border accents
- [ ] At least 5 empty states have 3D mascot illustrations (use paw icon placeholder with TODO comment if illustrations not yet sourced)
- [ ] Onboarding uses full-screen character layout with pagination dots
- [ ] Card press animation works (scale spring)
- [ ] Card cascade animation plays on screen load
- [ ] Disclaimer banner uses new primary-light style
- [ ] Settings uses grouped card sections with dividers
- [ ] All text uses text-heading / text-body / text-muted colors consistently
- [ ] Screen background is #F5F5F5 (not white, not the old #FAF9F6)
- [ ] No features were added, removed, or modified — only visual changes
