# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PawLogix is a React Native (Expo) mobile app that helps pet owners understand their pet's health by scanning vet records and lab results, then using AI to translate complex medical jargon into plain English with actionable insights.

**Current Phase:** FREE BETA (v1.0) — all features free, no paywalls, anonymous-first (no login required), account creation optional from Settings tab.

## Build & Dev Commands

```bash
# Start development server
npx expo start

# Start with tunnel (for physical device testing)
npx expo start --tunnel

# Platform-specific
npx expo start --ios
npx expo start --android

# TypeScript check
npx tsc --noEmit

# EAS build (requires eas-cli)
eas build --platform ios --profile preview
```

No test framework is currently configured.

## Tech Stack (LOCKED)

- **Framework:** React Native with Expo SDK 54 (managed workflow)
- **Language:** TypeScript (strict mode)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native) — configured in `tailwind.config.js`
- **Navigation:** Expo Router v6 (file-based routing)
- **Backend:** Supabase (Database + Auth + Storage + Edge Functions)
- **AI Processing:** Anthropic Claude API via Supabase Edge Functions
- **Animations:** react-native-reanimated v4 (spring/timing), expo-haptics
- **Images:** expo-image (never react-native `Image`)
- **Lists:** @shopify/flash-list (never `FlatList`)
- **Forms:** react-hook-form + zod validation
- **Charts:** victory-native

## Architecture

### State Management

Two React Context providers wrap the app in `app/_layout.tsx`:
- **AuthProvider** (`lib/auth-context.tsx`) — manages user session, anonymous-first auth. Auto-calls `signInAnonymously()` if no session exists. Exposes: `user`, `session`, `profile`, `isAnonymous`, `linkAccount()`, `signIn()`, `signOut()`.
- **PetProvider** (`lib/pet-context.tsx`) — manages pet list and active pet selection. Exposes: `pets`, `activePet`, `setActivePet()`, `refreshPets()`.

### Navigation Structure

File-based routing via Expo Router. Root layout (`app/_layout.tsx`) manages:
- Onboarding check (AsyncStorage) → shows onboarding on first launch
- Stack navigator with `fade_from_bottom` animation
- Routes: `(tabs)`, `onboarding`, `pet/[id]`, `pet/create`, `record/[id]`, `record/scan`, `record/[id]/chat`, `record/processing/[id]`, `auth/*`

Tab bar (`app/(tabs)/_layout.tsx`): Home, Pets, Records, Settings.

### Design System

Design tokens live in two files:

**`constants/Colors.ts`** — Full tonal color palette:
- Primary (teal): `#0D7377` with 50-900 scale
- Secondary (amber): `#F5A623` with 50-600 scale
- Semantic: success/warning/error with light/dark variants
- Surfaces: `background` (#FAF9F6), `backgroundWarm` (#F5F3EE), `surface` (#FFFFFF), `surfaceMuted` (#F8F7F4)
- Text: `textPrimary` (#1A1A2E), `textSecondary` (#64748B), `textTertiary` (#94A3B8)
- Exports `Gradients` object with named gradient pairs (primaryHeader, warmBackground, secondaryCta, etc.)

**`constants/spacing.ts`** — Layout tokens:
- `Spacing` — xs(4) through 3xl(48)
- `BorderRadius` — card:12, button:8, pill:24, input:12
- `Shadows` — Platform-specific (iOS shadow*, Android elevation): sm, md, lg, xl, glow (teal), warmGlow (amber)

### UI Component Library (`components/ui/`)

| Component | Key Props | Notes |
|-----------|-----------|-------|
| `Button` | `title, onPress, variant, size, icon, loading, disabled` | Variants: primary (amber fill + warmGlow), secondary (teal-light bg), destructive (red), ghost. Sizes: sm/md/lg. Spring press animation. |
| `Card` | `children, onPress, selected, variant, style` | Variants: default/elevated/subtle. Shadow-based depth (no border). Spring press when tappable. |
| `Badge` | `label, variant, size` | Variants: primary/info/watch/urgent/success. Urgent pulses. Watch/urgent show dot indicator. |
| `Input` | `label, error, ...TextInputProps` | Focus-aware styling (bg change + border). Error shows icon + message. |
| `Skeleton` | `width, height` | Shimmer animation for loading states. |
| `EmptyState` | `icon, title, subtitle, actionLabel, onAction` | Floating accent icons with oscillation. |
| `DisclaimerBanner` | `className` | Fixed AI disclaimer text. |
| `GradientBackground` | `variant, children` | Wraps LinearGradient. Variants: warm/primary/surface. |

### Animation Hooks (`hooks/`)

- **`useStaggeredEntrance(index, delay?)`** — Returns animated style with translateY + opacity spring. 80ms default stagger. Use for list item entrance animations.
- **`usePressAnimation(scaleTo?)`** — Returns `{ onPressIn, onPressOut, animatedStyle }`. Spring scale on press (default 0.97). Used by Card and Button.

### Utility Functions (`lib/utils.ts`)

`calculateAge()`, `formatDate()`, `getSeverityColor()`, `getRecordTypeLabel()`, `base64ToArrayBuffer()`

### Type Definitions (`types/index.ts`)

Core types: `PetProfile`, `HealthRecord`, `RecordInterpretation`, `InterpretedSection`, `FlaggedItem`, `ExtractedValues`, `RecordChat`, `UserProfile`

## Supabase: SHARED MULTI-TENANT PROJECT

This Supabase project is shared across multiple apps. **ALL PawLogix resources use prefixes to avoid collisions:**
- Tables: `pl_` prefix (pl_profiles, pl_pets, pl_health_records, pl_record_chats, pl_usage_tracking)
- Storage buckets: `pl-` prefix (pl-pet-photos, pl-record-images)
- Edge Functions: `pl-` prefix (pl-interpret-record, pl-health-chat)
- NEVER create or modify unprefixed tables/buckets/functions
- Credentials in `.env` ONLY — never in code

**Auth pattern:** Anonymous-first via `signInAnonymously()`. Link to email/password with `updateUser({ email, password })` — same user_id, no data migration. Always pass `options: { data: { app: 'pawlogix' } }` when linking accounts.

## Critical Rules

1. NEVER expose API keys in frontend code — all AI calls go through Supabase Edge Functions
2. NEVER use `FlatList` — always `FlashList`
3. NEVER use react-native `Image` — always `expo-image`
4. ALWAYS enable RLS on every Supabase table
5. ALWAYS handle loading, error, and empty states for every data-fetching screen
6. All medical/health content MUST include disclaimer: "Not a substitute for veterinary advice"
7. Mobile-first — every layout must work on iPhone SE (375px width)
8. All screens wrapped in `SafeAreaView` from `react-native-safe-area-context`
9. Use `Shadows` from `constants/spacing.ts` for all elevation — never inline shadow styles
10. Use `Colors` from `constants/Colors.ts` for all colors — never hardcode hex values in screens

## Naming Conventions

- Files: kebab-case (`pet-card.tsx`)
- Components: PascalCase (`PetCard`)
- Hooks: camelCase with `use` prefix (`usePetRecords`)
- Types: PascalCase (`PetProfile`, `HealthRecord`)
- Database: snake_case with `pl_` prefix (`pl_health_records`)
