# FRONTEND_GUIDELINES.md — PawLogix Design System & UI Rules

## Design Philosophy
PawLogix should feel like a **trusted health companion** — warm, clean, and empowering. Never clinical or cold. The design should make pet owners feel confident and informed, not anxious. Think modern health app (Oura Ring, Clue) meets pet care warmth.

---

## Color Palette

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| primary | Deep Teal | #0D7377 | Headers, primary buttons, active tab icons, trust elements |
| secondary | Warm Amber | #F5A623 | Accent highlights, CTAs needing attention, badges |
| background | Warm White | #FAF9F6 | Screen backgrounds |
| surface | White | #FFFFFF | Cards, modals, bottom sheets |
| text-primary | Charcoal | #1A1A2E | Headings, body text |
| text-secondary | Slate | #64748B | Subtitles, captions, timestamps |
| success | Sage Green | #4CAF50 | Success states, "normal range" indicators |
| warning | Soft Orange | #FF9800 | "Watch" severity flags, warnings |
| error | Coral Red | #EF5350 | "Urgent" severity flags, errors, destructive actions |
| info | Calm Blue | #2196F3 | "Info" severity flags, informational badges |
| border | Light Gray | #E5E7EB | Card borders, dividers |
| disabled | Muted Gray | #D1D5DB | Disabled buttons, inactive elements |

### NativeWind Tailwind Config
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0D7377',
        secondary: '#F5A623',
        background: '#FAF9F6',
        surface: '#FFFFFF',
        'text-primary': '#1A1A2E',
        'text-secondary': '#64748B',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#EF5350',
        info: '#2196F3',
      }
    }
  }
}
```

---

## Typography

System fonts only (San Francisco on iOS, Roboto on Android).

| Element | Size | Weight | Color | NativeWind Class |
|---------|------|--------|-------|------------------|
| Screen Title | 28px | Bold | text-primary | text-3xl font-bold text-text-primary |
| Section Heading | 20px | Semibold | text-primary | text-xl font-semibold text-text-primary |
| Card Title | 17px | Semibold | text-primary | text-lg font-semibold text-text-primary |
| Body Text | 15px | Regular | text-primary | text-base text-text-primary |
| Secondary Text | 13px | Regular | text-secondary | text-sm text-text-secondary |
| Caption | 11px | Regular | text-secondary | text-xs text-text-secondary |
| Button Text | 16px | Semibold | White (on primary) | text-base font-semibold text-white |

---

## Spacing Scale

Use Tailwind's default spacing with these as primary values:
- 1 (4px): tight spacing between related elements
- 2 (8px): inline padding, icon margins
- 3 (12px): between list items, card internal spacing
- 4 (16px): screen edge padding, section spacing
- 5 (20px): between cards
- 6 (24px): section gaps
- 8 (32px): major section separators
- 12 (48px): screen top/bottom safe areas

Screen horizontal padding: always px-4 (16px each side).

---

## Border Radius

| Element | Radius | NativeWind |
|---------|--------|------------|
| Cards, containers | 12px | rounded-xl |
| Buttons | 8px | rounded-lg |
| Pill badges | 24px | rounded-full |
| Input fields | 8px | rounded-lg |
| Profile photos | Full circle | rounded-full |
| Image thumbnails | 8px | rounded-lg |

---

## Shadows

Cards and elevated surfaces:
```
shadow-sm (default for cards)
```
NativeWind: `shadow-sm` or custom: `shadow-[0_2px_8px_rgba(0,0,0,0.08)]`

Only cards, modals, and bottom sheets have shadows. Buttons do NOT have shadows.

---

## Component Patterns

### Buttons
- **Primary:** bg-primary, text-white, rounded-lg, py-3.5, full width on forms
- **Secondary:** bg-transparent, border border-primary, text-primary, rounded-lg
- **Destructive:** bg-error, text-white, rounded-lg
- **Disabled:** bg-disabled, text-text-secondary, not pressable
- **Loading:** Show ActivityIndicator inside button, button disabled, text hidden
- All buttons: expo-haptics light impact on press

### Cards
- bg-surface, rounded-xl, shadow-sm, p-4, border border-border (optional)
- Active/selected cards: border-primary border-2

### Input Fields
- bg-surface, rounded-lg, border border-border, px-4 py-3
- Focus: border-primary
- Error: border-error, error message text below in text-error text-sm
- Label above input in text-sm font-medium text-text-primary mb-1.5

### Badges / Tags
- Pill shape: rounded-full, px-3 py-1
- Severity badges:
  - Info: bg-info/10 text-info
  - Watch: bg-warning/10 text-warning
  - Urgent: bg-error/10 text-error
- Record type badges: bg-primary/10 text-primary

### Loading States
- Use skeleton screens (animated shimmer placeholders), NEVER spinners on screens
- Skeleton: bg-border rounded-lg with animated opacity (0.3 → 0.7 → 0.3)
- Buttons are the exception: use ActivityIndicator inside the button

### Empty States
- Centered vertically in available space
- Paw icon or relevant illustration (use @expo/vector-icons)
- Title: text-lg font-semibold
- Subtitle: text-sm text-text-secondary, max 2 lines
- CTA button below

### Error States
- Centered like empty states
- Warning icon in error color
- Error message in plain English (never technical jargon)
- "Try Again" button

### Disclaimer Banner
- bg-primary/5, rounded-lg, p-3
- Small info icon + text-xs text-text-secondary
- Text: "AI interpretation — always consult your veterinarian for medical decisions"
- Appears at bottom of any screen showing AI-generated health content

---

## Screen Layout Pattern

Every screen follows this structure:
```
SafeAreaView (bg-background, flex-1)
  └── ScrollView or FlashList (contentContainerStyle px-4 pt-4 pb-8)
       ├── Screen Title (if not in header)
       ├── Content sections
       └── Bottom spacing (pb-8 minimum for tab bar clearance)
```

Tab bar screens: 60px bottom padding to clear tab bar.

---

## Responsive Rules
- Min supported width: 375px (iPhone SE)
- Max content width: none needed (mobile only)
- All text must be readable at Dynamic Type "Default" setting
- Touch targets minimum 44x44 points
- No horizontal scrolling on any screen except image galleries

---

## Iconography
- Use Ionicons from @expo/vector-icons consistently
- Icon size in tabs: 24px
- Icon size in cards/buttons: 20px
- Icon size in inline text: 16px
- Always use outline variants, not filled (except active tab)

---

## Animation Guidelines
- Use react-native-reanimated for custom animations
- Keep animations under 300ms
- Use spring physics for interactive elements (button press, card tap)
- Processing screen: pulse animation on paw icon (scale 1.0 → 1.1 → 1.0, 1.5s loop)
- Page transitions: use Expo Router defaults (platform-native)
- No decorative animations — every animation must serve a purpose
