# FooFoo — Master Change Log
*Every code change goes here. Format is at the bottom of this file.*

---

## [Unreleased]
<!-- Add new changes here. Move to a version block when a sprint completes. -->

### Pre-Sprint 5 Health Check — 2026-05-22

- `logs/pre_sprint_reports/pre_sprint5_20260522.txt` — full read-only audit.
  819 dishes (not 829 as the prompt anticipated). 5 critical issues identified.
- `supabase/migrations/20260522000001_pre_sprint5_critical_fixes.sql` —
  pending migration (not yet applied; Supabase MCP was read-only in this
  session) covering:
  - Patch `derive_dish_attributes()` so jain-safety fails closed: non_veg/egg
    dishes are forced `is_jain=false`, and dishes with no ingredient links
    default to `is_jain=false` instead of true. Also pins search_path.
  - Bulk `UPDATE dishes SET is_jain=false WHERE diet_type IN ('non_veg','egg')`
    — fixes 255 mismarked rows (199 non_veg + 56 egg).
  - Deactivate duplicate "Parotta (Kerala/Tamil)" id=569 (kept id=282 canonical).
  - DELETE the 7 planner rows for the affected Jain user
    (7b53646c-1fd4-423a-96fe-ef2bf70c46af) so the RE regenerates with the
    corrected filter.
- Sprint 5 Day-0 backlog (NOT in this migration — requires content work):
  - Backfill `meal_ingredients` for 799 dishes (currently 2.4% coverage)
  - Backfill `dish_tags` for 799 dishes (currently 2.4% coverage)
  - Then re-run `derive_dish_attributes()` for every dish.
  - Populate `dish_similar` (currently empty).
  - Replace 814 missing hero_image_url placeholders.

---

## [v0.1.0] — Sprint 1 Setup — 2026-05-19

### Added
- Expo project scaffolded (TypeScript, Expo SDK 52+, Expo Router)
- React Native Web configured — full feature parity on web from Day 1
- `app/_layout.tsx` — Root layout wrapping GestureHandlerRootView + QueryClientProvider + Stack navigator
- `app/index.tsx` — Entry point: checks Supabase session → routes to auth or home
- `src/services/supabase.ts` — Supabase client with platform-aware SecureStore adapter (SecureStore on native, localStorage on web)
- `src/config/constants.ts` — Global constants: APP_NAME, COLORS, SPACING, BORDER_RADIUS, TIMING, RE_CONFIG, FEATURES, API
- `src/types/index.ts` — Shared TypeScript types: Dish, DailyPlan, UserProfile, MealCard, REInput, REScore, MealSlot, FoodPref, etc.
- `app.json` — Multi-platform config (Android, iOS, Web) with scheme, splash, notifications plugin
- `babel.config.js` — Reanimated plugin configured (must be last)
- `metro.config.js` — Metro bundler configured for web support
- `.env.local` — Template for all API keys (gitignored)
- `.gitignore` — Updated to exclude .env.local, .env.staging
- `CLAUDE.md` — Project context file for Claude Code
- `CHANGELOG.md` — This file

### Packages Installed
| Package | Version | Purpose |
|---------|---------|---------|
| expo-router | latest | File-based navigation |
| react-native-safe-area-context | latest | Safe area handling |
| react-native-screens | latest | Native screen optimization |
| zustand | latest | Lightweight state management |
| @tanstack/react-query | latest | Server state, caching, offline |
| @supabase/supabase-js | latest | Database + Auth + Storage client |
| expo-secure-store | latest | Encrypted session storage on device |
| react-native-gesture-handler | latest | 60fps swipe + long-press gestures |
| react-native-reanimated | latest | Fluid animations |
| expo-image | latest | Fast image loading with Blurhash support |
| expo-notifications | latest | Push notification handling |
| expo-device | latest | Device info for notifications |
| expo-location | latest | GPS for weather city lookup |
| @react-native-community/netinfo | latest | Network/offline detection |
| react-native-web | latest | Web platform support |
| react-dom | latest | Required for web |
| @expo/metro-runtime | latest | Metro web runtime |
| posthog-react-native | latest | Analytics |
| @sentry/react-native | latest | Error tracking |
| @react-native-async-storage/async-storage | latest | Offline plan caching |

### FooFoo Session Reference
`[FooFoo| #003 | Topic: Project Scaffolding | Stage: MVP-Sprint-1 | Output: Full Expo project setup — web+mobile, Supabase client, types, constants, root layout, CLAUDE.md]`

---

## [v0.2.0] — Sprint 1 Complete
<!-- Fill this in when Sprint 1 gate criteria all pass -->
### Added
- [ ] Supabase 42-table migration applied
- [ ] Seed data: cuisines_master, ingredients_master
- [ ] Splash screen
- [ ] 3 Intro screens
- [ ] Auth: Sign Up + Sign In + Email Verification
- [ ] Auto-derivation verified

---

## Change Log Entry Format

When adding an entry, use this template:

```markdown
## [vX.Y.Z] — Sprint N Complete / Feature Name — YYYY-MM-DD

### Added
- Description of new file or feature

### Changed
- Description of what changed in existing code, and why

### Fixed
- Description of bug fixed

### Packages
| Package | Version | Purpose |

### FooFoo Session Reference
[FooFoo| #NNN | Topic: ... | Stage: ... | Output: ...]
```

---
*This file lives at the project root. Every Claude Code session that produces code must add an entry here.*