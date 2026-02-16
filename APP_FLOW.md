# APP_FLOW.md — PawLogix User Journeys & Screen Inventory

## Screen Inventory & Routes

| Screen | Route | Auth Required | Tab |
|--------|-------|---------------|-----|
| Splash | (auto) | No | — |
| Onboarding 1-3 | /onboarding | No (anonymous session created silently) | — |
| Home Dashboard | /(tabs)/ | Anonymous OK | Home |
| Pet List | /(tabs)/pets | Anonymous OK | Pets |
| Records List | /(tabs)/records | Anonymous OK | Records |
| Profile/Settings | /(tabs)/profile | Anonymous OK | Profile |
| Pet Detail | /pet/[id] | Anonymous OK | — |
| Pet Create | /pet/create | Anonymous OK | — |
| Pet Edit | /pet/[id]/edit | Anonymous OK | — |
| Record Scan | /record/scan | Anonymous OK | — |
| Record Processing | /record/processing/[id] | Anonymous OK | — |
| Record Detail | /record/[id] | Anonymous OK | — |
| Record AI Chat | /record/[id]/chat | Anonymous OK | — |
| Notification Settings | /settings/notifications | Anonymous OK | — |
| Signup (optional) | /auth/signup | No (links anonymous → email) | — |
| Login (optional) | /auth/login | No (for returning linked users) | — |
| Forgot Password | /auth/forgot-password | No | — |

---

## Flow 1: First-Time User (Happy Path)

1. **App Launch** → Splash screen (1.5s)
   - Check for existing Supabase session
   - No session → call supabase.auth.signInAnonymously() silently
   - Anonymous session created → check AsyncStorage for onboarding flag
   - No flag → Route to Onboarding

2. **Onboarding** → 3 swipeable screens
   - User swipes through value props
   - Taps "Get Started" on screen 3
   - Set AsyncStorage onboarding flag
   - Route directly to Pet Create (NO signup)

3. **Pet Profile Creation** → Form screen
   - User fills pet info (name, species, breed, DOB, weight, optional photo)
   - Taps "Save"
   - Data saves to Supabase under anonymous user_id
   - On success: Route to Home Dashboard
   - Pet is set as active pet

4. **Home Dashboard** → Main screen
   - Shows active pet at top
   - Prominent "Scan a Record" CTA
   - Empty state for recent records: "Scan your first record to get started"
   - User taps "Scan a Record"

5. **Record Scan** → Camera/upload choice
   - User taps "Take Photo" or "Upload from Library"
   - Captures/selects 1+ images
   - Confirms images, selects record type
   - Taps "Interpret This Record"
   - Images upload to Storage under anonymous user_id
   - Routes to Record Processing

6. **Record Processing** → Loading screen
   - Animated paw icon with "Analyzing your pet's record..."
   - Polls health_records table every 2s
   - On complete: Route to Record Detail
   - On fail: Show error + retry button

7. **Record Detail View** → Interpretation display
   - User reads AI summary
   - Expands detailed breakdown sections
   - Reviews flagged items (color-coded)
   - Reads suggested vet questions
   - Optionally taps "Ask a Follow-Up Question"

8. **AI Chat** (optional) → Chat interface
   - User asks questions about the record
   - AI responds with context from interpretation
   - User can return to Record Detail via back button

---

## Flow 2: Returning User

1. **App Launch** → Splash screen
   - Existing Supabase session (anonymous or linked) → Route to Home Dashboard
   - Skip onboarding (AsyncStorage flag set)
   - If session expired and was anonymous → create new anonymous session (data from old anonymous session is lost — this is acceptable for beta; the "Create Account" CTA in Settings prevents this)

2. **Home Dashboard** → Shows latest data
   - Recent records with interpretation status
   - Active pet info
   - Health snapshot (weight trend, any urgent flags)

3. **User can:**
   - Tap "Scan a Record" → Flow 1, Step 5
   - Tap a recent record → Record Detail View
   - Switch tabs to browse pets, records, or settings
   - Switch active pet from Pets tab

---

## Flow 3: Multi-Pet Management

1. **Pets Tab** → Pet list
   - User sees all pets as cards
   - Taps a pet → Pet Detail View
   - Taps FAB (+) → Pet Create (same form as Flow 1, Step 4)

2. **Pet Detail View** → Pet overview
   - User can view all records for this pet
   - View health trends (charts)
   - Tap "Edit" to modify pet info
   - Tap any record → Record Detail View

3. **Switching Active Pet**
   - From Pets tab: tap a pet card, then tap "Set as Active" or it auto-sets
   - Home Dashboard updates to show selected pet's data
   - Records tab filters to active pet's records

---

## Flow 4: Account Management

1. **Profile Tab** → Settings screen
   - **If anonymous (no linked email):**
     - Prominent "Create an Account" card at top
     - Subtitle: "Back up your data and access it on any device"
     - CTA taps → /auth/signup screen
     - Signup screen: email + password + confirm password
     - On success: supabase.auth.updateUser({ email, password }) links account
     - All existing data stays intact (same user_id)
     - Card disappears, replaced with email display
   - **If linked (has email):**
     - Show email
     - "Log In" option available if they sign out and return
   - Toggle notifications
   - Legal links (toast placeholders)
   - Delete Account → Confirmation dialog → Full data deletion → create fresh anonymous session → Home Dashboard (empty)
   - Export My Data → JSON compiled → Share sheet
   - Sign Out (only shown if linked) → Clear session → App creates new anonymous session → Home Dashboard (empty)

## Flow 5: Returning Linked User (Login)

1. User previously created an account, then signed out or reinstalled
2. App launches → fresh anonymous session created
3. User goes to Settings → sees "Create an Account" card
4. Below it, a subtle "Already have an account? Log In" link
5. Taps → /auth/login screen → email + password
6. On success: anonymous session replaced with linked session
7. All previously saved data (from linked account) is restored
8. Anonymous data from the interim session is orphaned (acceptable for beta)

---

## Error Flows

### Image Upload Fails
- Show toast: "Upload failed. Check your connection and try again."
- Stay on scan screen, images retained
- User can retry

### AI Interpretation Fails
- Processing screen shows: "Something went wrong analyzing your record."
- "Try Again" button → re-triggers Edge Function
- "Cancel" → return to dashboard, record saved with status 'failed'
- User can retry later from Record Detail View

### Network Offline
- Show banner at top of screen: "No internet connection"
- Cached data (pet profiles, previously loaded records) still viewable
- Actions requiring network (scan, chat) show disabled state with "Requires internet" message

### Auth Session Expired
- Auto-refresh via Supabase client
- If refresh fails for linked user → show toast "Session expired. Please log in again." → route to /auth/login
- If refresh fails for anonymous user → create new anonymous session silently (user loses old anonymous data — acceptable for beta, and the "Create Account" prompt prevents this)
