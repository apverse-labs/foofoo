/**
 * GET /re-onboarding-start — DOC-23 §Onboarding
 * Returns the list of main cohort cards for the first onboarding screen.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mirrors foofoo/src/config/re-onboarding-content.ts RE_MAIN_COHORT_SCREEN_COPY.
// Duplicated here because Edge Functions (Deno) cannot import the RN app's TS config.
const SUBCOHORT_SCREEN_COPY: Record<string, string> = {
  MC1: 'Show 5-6 sub-options: student/hostel, young professional, working woman alone, flatmates, migrant adult, desk/fitness adult',
  MC2: 'Show DINK, newly married, mixed-state, planning pregnancy, pregnant household, infant/baby household',
  MC3: 'Show toddler, school kid, teen, picky eater, family budget, homemaker elaborate',
  MC4: 'Show joint family, elderly couple, recovery light, elder+child, diabetic/BP member',
  MC5: 'Show health, gym/protein, vegetarian protein, Jain, fasting, skilled cook, cook-needs-instruction, maid-dependent, regular nonveg',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data, error } = await supabase
      .from('re_main_cohorts')
      .select('main_cohort_id, main_cohort_label, user_understands_as')
      .order('main_cohort_id', { ascending: true });

    if (error) throw error;

    const enriched = (data ?? []).map((row: { main_cohort_id: string }) => ({
      ...row,
      subcohort_screen_copy: SUBCOHORT_SCREEN_COPY[row.main_cohort_id] ?? '',
    }));

    return new Response(JSON.stringify({ success: true, data: enriched }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
