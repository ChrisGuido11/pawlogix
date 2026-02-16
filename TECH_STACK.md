# TECH_STACK.md — PawLogix Locked Dependencies

## Core Framework
- expo: ~52.0.0 (latest stable SDK)
- react-native: 0.76.x (bundled with Expo 52)
- react: 18.3.x
- typescript: ~5.3.0

## Navigation
- expo-router: ~4.0.0

## Styling
- nativewind: ^4.0.0
- tailwindcss: ^3.4.0

## Supabase
- @supabase/supabase-js: ^2.45.0
- @react-native-async-storage/async-storage: ^2.0.0 (session persistence)

## UI Components
- @shopify/flash-list: ^1.7.0 (replaces FlatList)
- expo-image: ~2.0.0 (replaces react-native Image)
- react-native-reanimated: ~3.16.0 (animations)
- react-native-gesture-handler: ~2.20.0 (gestures)
- react-native-safe-area-context: ^4.12.0
- @expo/vector-icons: ^14.0.0 (Ionicons for tab icons)
- react-native-burnt: ^0.3.0 (toast notifications)

## Forms
- react-hook-form: ^7.53.0
- @hookform/resolvers: ^3.9.0
- zod: ^3.23.0

## Camera & Media
- expo-camera: ~16.0.0
- expo-image-picker: ~16.0.0

## Charts
- victory-native: ^41.0.0 (health trend charts)

## Notifications
- expo-notifications: ~0.29.0

## Device Features
- expo-haptics: ~14.0.0 (touch feedback)
- expo-secure-store: ~14.0.0 (sensitive token storage)
- expo-splash-screen: ~0.29.0
- expo-file-system: ~18.0.0 (data export)
- expo-sharing: ~13.0.0 (share exported data)

## Development
- expo-dev-client: ~5.0.0

## Supabase Edge Functions (Deno runtime)
- @supabase/supabase-js (Deno import)
- Anthropic SDK: via fetch to https://api.anthropic.com/v1/messages (no SDK, direct REST)

---

## Installation Commands

### Mobile App
```bash
npx create-expo-app pawlogix --template tabs
cd pawlogix

# Core
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Supabase
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill

# Styling
npm install nativewind tailwindcss
npx expo install react-native-reanimated

# UI
npx expo install @shopify/flash-list expo-image react-native-gesture-handler
npm install react-native-burnt @expo/vector-icons

# Forms
npm install react-hook-form @hookform/resolvers zod

# Camera & Media
npx expo install expo-camera expo-image-picker

# Charts
npm install victory-native

# Notifications & Device
npx expo install expo-notifications expo-haptics expo-secure-store expo-splash-screen expo-file-system expo-sharing

# Dev
npx expo install expo-dev-client
```

### Supabase CLI (linking to EXISTING shared project)
```bash
npm install -g supabase
supabase init
supabase login
supabase link --project-ref zeskhorwddxyjhhnpgsa
```
**NOTE:** This is a shared multi-tenant project. Only create pl_ prefixed tables.

---

## Forbidden
- DO NOT use react-native FlatList (use FlashList)
- DO NOT use react-native Image (use expo-image)
- DO NOT use StyleSheet.create (use NativeWind className)
- DO NOT use any state management library (Context + hooks only)
- DO NOT use any HTTP client library (use Supabase client + fetch)
- DO NOT add ANY package not listed above without explicit approval
