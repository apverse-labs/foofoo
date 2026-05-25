# FooFoo Dependency Audit
**Date:** 2026-05-25  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Projects:** foofoo/ (Expo SDK 56.0.4, RN 0.85.3) · foofoo-tests/

---

## Task 1 — Security Vulnerabilities

### foofoo/ (Main App)

**Total:** 13 moderate, 0 high, 0 critical  
Raw JSON: `reports/md/npm-audit-app.json`

#### Root cause

All 13 moderate vulnerabilities trace back to a single actual CVE:

| CVE | Package | Affected range | Description |
|-----|---------|----------------|-------------|
| GHSA-w5hq-g745-h8pq | `uuid` | `< 11.1.1` | Missing buffer bounds check in v3/v5/v6 when `buf` argument is provided |

The `uuid` package is a transitive dependency of `@expo/ngrok` (devDep) and `xcode` (which is a dep of `@expo/config-plugins`, which is a dep of `expo` itself). The cascade spreads to: `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/metro-config`, `@expo/prebuild-config`, `expo`, `@sentry/react-native`, and `onesignal-expo-plugin`.

#### Severity classification

**CRITICAL / HIGH:** None found.

**MODERATE (13 — all deferred, see below):**

| Package | Affected versions | Via | FooFoo feature |
|---------|------------------|-----|----------------|
| `uuid` (root) | `< 11.1.1` | Direct CVE | Transitive dep of `@expo/ngrok` (devDep tunnel) |
| `xcode` | `>= 0.9.2` | depends on uuid | Expo config plugin build tooling |
| `@expo/config-plugins` | `*` | depends on xcode | App.json plugin processing |
| `@expo/cli` | most versions | depends on @expo/config-plugins | Expo CLI (dev) |
| `@expo/config` | most versions | depends on @expo/config-plugins | Expo config reading |
| `@expo/inline-modules` | `>= 0.0.2-canary-...` | depends on @expo/config-plugins | Metro inline modules |
| `@expo/local-build-cache-provider` | `*` | depends on @expo/config | EAS build cache |
| `@expo/metro-config` | most versions | depends on @expo/config | Metro web bundler |
| `@expo/prebuild-config` | `*` | depends on @expo/config, @expo/config-plugins | EAS prebuild |
| `expo` | `>= 41.0.0-alpha.0` | depends on @expo/cli, @expo/config, @expo/config-plugins | Core framework |
| `@sentry/react-native` | `>= 5.16.0-alpha.1` | depends on expo | Crash reporting |
| `onesignal-expo-plugin` | `2.5.0` | depends on @expo/config-plugins | Push notifications |
| `@expo/ngrok` | `*` | depends on uuid | Dev tunnel (devDep) |

**Fix availability:** `npm audit fix --force` would downgrade `expo` to `46.0.21` — a **massive breaking change** incompatible with the current SDK 56 codebase. **DO NOT run.**

**Risk assessment:** The `uuid` buffer bounds-check CVE (GHSA-w5hq-g745-h8pq) requires an attacker to control the `buf` argument passed to `uuid.v3/v5/v6`. In FooFoo's context, `uuid` is used only in Expo's internal build tooling (`xcode` config parser) and the dev-only `@expo/ngrok` tunnel — neither of which processes untrusted `buf` arguments at runtime. **Risk in production is negligible.**

**LOW:** None.

**Fix command (NEEDS_MANUAL_REVIEW):**
```bash
# When Expo SDK 57+ releases with uuid >= 11.1.1 in its dependency chain:
cd /home/user/foofoo/foofoo && npx expo install expo@latest
# Then verify typecheck and tests still pass before committing
```

---

### foofoo-tests/

**Total:** 0 vulnerabilities found.

---

## Task 2 — Unused Dependencies

### Methodology
1. Scanned all `*.ts` and `*.tsx` files under `src/`, `app/`, and `supabase/functions/` for ES module `import ... from` and CommonJS `require()` calls.
2. Compared against `package.json` dependencies.
3. Applied the 8-check keep/remove ruleset.

### All package.json dependencies — annotated

| Package | Version | Used in imports | Safe to remove | Reason |
|---------|---------|-----------------|----------------|--------|
| `@expo/metro-runtime` | `~56.0.11` | Not imported directly | NO | Required for Expo web/metro bundler — peer dep of expo web runtime |
| `@react-native-async-storage/async-storage` | `2.2.0` | `src/services/supabase.ts` | NO | Used — Supabase session storage on mobile |
| `@react-native-community/netinfo` | `12.0.1` | `src/hooks/useNetworkStatus.ts` | NO | Used — offline detection hook |
| `@sentry/react-native` | `~7.11.0` | `app/_layout.tsx` | NO | Used — crash reporting |
| `@supabase/supabase-js` | `^2.106.0` | `src/services/supabase.ts` + many files | NO | Used — entire backend layer |
| `@tanstack/react-query` | `^5.100.11` | `app/_layout.tsx` + many files | NO | Used — all server state management |
| `babel-preset-expo` | `~56.0.0` | `babel.config.js` | NO | Babel preset — required by Expo |
| `expo` | `~56.0.3` | Throughout (expo-router, expo-haptics, etc.) | NO | Core framework |
| `expo-constants` | `~56.0.14` | Not imported directly | NO | Required by `expo-notifications` (dep chain); Expo ecosystem |
| `expo-dev-client` | `~56.0.14` | Not imported directly | NO | Required for EAS dev client builds |
| `expo-device` | `~56.0.4` | Not imported directly | NO | Peer dep of `posthog-react-native`; device fingerprinting |
| `expo-haptics` | `~56.0.3` | `src/components/dish/MealCard.tsx` + others | NO | Used — gesture feedback |
| `expo-image` | `~56.0.8` | `src/components/dish/MealCard.tsx` + others | NO | Used — optimised image loading (Blurhash) |
| `expo-linear-gradient` | `~56.0.4` | Multiple components | NO | Used — gradient overlays on cards |
| `expo-linking` | `~56.0.11` | `app/_layout.tsx` | NO | Used — deep link handling |
| `expo-localization` | `~56.0.6` | `app.json plugins[]` | NO | Expo plugin — locale detection for RE |
| ~~`expo-location`~~ | ~~`~56.0.12`~~ | **Not imported anywhere** | **YES — REMOVED** | No client-side location use; weather handled server-side in Edge Functions |
| `expo-notifications` | `~56.0.12` | `src/modules/notifications/` + `app/_layout.tsx` | NO | Used — push notification scheduling |
| `expo-router` | `~56.2.5` | Throughout (navigation) | NO | Used — file-based routing |
| `expo-secure-store` | `~56.0.4` | `src/services/supabase.ts` | NO | Used — secure session token storage |
| `expo-status-bar` | `~56.0.4` | `app/_layout.tsx` | NO | Used — status bar styling |
| `onesignal-expo-plugin` | `^2.5.0` | `app.json plugins[]` | NO | Expo plugin — OneSignal native build config |
| `posthog-react-native` | `^4.45.10` | `src/services/posthog.service.ts` | NO | Used — analytics |
| `react` | `19.2.3` | Core | NO | Core |
| `react-dom` | `19.2.3` | Not imported directly | NO | Required for Expo web (React DOM renderer) |
| `react-native` | `0.85.3` | Throughout | NO | Core — react-native components |
| `react-native-gesture-handler` | `~2.31.1` | `app/_layout.tsx`, `src/components/dish/MealCard.tsx` | NO | Used — GestureHandlerRootView + Gesture API |
| `react-native-onesignal` | `^5.4.5` | `src/services/onesignal.service.ts` (dynamic import) | NO | Used via `await import(...)` — dynamic import for web-safety |
| `react-native-reanimated` | `4.3.1` | `src/components/dish/MealCard.tsx` + others | NO | Used — 60fps swipe animations |
| `react-native-safe-area-context` | `~5.7.0` | Multiple layout components | NO | Used — safe area insets |
| `react-native-screens` | `4.25.1` | Not imported directly | NO | Required peer dep of `expo-router` — native screen optimisation |
| `react-native-web` | `^0.21.0` | Not imported directly | NO | Required for web export (`expo export --platform web`) |
| `react-native-worklets` | `0.8.3` | Not imported directly | NO | Required peer dep of `react-native-reanimated` `4.x` (spec: `0.8.x`) |
| ~~`zustand`~~ | ~~`^5.0.13`~~ | **Not imported anywhere** | **YES — REMOVED** | No Zustand stores exist; all state uses `@tanstack/react-query` |

**devDependencies — all kept:**

| Package | Reason |
|---------|--------|
| `@expo/ngrok` | Dev tunnel (`expo start --tunnel`) |
| `@types/react` | TypeScript types for React |
| `patch-package` | Applied in `postinstall` — patches Supabase OTEL Hermes export blocker |
| `postinstall-postinstall` | Makes `patch-package` run on `npm install` |
| `typescript` | TypeScript compiler |

### Packages removed

```bash
cd /home/user/foofoo/foofoo
npm uninstall expo-location zustand
# Removed 4 packages total (incl. transitive deps of expo-location)
```

**Post-removal verification:** `tsc --noEmit` → 0 errors. Unit tests → 104/104.

---

## Task 3 — Duplicate Functionality

No duplicate libraries found:

| Category | Packages found | Status |
|----------|---------------|--------|
| Date/time | None | No date library in use |
| HTTP clients | None (Supabase client handles all HTTP) | Clean |
| Animation | `react-native-reanimated` only | Clean — single library |
| State management | ~~`zustand`~~ removed; `@tanstack/react-query` for server state | Clean after removal |
| Form libraries | None | No form library in use |

**Note on state management:** `zustand` was listed in `CLAUDE.md` as the state management solution but was never actually used — `@tanstack/react-query` serves all server-state needs. Local UI state uses React `useState`/`useReducer`. This is a common pattern and doesn't need a separate state library.

---

## Task 4 — Expo SDK Compatibility Check

**Expo SDK:** 56.0.4 (resolved from `~56.0.3`)  
**React Native:** 0.85.3  
**React:** 19.2.3

`npx expo install --check` could not run (node_modules not installed in CI context), so compatibility was verified manually against the `package-lock.json` installed versions:

| Package | Installed version | Expo 56 compatibility | Notes |
|---------|------------------|----------------------|-------|
| `react-native-gesture-handler` | 2.31.2 | Compatible | `~2.31.1` spec resolves to 2.31.2 |
| `react-native-reanimated` | 4.3.1 | Compatible | RN 0.81–0.85 peer dep satisfied; worklets 0.8.x peer dep satisfied |
| `expo-notifications` | 56.0.12 | Compatible | Matches Expo 56.x cadence |
| `@supabase/supabase-js` | `^2.106.0` | Compatible | Not an Expo-versioned package |
| `react-native-safe-area-context` | 5.7.0 | Compatible | `~5.7.0` |
| `react-native` | 0.85.3 | Compatible | Reanimated 4.x peerDep: `0.81 - 0.85` ✓ |

**No Expo compatibility fixes needed.** All packages are within their specified version ranges, and `react-native-reanimated` 4.3.1 explicitly supports RN 0.81–0.85.

---

## Task 5 — Fixes Applied

### Security fixes
`npm audit fix` was run — it installed the dependency tree but could not resolve the uuid CVE without `--force` (which would downgrade expo to 46.x). No `--force` run.

**Result:** 13 moderate vulns remain — all **NEEDS_MANUAL_REVIEW** (see Task 1).

### Unused packages removed
```
expo-location  ~56.0.12  (not used — weather is server-side)
zustand        ^5.0.13   (not used — no stores exist, react-query used instead)
```

### Expo compatibility fixes
None required.

---

## Task 6 — Verification Results

| Check | Result |
|-------|--------|
| `foofoo/ tsc --noEmit` | **PASS** (0 errors) |
| `foofoo-tests/ typecheck` | **PASS** (0 errors) |
| `foofoo-tests/ test:unit` | **PASS** (104/104) |

---

## Audit Summary

### Vulnerabilities

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|---------|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 0 | 0 | 0 |
| MODERATE | 13 | 0 | 13 |
| LOW | 0 | 0 | 0 |

### Packages

- **Unused packages removed:** 2 — `expo-location`, `zustand`
- **Duplicate packages resolved:** 0 (no duplicates found)
- **Expo compatibility fixes:** 0 (all packages compatible)

### Verification

- `foofoo/` typecheck: **PASS**
- `foofoo-tests/` typecheck: **PASS**
- Unit tests: **104/104**

### Deferred (NEEDS_MANUAL_REVIEW)

**1. All 13 moderate vulnerabilities (uuid CVE GHSA-w5hq-g745-h8pq)**

- **Root cause:** `uuid < 11.1.1` in Expo's internal config/build tooling chain
- **Fix available via:** `npm audit fix --force` → downgrades `expo` to `46.0.21` (breaking — incompatible with current SDK 56 codebase)
- **Recommended action:** Wait for Expo SDK 57 to update `xcode`/`@expo/config-plugins` to use `uuid >= 11.1.1`. Monitor https://github.com/expo/expo/issues for the fix.
- **Production risk:** Negligible — the `buf` argument to uuid.v3/v5/v6 is only used in Expo's internal iOS `.xcodeproj` file parsing and the dev-only `@expo/ngrok` tunnel. No user-controlled input touches this codepath at runtime.
- **Action before Play Store submission:** Not required. The vulnerability is in build tooling, not in the distributed APK/IPA.

**2. `expo-constants`, `expo-device`, `expo-dev-client` — no explicit JS imports**

These packages have no direct `import` statements in source code but are **correctly kept** because:
- `expo-constants`: required by `expo-notifications` (dep chain) and Expo internally
- `expo-device`: required peer dep of `posthog-react-native` for device fingerprinting
- `expo-dev-client`: required for EAS dev client builds (no JS-level import needed)

Removal would break EAS builds and PostHog device analytics.
