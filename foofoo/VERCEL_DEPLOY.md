# Deploying FooFoo to Vercel

## One-Time Setup (you do this in browser)

### Step 1: Create Vercel account
Go to vercel.com → Sign up with GitHub (free)

### Step 2: Import project
Vercel Dashboard → Add New Project → Import Git Repository
→ Select: apverse-labs/foofoo
→ Framework Preset: Other
→ Root Directory: . (root of repo)
→ Build Command: cd foofoo && npx expo export --platform web
→ Output Directory: foofoo/dist
→ Click Deploy

### Step 3: Add environment variables
Vercel Dashboard → your project → Settings → Environment Variables
Add all variables from VERCEL_ENV_SETUP.md

### Step 4: Redeploy with env vars
Vercel Dashboard → Deployments → Redeploy latest deployment

### After setup: auto-deploy
Every git push to main → Vercel automatically rebuilds and deploys.
Your app URL: https://[project-name].vercel.app

## Testing on iOS Chrome
1. On iPhone: open Chrome browser
2. Go to: https://[your-project-name].vercel.app
3. The app runs as a web app — full functionality
4. To install as PWA: Safari menu → Add to Home Screen

## Testing on any browser
Same URL works on:
- Chrome (Android, iOS, Desktop)
- Safari (iOS, Desktop)
- Firefox, Edge, Brave

## What works on web version:
- Full auth flow (sign up, sign in, sign out)
- Onboarding (all 7 steps)
- Home screen with meal cards
- Search with filters
- Meal Detail page
- Grocery list
- Profile page
- Week View

## What doesn't work on web (native-only):
- Push notifications (mobile native only)
- Haptic feedback (mobile native only)
- OneSignal player ID registration (mobile native only)
- Camera (not used yet anyway)
