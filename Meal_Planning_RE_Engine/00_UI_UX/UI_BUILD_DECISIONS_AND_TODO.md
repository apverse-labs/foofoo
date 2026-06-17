# UI BUILD — DECISIONS & TODO (review after all prompts)

> Running log of decisions made and items deferred during UI-BUILD-01..11.
> Reviewed with founder once the UI build series is complete. Updated each build.

## 🔴 Founder decisions needed
| # | Decision | Context | Default taken meanwhile |
|---|---|---|---|
| D1 | **Make RE onboarding the canonical flow?** flip `EXPO_PUBLIC_RE_ONBOARDING_ENABLED=true` / change `app/index.tsx` routing default | legacy 7-step flow is still default | kept behind flag; legacy default |
| D2 | **Gesture map reconciliation** | RE home consolidates swipe-left=Not Today + long-press=Never; existing MVP uses long-press-up=Not Today / long-press-down=Never | following RE spec (swipe+long-press) + button fallback |
| D3 | **Merge `apverse-labs-RE` → `develop`** | standing hold | NOT merging until confirmed |

## 🟡 Additive backend items (deferred from UI-BUILD-01 per no-DB constraint → do in UI-BUILD-07/08)
| # | Item | Needed by | Type |
|---|---|---|---|
| B1 | `generation_run_id UUID` on `re_user_weekly_plans` + `re_user_feedback` | feedback envelope (§D contract) | additive migration |
| B2 | `locked` per-slot field (`re_user_weekly_plans` + `re_user_addon_plans`) or `re_user_plan_locks` table | lock persistence (weekly §G) | additive migration |
| B3 | scorer returns component breakdown `{component: value}` | why-this / debug score breakdown | pure-fn change (re-dish-expander) |

## 🟢 Data/pipeline blocked (cannot fabricate — governed)
| # | Item | Why blocked | Right step |
|---|---|---|---|
| P1 | Food DNA `food_dna_match` + `cook_fit` scoring | no per-dish DNA in v3 (DOC-08 is a spec) | DOC-27 governed tagging pipeline + ingredient linkage |
| P2 | Allergy hard-filter on RE dishes | RE dishes name-only, no ingredient IDs | ingredient↔dish linkage data build |
| P3 | Fish/chicken/egg protein badges | no per-dish protein tag in v3 | protein tag via DOC-27 pipeline |
| P4 | Weekly grocery aggregation | needs dish→ingredient linkage | same as P2 |

## 🔧 Infra / test debt
| # | Item | Note |
|---|---|---|
| I1 | RN component-test library not installed | render tests deferred; pure logic unit-tested + tsc gate. Add `@testing-library/react-native`. |
| I2 | No ESLint config in app | `tsc` is the type gate; add eslint config later |
| I3 | Visual QA needs running Expo app | UI-BUILD-11; cannot verify pixels headless |
| I4 | DB-integration tests need staging secrets | data MCP-verified meanwhile |

## ✅ Decisions already made (recorded)
- Weekend-pattern onboarding answer → seeds `class_affinity_vector` (no dedicated column) — faithful soft signal.
- `RETracePanel` is the ONLY surface showing raw RE internals; renders null in production (build flag).
- UI built on UI-BUILD-01 foundation primitives; bottom sheet = plain RN Modal (no third-party sheet lib / trade dress).
- All RE reads/writes go through the resolver service (`re-engine.service`) — never a specific engine version.

## 📋 Pending UI work (post component-layer, all app-run gated)
| # | Item | Build |
|---|---|---|
| W1 | Mount onboarding components into `(re-onboarding)/re-step-*.tsx` + wire capture fns + `saveREOnboardingStep` | UI-BUILD-02 finish |
| W2 | Mount `REMealCard` timeline into `app/(tabs)/index.tsx` for RE users + image pipeline | UI-BUILD-05 finish |
| W3 | Mount weekly grid + `RESwapSheet` into `WeekView`/tabs; per-tier candidate fetch (`.eq(meal_class_code, tier.classCode)`) | UI-BUILD-06/07 finish |
| W4 | Wire `RETracePanel` under `(dev)` with live persona/overlays/class/score | dev |
| W5 | Visual QA + device SR pass + golden-household visual run | UI-BUILD-11 |
| W6 | Add `@testing-library/react-native` for component render tests (I1) | infra |

## Build status snapshot (this session)
UI-BUILD-01 ✅ · 02 ✅(component+logic; screens W1) · 04/05 ✅(component+hooks; screens W2) ·
06/07 ✅(component+logic; screens W3) · Final QA → **UI_RE_PARTIAL_WITH_BLOCKERS** (BLK-1 visual/mount).
416 tests/22 suites green; app tsc 0.

---
*Status updated per build. Final review item: confirm D1–D3, schedule B1–B3, govern P1–P4, finish W1–W6.*
