# IMPLEMENTATION_PLAN.md — PawLogix Build Sequence

## Build Philosophy
Build the Visual Shell first (hardcoded data), then the Data Layer (Supabase), then Wire them together.
ONE step at a time. Test each step before moving to the next.

---

## PHASE 1: PROJECT SCAFFOLD (Day 1)

### Step 1.1 — Initialize Project
- Create Expo project with TypeScript template: `npx create-expo-app pawlogix --template tabs`
- Install core dependencies from TECH_STACK.md
- Configure NativeWind v4
- Set up Expo Router file-based routing structure
- Create folder structure matching CLAUDE.md specification
- Initialize git, create .gitignore, first commit

### Step 1.2 — Design System Foundation
- Create constants/colors.ts with all design tokens from CLAUDE.md
- Create constants/spacing.ts with spacing scale
- Configure NativeWind theme in tailwind.config.js to use custom colors
- Create a ui/ component library with: Button, Card, Input, Badge, Skeleton, EmptyState, Toast
- Each component uses NativeWind className only, no inline styles
- Test all components on a scratch screen, then delete scratch screen

### Step 1.3 — Navigation Shell
- Set up Expo Router layout files:
  - Root _layout.tsx — NO auth guard, wraps app in AuthProvider (anonymous session auto-created)
  - (tabs)/_layout.tsx with bottom tab navigator (Home, Pets, Records, Profile)
  - auth/ directory for optional signup/login screens (not in tab nav)
- Configure tab icons using @expo/vector-icons (Ionicons)
- Tab bar uses design tokens: teal active, slate inactive, white background
- All screens render placeholder "Coming Soon" text for now

**Checkpoint:** App runs, all 4 tabs navigate, no login screen shown. Commit.

---

## PHASE 2: ANONYMOUS AUTH + ONBOARDING (Day 1-2)

### Step 2.1 — Supabase Setup
- Using existing shared Supabase project (zeskhorwddxyjhhnpgsa)
- Enable Anonymous Sign-Ins in Supabase Dashboard → Authentication → Settings
- Create pl_profiles table with trigger for auto-creation on auth.users insert (only for PawLogix users via app_metadata)
- Add is_anonymous column (boolean, default true) to pl_profiles
- Add update trigger: when auth.users is updated (account linking), sync email and is_anonymous to pl_profiles
- Enable RLS on pl_profiles table with policies from BACKEND_STRUCTURE.md
- Create .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
- Create lib/supabase.ts with AsyncStorage session persistence AND auto anonymous sign-in
- Create lib/auth-context.tsx with AuthProvider that:
  - On mount: check for existing session
  - If no session: call supabase.auth.signInAnonymously()
  - Expose: user, isAnonymous, isLoading, signOut, linkAccount(email, password)
  - linkAccount calls supabase.auth.updateUser({ email, password, data: { app: 'pawlogix' } })

### Step 2.2 — Onboarding Screens (NO signup required)
- 3-screen horizontal swiper (react-native-reanimated carousel or simple ScrollView with paging)
- Screen 1: Scan icon + "Scan any vet record" + brief subtitle
- Screen 2: AI sparkle icon + "AI translates the medical jargon" + brief subtitle
- Screen 3: Chart icon + "Track your pet's health over time" + brief subtitle
- Page indicators (dots) at bottom
- "Get Started" button on final screen → routes directly to Pet Profile Creation (NOT signup)
- AsyncStorage flag to skip onboarding on subsequent launches

### Step 2.3 — Splash Screen
- Configure expo-splash-screen with PawLogix branding
- Use deep teal (#0D7377) background with white logo/text
- Auto-hide splash after anonymous session resolves

### Step 2.4 — Optional Auth Screens (accessible from Settings only)
- Build /auth/signup screen: email, password, confirm password, optional display name
- On submit: call linkAccount() → supabase.auth.updateUser({ email, password })
- On success: toast "Account created! Your data is now backed up." → navigate back to Settings
- Build /auth/login screen: email, password, "Forgot Password?" link
- On submit: supabase.auth.signInWithPassword({ email, password })
- On success: navigate to Home Dashboard
- Build /auth/forgot-password screen: email input, "Send Reset Link" button
- All forms use react-hook-form + zod validation
- These screens are ONLY reachable from Settings tab — NOT in the main onboarding flow

**Checkpoint:** App runs, anonymous session auto-creates silently, onboarding plays, user lands on home without ever seeing a login screen. Optional signup/login screens exist in Settings. Commit.

---

## PHASE 3: PET PROFILES (Day 2-3)

### Step 3.1 — Database: Pets Table
- Create pl_pets table in Supabase with schema from BACKEND_STRUCTURE.md
- Enable RLS policies
- Create pl-pet-photos Storage bucket with RLS

### Step 3.2 — Pet Profile Creation Screen
- Form fields: pet photo (optional, expo-image-picker), name (required), species (dog/cat selector), breed (searchable dropdown — use hardcoded breed list in constants/breeds.ts), date of birth (date picker), weight in kg (numeric input), notes (optional text area)
- Breed list: top 50 dog breeds + top 30 cat breeds for MVP
- Photo upload to Supabase Storage pl-pet-photos/{user_id}/{pet_id}
- On save → insert to pl_pets table → navigate to home dashboard
- Loading state on save button, error toast on failure

### Step 3.3 — Pet List Tab
- FlashList showing all user's pets as cards
- Each card: photo (or paw icon placeholder), name, species, breed, age calculated from DOB
- Tap card → navigate to pet/[id] detail view
- Floating Action Button (bottom-right) to add new pet
- Empty state: "No pets yet! Add your first furry friend." with Add Pet CTA

### Step 3.4 — Pet Detail View
- Header: large pet photo (or placeholder), name, breed, age, weight
- Edit button → navigate to edit form (reuse creation form with pre-filled data)
- "Records" section: placeholder list for now (will wire in Phase 5)
- "Health Trends" section: placeholder charts for now (will wire in Phase 6)
- Active pet context: lib/pet-context.tsx to track which pet is "active" across tabs

**Checkpoint:** User can create pets, view pet list, view pet details, edit pets. Commit.

---

## PHASE 4: RECORD SCANNING — THE KILLER FEATURE (Day 3-5)

### Step 4.1 — Database: Records + Storage
- Create pl_health_records table with schema from BACKEND_STRUCTURE.md
- Create pl_record_chats table
- Create pl_usage_tracking table (built, not enforced)
- Enable RLS on all tables
- Create pl-record-images Storage bucket with RLS

### Step 4.2 — Record Scan Screen (UI Only First)
- Choice screen: "Take Photo" (camera icon) and "Upload from Library" (gallery icon) as two large tappable cards
- Camera flow: expo-camera with capture button, flash toggle, retake/confirm
- Library flow: expo-image-picker with multi-select
- After image selection: preview grid showing selected images
- Record type picker: Lab Results, Vet Visit Summary, Vaccine Record, Prescription, Other
- Pet selector if user has multiple pets (default to active pet)
- "Interpret This Record" primary CTA button
- ALL with hardcoded/mock behavior for now — button shows success toast, no actual upload

### Step 4.3 — Image Upload + Processing Flow
- Wire up Supabase Storage upload for record images
- Upload images to pl-record-images/{user_id}/{record_id}/
- Insert pl_health_records row with status 'pending'
- Navigate to Record Processing screen: animated paw icon with pulse, "Analyzing your pet's record..." text, progress indicator (indeterminate)
- For now, simulate a 3-second delay then show mock interpretation data

### Step 4.4 — Edge Function: pl-interpret-record
- Create Supabase Edge Function pl-interpret-record/index.ts
- Implement full flow from BACKEND_STRUCTURE.md:
  - Auth validation
  - Download images from Storage
  - Convert to base64
  - Call Anthropic Claude API with vision + system prompt
  - Parse response into interpretation JSON
  - Update pl_health_records row
- Set ANTHROPIC_API_KEY secret
- **Deploy:** `supabase functions deploy pl-interpret-record`
- **Deploy:** `supabase functions deploy pl-interpret-record`
- Test with a real vet record image

### Step 4.5 — Record Detail View
- Header: pet name, record type badge, record date
- Image gallery: horizontal ScrollView of original scanned images, tap to zoom
- AI Interpretation sections using collapsible/accordion components:
  - "Summary" (expanded by default): plain English paragraph
  - "Detailed Breakdown": each section expandable
  - "Flagged Items": color-coded badges (info=blue, watch=amber, urgent=coral red), each with explanation
  - "Questions for Your Vet": numbered list
- Disclaimer banner at bottom: "AI interpretation — always consult your veterinarian"
- "Ask a Follow-Up Question" button → routes to chat screen
- Loading skeleton while interpretation loads
- Error state if processing failed with "Retry" button

### Step 4.6 — Wire Record Scan → Upload → Process → Detail
- Connect the full flow: scan → upload → Edge Function call → poll for completion → display interpretation
- Processing screen polls pl_health_records row every 2 seconds until status = 'completed' or 'failed'
- On complete → navigate to Record Detail View
- On fail → show error with retry option

**Checkpoint:** Core killer feature works end-to-end. User scans a record, AI interprets it, results display beautifully. THIS IS THE MOST CRITICAL MILESTONE. Commit. Test thoroughly.

---

## PHASE 5: AI CHAT + RECORDS LIST (Day 5-6)

### Step 5.1 — Edge Function: pl-health-chat
- Create Supabase Edge Function pl-health-chat/index.ts
- Implement flow from BACKEND_STRUCTURE.md
- Deploy: `supabase functions deploy pl-health-chat` and test

### Step 5.2 — AI Chat Screen
- Chat interface: messages list (FlashList inverted), text input at bottom with send button
- Record context card at top (collapsed, showing pet name + record summary + date)
- User messages right-aligned (teal background, white text)
- Assistant messages left-aligned (white background, charcoal text)
- Each assistant message has small disclaimer footer text
- Loading indicator while waiting for response
- Save messages to pl_record_chats table
- Load chat history when returning to an existing chat

### Step 5.3 — Records Tab + Dashboard Integration
- Records tab: FlashList of all records for active pet, sorted by date desc
- Each record card shows: record type icon + badge, date, processing status, number of flagged items (with color indicator), first line of summary
- Tap → navigate to Record Detail View
- Home Dashboard updates:
  - Recent records section shows last 3 records with status
  - "Scan a Record" remains primary CTA
  - If records exist, show health snapshot (latest weight, any urgent flags)

**Checkpoint:** Full chat works, records are browsable, dashboard shows real data. Commit.

---

## PHASE 6: HEALTH TRENDS + POLISH (Day 6-7)

### Step 6.1 — Health Trends Charts
- Install victory-native for React Native charts
- In Pet Detail View, "Health Trends" section:
  - Weight trend line chart (from extracted_values.weight_kg across records)
  - Key lab value trend charts if available (BUN, creatinine, glucose — only show if 2+ data points exist)
  - Timeline view: vertical timeline of all records with flagged item indicators
- Empty state: "More records = better trends. Keep scanning!" with scan CTA

### Step 6.2 — Settings + Compliance
- Profile tab fully functional:
  - **Account section (top of screen):**
    - If anonymous: show "Create an Account" card with subtitle "Back up your data and access it on any device" + CTA button → navigates to /auth/signup
    - If anonymous: below card, subtle "Already have an account? Log In" text link → /auth/login
    - If linked: show email, display name, "Edit" link for display name
  - Notification toggles (medication reminders, vaccine reminders)
  - Privacy Policy button → toast "Link not configured — will be updated before launch"
  - Terms of Service button → same toast
  - Support & FAQ button → same toast
  - Delete Account button → confirmation dialog → full data deletion → create fresh anonymous session → navigate to Home (empty)
  - Export My Data button → compile JSON → share sheet
  - Sign Out button (ONLY shown if account is linked to email) → sign out → create fresh anonymous session → Home
  - App version text

### Step 6.3 — Notifications Setup
- Configure expo-notifications
- Request push notification permission during onboarding (soft-ask, not forced)
- If vaccines extracted from records have next_due dates → schedule local notifications
- If medications have schedules → schedule daily local notifications
- Notification settings screen to manage which reminders are active

### Step 6.4 — Polish Pass
- Add loading skeleton screens to: Dashboard, Pet List, Records List, Record Detail
- Add error states with retry buttons to all data-fetching screens
- Add empty states with helpful CTAs to: Records List (no records yet), Health Trends (not enough data), Chat (start asking questions)
- Add pull-to-refresh on Dashboard, Pet List, Records List
- Add micro-interactions: button press feedback with haptics (expo-haptics), card press animations
- Review all screens on iPhone SE (375px) for layout issues
- Review all screens in dark mode — ensure readable contrast (dark mode is stretch goal, not required for beta)

### Step 6.5 — Final QA + Deployment Prep
- Test complete user journey end-to-end:
  1. Fresh signup → onboarding → create pet → scan record → view interpretation → ask follow-up → view trends → check settings → delete account
- Verify RLS: user A cannot see user B's data
- Verify Edge Functions handle errors gracefully
- Verify Storage cleanup on account deletion
- Configure eas.json with build profiles
- Build for TestFlight: `eas build --platform ios --profile preview`
- Fix any build errors
- Submit to TestFlight for beta testing

**Checkpoint:** App is complete, polished, and ready for beta testers. Final commit + tag v1.0-beta.

---

## POST-BETA (Future — DO NOT BUILD NOW)
- Paywall with RevenueCat (Pro: $12.99/mo mobile)
- Usage limit enforcement (5 free interpretations/month)
- Push notification campaigns
- Pet sharing (share pet profile with family members / dog sitter)
- PDF export of record interpretations
- Wearable integration (FitBark, PetPace collar data)
- Multi-language support
