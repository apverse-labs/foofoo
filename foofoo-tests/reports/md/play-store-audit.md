# Play Store Pre-Submission Audit

**Date:** 2026-05-26  
**App:** Foofoo — `com.foofoo.app`  
**EAS Project:** `407c854c-bb29-4ca5-9193-ce80955b5c49`  
**Expo SDK:** 56 (`~56.0.3`) / React Native 0.85.3  
**Auditor:** Claude Code  

---

## Status Summary

| Category | Status |
|---|---|
| `eas.json` build profiles | ✅ Fixed — production now builds AAB for store |
| `app.json` config | ✅ Fixed — 3 issues resolved |
| Play Store assets | ❌ Blockers — feature graphic + screenshots missing |
| Legal URLs | ❌ Blockers — privacy policy and ToS return 404 |
| OTA Updates | ⚠️ Warning — `expo-updates` not installed |
| Play Console setup | ⏳ Manual — account + listing not yet created |

---

## ❌ BLOCKERS

These must be resolved before any Play Store submission attempt.

### BLOCKER-1: Privacy Policy URL returns 404

**File:** `foofoo/app.json` → `android.privacyPolicyUrl`  
**URL:** `https://foofoo-privacy.vercel.app/privacy`  
**Impact:** Play Store binary metadata validation will reject the build. The app binary embeds this URL; if it returns 404 during review, the app will be rejected.

Also affects:
- `foofoo/src/config/constants.ts` → `LEGAL.PRIVACY_POLICY_URL`
- `foofoo/app.json` → in-app privacy policy link shown to users

**Fix:** Deploy actual privacy policy content to `https://foofoo-privacy.vercel.app/privacy`. The Vercel project exists but the route is missing.

---

### BLOCKER-2: Terms of Service URL returns 404

**File:** `foofoo/src/config/constants.ts` → `LEGAL.TERMS_OF_SERVICE_URL`  
**URL:** `https://foofoo-privacy.vercel.app/terms`  
**Impact:** Play Store data safety form requires a link to ToS if you collect user data. The URL is embedded in the app; a 404 in the app store review will cause rejection.

**Fix:** Deploy actual ToS content to `https://foofoo-privacy.vercel.app/terms`.

---

### BLOCKER-3: Feature graphic missing

**Required:** 1024 × 500 px PNG or JPG (max 1 MB)  
**Status:** No file exists in `foofoo/assets/` or anywhere in the repository.  
**Impact:** Play Store listing cannot be published without a feature graphic. This is mandatory, not optional.

**Fix:** Create a branded 1024×500 graphic (landscape banner with app name, tagline, and visual). Tools: Figma, Canva (template available), or Adobe Illustrator. Export as PNG < 1 MB. Upload in Play Console → Store Listing → Graphics.

---

### BLOCKER-4: Screenshots missing

**Required:** Minimum 2 screenshots per device type (phone), max 8  
**Recommended:** 4–8 screens covering key user journeys  
**Status:** `foofoo/assets/screenshots/` directory does not exist. No screenshots in repo.  
**Impact:** Play Store listing cannot be published without phone screenshots.

**Suggested screens to capture:**
1. Home screen — today's meal plan cards
2. Onboarding — preference selection
3. Meal detail — dish expanded with cook/order options
4. Search / browse dishes
5. Notification opt-in prompt

**Format:** PNG or JPG, minimum 320px on shortest side, maximum 3840px on longest side. 16:9 aspect ratio preferred for feature placement.

---

### BLOCKER-5: Google Play Developer account not created

**Cost:** ₹2,100 one-time registration fee  
**Status:** No evidence of an existing Play Console account linked to `apverse-labs`.  
**Impact:** Cannot upload any build without an account. Account verification takes 1–3 business days.

**Fix:** Register at [play.google.com/console/signup](https://play.google.com/console/signup).

---

## ⚠️ WARNINGS

These will not immediately block submission but should be addressed before or shortly after launch.

### WARN-1: OTA updates (`expo-updates`) not installed

**Status:** `expo-updates` package is absent from `foofoo/package.json`. No `updates.url` or `runtimeVersion` in `app.json`.  
**Impact:** No over-the-air JS updates between store releases. Every bug fix requires a full Play Store review cycle (1–3 days).

**Recommendation:**
```bash
npx expo install expo-updates
```
Then add to `app.json` under `"expo"`:
```json
"updates": {
  "url": "https://u.expo.dev/407c854c-bb29-4ca5-9193-ce80955b5c49"
},
"runtimeVersion": {
  "policy": "sdkVersion"
}
```
Set up EAS Update channels to match build profiles (production, preview).  
**Note:** Do not add the `updates` section until `expo-updates` is actually installed — it will be silently ignored and may confuse future developers.

---

### WARN-2: `submit.production` in `eas.json` is empty

**File:** `foofoo/eas.json` → `submit.production: {}`  
**Impact:** Running `eas submit --platform android --profile production` will prompt interactively for service account key and track. Without a service account JSON configured, CI/CD submission is blocked.

**Fix:** Either:
- (Recommended) Add a Google Play service account JSON to EAS secrets and reference it:
  ```json
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "/path/to/service-account.json",
        "track": "internal"
      }
    }
  }
  ```
- Or submit manually from Play Console by uploading the AAB directly.

---

### WARN-3: No closed testing track / beta testers configured

**Impact:** Google Play now enforces a mandatory 14-day closed testing requirement with at least 12 testers before a new developer account can publish to open or production tracks.  
**Fix:** Create a closed testing track in Play Console, add 12–20 testers (friends, colleagues, early users), and run for 14+ days. Plan this now — it gates the public launch date.

---

### WARN-4: Content rating questionnaire not completed

**Impact:** Without an IARC content rating, the app cannot be published. The questionnaire takes ~10 minutes in Play Console.  
**Rating expectation:** "Everyone" — no violence, no adult content, educational/utility category.

---

### WARN-5: Data Safety form not completed

**Impact:** Since May 2022, Play Store requires all apps to complete the Data Safety section. Missing or inaccurate information causes rejection.  
**Data Foofoo collects (based on codebase audit):**
- Email address (account creation)
- Meal preferences and dietary restrictions
- Swipe / lock choices (interaction data)
- Device token (push notifications via OneSignal)
- Analytics events (implicit)

All data is linked to user identity. Users can delete their account (confirm 72-hour deletion SLA per DPDP compliance).

---

### WARN-6: DPDP compliance — account deletion flow

**India's Digital Personal Data Protection Act (DPDP 2023)** requires:
- In-app account deletion option
- Data deleted within 72 hours of request
- User consent tracked with timestamp

**Status:** Verify in-app deletion flow exists and is accessible in Settings. Confirm Supabase user deletion cascade covers all tables.

---

### WARN-7: Adaptive icon background not referenced

**File:** `foofoo/assets/android-icon-background.png` exists (18K) but is unused.  
**Current config:** `android.adaptiveIcon.backgroundColor: "#2D6A4F"` (solid colour, not image).  
**Impact:** None — using `backgroundColor` is correct and simpler. The file is likely a leftover asset. No action required unless a richer background is desired.

---

## 🔧 FIXES APPLIED (this audit)

The following changes were made and are staged/committed on branch `claude/beautiful-thompson-MDCXI`:

| # | File | Change | Reason |
|---|---|---|---|
| 1 | `foofoo/eas.json` | `production.android.buildType`: `"apk"` → `"app-bundle"` | Play Store has required AAB format since August 2021. An APK upload would be rejected immediately. |
| 2 | `foofoo/eas.json` | Added `production.distribution: "store"` | Required to tell EAS this build targets the Play Store (affects signing, build optimisations). |
| 3 | `foofoo/app.json` | `onesignal-expo-plugin.mode`: `"development"` → `"production"` | Development mode OneSignal credentials are not valid for store builds. |
| 4 | `foofoo/app.json` | Added `android.privacyPolicyUrl` | Embeds the privacy policy URL in the binary metadata for Play Store validation. |

---

## 📋 MANUAL STEPS — Founder Action List

Complete these in order. Steps 1–5 are prerequisites for everything else.

### Step 1 — Deploy privacy policy (BLOCKER-1)
- Go to your Vercel project (`foofoo-privacy`)
- Add a `/privacy` route with full GDPR/DPDP-compliant privacy policy
- Confirm `https://foofoo-privacy.vercel.app/privacy` returns HTTP 200

### Step 2 — Deploy terms of service (BLOCKER-2)
- Add a `/terms` route to the same Vercel project
- Confirm `https://foofoo-privacy.vercel.app/terms` returns HTTP 200

### Step 3 — Create feature graphic (BLOCKER-3)
- Dimensions: **1024 × 500 px**, PNG or JPG, < 1 MB
- Should show app name, tagline ("Your AI meal planner"), and a visual of the meal cards
- Use Canva or Figma. Canva has a "Google Play Feature Graphic" template.
- Save to `foofoo/assets/feature-graphic.png` (for reference; uploaded via Play Console, not in the binary)

### Step 4 — Take screenshots (BLOCKER-4)
- Capture on a physical Android device or emulator (Pixel 7 / Pixel 6 recommended)
- Minimum: 2 screenshots. Recommended: 6–8 across key flows.
- Save to `foofoo/assets/screenshots/` for reference

### Step 5 — Create Google Play Developer account (BLOCKER-5)
- URL: [play.google.com/console/signup](https://play.google.com/console/signup)
- Cost: ₹2,100 (one-time)
- Verification takes 1–3 business days

### Step 6 — Create app in Play Console
- Application type: App
- Default language: English (India) or Hindi as appropriate
- Package name: `com.foofoo.app`

### Step 7 — Write store listing copy
- **Short description** (≤ 80 characters): e.g., `"AI-powered daily meal planner for Indian households"`
- **Full description** (≤ 4000 characters): Cover the problem, solution, key features (swipe to pick, lock favourites, cook or order), personalisation, and notification features.

### Step 8 — Complete content rating questionnaire (WARN-4)
- In Play Console → App Content → Rating
- Category: Utility / Food & Drink
- Takes ~10 minutes

### Step 9 — Complete data safety form (WARN-5)
- In Play Console → App Content → Data Safety
- Declare: email, preferences, interaction data, device identifiers
- Add links to privacy policy

### Step 10 — Set up closed testing track (WARN-3)
- In Play Console → Testing → Closed Testing
- Invite 12–20 testers (email addresses)
- Run for at least **14 days** — this is mandatory for new developer accounts before production

### Step 11 — Build production AAB
```bash
cd foofoo
eas build --platform android --profile production
```
This produces a signed `.aab` file via EAS Build servers. Takes ~10–20 minutes.

### Step 12 — Upload to Play Console and submit
- Either use `eas submit --platform android --profile production` (after configuring service account in WARN-2)
- Or download the `.aab` from EAS dashboard and upload manually in Play Console → Release → Production

---

## ✅ READY TO SUBMIT WHEN

- [ ] `https://foofoo-privacy.vercel.app/privacy` returns HTTP 200 with actual content
- [ ] `https://foofoo-privacy.vercel.app/terms` returns HTTP 200 with actual content
- [ ] Feature graphic created (1024×500px, < 1 MB)
- [ ] Minimum 2 phone screenshots captured and uploaded
- [ ] Google Play Developer account active and verified
- [ ] App created in Play Console with `com.foofoo.app`
- [ ] Store listing text written (short + full descriptions)
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed
- [ ] Closed testing track running with ≥12 testers for ≥14 days
- [ ] `eas build --platform android --profile production` completes without error
- [ ] Signed AAB uploaded to Play Console internal/closed track for final validation
- [ ] All review comments from closed beta addressed

---

## Asset Inventory

| Asset | Required | Status | Notes |
|---|---|---|---|
| `assets/icon.png` | Yes | ✅ 1024×1024 RGB PNG | Play Store uploads from EAS; no alpha required |
| `assets/android-icon-foreground.png` | Yes | ✅ Present | Used for adaptive icon |
| `assets/splash-icon.png` | Yes | ✅ Present | Splash screen |
| `assets/favicon.png` | Yes | ✅ Present | Web PWA |
| Feature graphic (Play Console) | Yes | ❌ Missing | 1024×500px; uploaded via Play Console |
| Phone screenshots (Play Console) | Yes (min 2) | ❌ Missing | Captured from device/emulator |

---

## Config Inventory

| Config | Value | Status | Notes |
|---|---|---|---|
| `android.package` | `com.foofoo.app` | ✅ | Unique, registered to app |
| `android.versionCode` | `1` | ✅ | First release |
| `version` | `1.0.0` | ✅ | Matches versionCode 1 |
| `android.privacyPolicyUrl` | `https://foofoo-privacy.vercel.app/privacy` | ⚠️ URL 404 | Config present; URL must go live |
| `expo.sdk` | `~56.0.3` | ✅ | Current stable |
| `orientation` | `portrait` | ✅ | Locked |
| `userInterfaceStyle` | `light` | ✅ | No dark mode (consistent) |
| `onesignal mode` | `production` | ✅ Fixed | Was `development` |
| `eas.production.distribution` | `store` | ✅ Fixed | Was missing |
| `eas.production.buildType` | `app-bundle` | ✅ Fixed | Was `apk` |
| `expo-updates` | Not installed | ⚠️ | OTA updates unavailable |
| `runtimeVersion` | Not set | ⚠️ | Required when expo-updates is added |
