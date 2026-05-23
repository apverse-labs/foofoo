# Vercel Environment Variables Setup

After connecting your GitHub repo to Vercel, add these
environment variables in Vercel Dashboard → Project → Settings →
Environment Variables:

| Variable | Where to Get | Required |
|----------|-------------|---------|
| EXPO_PUBLIC_SUPABASE_URL | Supabase Dashboard → Settings → API | YES |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Supabase Dashboard → Settings → API | YES |
| EXPO_PUBLIC_ONESIGNAL_APP_ID | OneSignal Dashboard → Settings → Keys | YES |
| EXPO_PUBLIC_POSTHOG_KEY | PostHog Dashboard → Project Settings | YES |
| EXPO_PUBLIC_POSTHOG_HOST | https://eu.i.posthog.com | YES |

Set all to: Environment = Production, Preview, Development

After adding: trigger a new deployment in Vercel.
