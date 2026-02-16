# CLAUDE.md — PawLogix AI Agent Configuration

## Project Overview
PawLogix is a React Native (Expo) mobile app that helps pet owners understand their pet's health by scanning vet records and lab results, then using AI to translate complex medical jargon into plain English with actionable insights.

## Current Phase: FREE BETA (v1.0)
- NO paywalls, NO payment integration, NO subscription logic
- ALL features are free and unlimited during beta
- Usage tracking infrastructure should be built but NOT enforced
- NO upfront login required — anonymous-first experience
- Account creation is OPTIONAL, accessible from Settings tab
- Focus: Core functionality, stability, and user engagement validation

## Supabase: SHARED MULTI-TENANT PROJECT
- This Supabase project is shared across multiple apps (including Saint Match)
- Project ID: zeskhorwddxyjhhnpgsa
- ALL PawLogix tables MUST be prefixed with `pl_` to avoid collisions
  - pl_profiles, pl_pets, pl_health_records, pl_record_chats, pl_usage_tracking
- ALL PawLogix Storage buckets MUST be prefixed with `pl-`
  - pl-pet-photos, pl-record-images
- ALL PawLogix Edge Functions MUST be prefixed with `pl-`
  - pl-interpret-record, pl-health-chat
- NEVER modify or reference tables without the `pl_` prefix — other apps use this project
- Credentials go in .env ONLY — never in code, never in chat, never in docs

## Tech Stack (LOCKED — do not deviate)
- **Framework:** React Native with Expo SDK 52+ (managed workflow)
- **Language:** TypeScript (strict mode)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native)
- **Navigation:** Expo Router (file-based routing)
- **Backend:** Supabase (Database + Auth + Storage + Edge Functions)
- **AI Processing:** Anthropic Claude API via Supabase Edge Functions (NEVER expose API keys in app)
- **OCR/Document Scanning:** expo-camera for capture, Google Document AI or Supabase Edge Function with Claude vision for extraction
- **State Management:** React Context + useReducer for global state, local useState for component state
- **Deployment:** EAS Build for TestFlight/App Store/Play Store

## File Structure
```
pawlogix/
├── app/                        # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx           # Home dashboard
│   │   ├── pets.tsx            # Pet list
│   │   ├── records.tsx         # Records list
│   │   └── profile.tsx         # Settings/profile (optional signup CTA here)
│   ├── auth/
│   │   ├── signup.tsx          # Optional account creation
│   │   ├── login.tsx           # Optional login (returning users)
│   │   └── forgot-password.tsx
│   ├── pet/
│   │   ├── [id].tsx            # Pet detail view
│   │   └── create.tsx          # Add new pet
│   ├── record/
│   │   ├── [id].tsx            # Record detail + AI interpretation
│   │   ├── scan.tsx            # Camera/upload flow
│   │   └── chat.tsx            # AI follow-up chat
│   ├── onboarding.tsx          # First-launch onboarding
│   └── _layout.tsx             # Root layout — NO auth guard, anonymous session auto-created
├── components/
│   ├── ui/                     # Reusable UI primitives (Button, Card, Input, etc.)
│   ├── pet/                    # Pet-specific components
│   ├── record/                 # Record-specific components
│   └── dashboard/              # Dashboard widgets
├── lib/
│   ├── supabase.ts             # Supabase client init (auto anonymous sign-in on first launch)
│   ├── auth-context.tsx        # Auth state provider (tracks anonymous vs linked account)
│   ├── pet-context.tsx         # Active pet state
│   └── utils.ts                # Helpers
├── hooks/                      # Custom hooks
├── constants/                  # Colors, breed data, medical term glossary
├── types/                      # TypeScript type definitions
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   │   ├── pl-interpret-record/  # AI record interpretation
│   │   └── pl-health-chat/       # AI follow-up Q&A
│   └── migrations/             # SQL migrations
├── assets/                     # Images, fonts, icons
├── CLAUDE.md                   # This file
├── progress.txt                # Session state tracking
└── lessons.md                  # Accumulated patterns and fixes
```

## Design System Tokens
- **Primary:** Deep Teal #0D7377
- **Secondary/Accent:** Warm Amber #F5A623
- **Background:** Warm White #FAF9F6
- **Surface/Card:** White #FFFFFF
- **Text Primary:** Charcoal #1A1A2E
- **Text Secondary:** Slate #64748B
- **Success:** Sage Green #4CAF50
- **Warning:** Soft Orange #FF9800
- **Error:** Coral Red #EF5350
- **Border Radius:** 12px cards, 8px buttons, 24px pills
- **Font Heading:** System default bold (San Francisco on iOS, Roboto on Android)
- **Font Body:** System default regular
- **Spacing Scale:** 4, 8, 12, 16, 20, 24, 32, 48

## Component Patterns
- All components use NativeWind className prop
- All screens wrapped in SafeAreaView
- All lists use FlashList (not FlatList) for performance
- All images use expo-image (not Image from react-native)
- Loading states: skeleton screens, never spinners
- Error states: friendly message + retry button
- Empty states: illustration + helpful CTA
- All forms use react-hook-form with zod validation
- Toast notifications via burnt (react-native-burnt)

## Naming Conventions
- Files: kebab-case (pet-card.tsx, health-dashboard.tsx)
- Components: PascalCase (PetCard, HealthDashboard)
- Hooks: camelCase with use prefix (usePetRecords, useHealthTrends)
- Types: PascalCase with descriptive suffix (PetProfile, RecordInterpretation)
- Database tables: snake_case with pl_ prefix (pl_profiles, pl_pets, pl_health_records)
- Supabase Storage buckets: kebab-case with pl- prefix (pl-pet-photos, pl-record-images)
- Supabase Edge Functions: kebab-case with pl- prefix (pl-interpret-record/)

## Critical Rules
1. NEVER expose API keys in frontend code — all AI calls go through Supabase Edge Functions
2. NEVER use FlatList — always FlashList
3. NEVER use react-native Image — always expo-image
4. NEVER add packages not listed in TECH_STACK.md without asking first
5. ALWAYS enable RLS on every Supabase table
6. ALWAYS handle loading, error, and empty states for every data-fetching screen
7. ALWAYS test on iOS simulator before marking a feature complete
8. Mobile-first — every layout must work on iPhone SE (375px width) and up
9. ANONYMOUS-FIRST: On first launch, auto-create anonymous Supabase session. User can optionally link to email/password from Settings. Use supabase.auth.signInAnonymously() on app init if no session exists.
10. All medical/health content MUST include disclaimer: "Not a substitute for veterinary advice"
11. MULTI-TENANT: ALL PawLogix tables use `pl_` prefix, ALL buckets use `pl-` prefix, ALL edge functions use `pl-` prefix. NEVER create or modify unprefixed tables — other apps share this Supabase project.
12. MULTI-TENANT AUTH: When linking anonymous users to email/password, always pass `options: { data: { app: 'pawlogix' } }` so the trigger can identify PawLogix users. Anonymous sessions also get tagged via the pl_profiles trigger.
13. ACCOUNT LINKING: Use supabase.auth.updateUser({ email, password }) to convert anonymous → full account. All existing data (pets, records, chats) stays intact — same user_id, no migration needed.

## Session Protocol
1. Read CLAUDE.md (this file) at every session start
2. Read progress.txt to understand current state
3. Read lessons.md for accumulated patterns
4. Build ONE feature at a time from IMPLEMENTATION_PLAN.md
5. Update progress.txt after completing each feature
6. Update lessons.md after every correction or bug fix
7. Commit to git after each working feature

## Reference Docs
- PRD.md — Product requirements and scope
- APP_FLOW.md — User journeys and screen flows
- TECH_STACK.md — Locked dependencies with versions
- FRONTEND_GUIDELINES.md — Design system and component rules
- BACKEND_STRUCTURE.md — Database schema, RLS, Edge Functions
- IMPLEMENTATION_PLAN.md — Step-by-step build sequence


<claude-mem-context>

</claude-mem-context>