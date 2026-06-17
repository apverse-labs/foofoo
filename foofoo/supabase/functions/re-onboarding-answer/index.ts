/**
 * POST /re-onboarding-answer — DOC-23 §Onboarding
 * Body: { screen: string, answer: Record<string, unknown>, profileId: string }
 * Persists the answer for the given screen and returns { nextScreen, completed }.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCREEN_ORDER = [
  'welcome', 'cohort', 'members', 'home_state', 'current_city',
  'diet', 'cook', 'health', 'weekday', 'weekend', 'swipe', 'confirm', 'loading', 'reveal',
] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const { screen, answer, profileId } = body as {
      screen: string;
      answer: Record<string, unknown>;
      profileId: string;
    };

    if (!screen || !profileId) {
      return new Response(
        JSON.stringify({ success: false, error: 'screen and profileId are required' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Persist the answer — write to re_user_household_profiles or profiles as appropriate
    const patch: Record<string, unknown> = { profile_id: profileId };
    if (screen === 'cohort') {
      if (answer.mainCohortId) patch.main_cohort_id = answer.mainCohortId;
      if (answer.subCohortId)  patch.sub_cohort_id  = answer.subCohortId;
    } else if (screen === 'home_state') {
      patch.home_state = answer.homeState ?? answer.home_state;
    } else if (screen === 'diet') {
      patch.nonveg_meals_per_week = answer.nonvegMealsPerWeek ?? null;
      if (answer.dietMode) patch.diet_mode = answer.dietMode;
    } else if (screen === 'cook') {
      if (answer.cookDependency) patch.cook_dependency = answer.cookDependency;
    } else if (screen === 'health') {
      if (answer.healthOverlayCode) patch.health_overlay_code = answer.healthOverlayCode;
      if (answer.healthScope) patch.health_scope = answer.healthScope;
    }

    if (Object.keys(patch).length > 1) {
      await supabase.from('re_user_household_profiles')
        .upsert(patch, { onConflict: 'profile_id' });
    }

    const idx = SCREEN_ORDER.indexOf(screen as typeof SCREEN_ORDER[number]);
    const nextScreen = idx >= 0 && idx < SCREEN_ORDER.length - 1 ? SCREEN_ORDER[idx + 1] : null;
    const completed = nextScreen === null || nextScreen === 'reveal';

    return new Response(
      JSON.stringify({ success: true, data: { nextScreen, completed } }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
