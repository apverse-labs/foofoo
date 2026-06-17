/**
 * POST /re-personas-assign — DOC-23 §Profile
 * Body: { profileId, personaId, confidence, assignedBy, overlayPersonaIds? }
 * Upserts the active persona assignment (supersedes previous).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { profileId, personaId, confidence = 0, assignedBy = 'onboarding', overlayPersonaIds = [] } =
      await req.json() as {
        profileId: string;
        personaId: string;
        confidence?: number;
        assignedBy?: string;
        overlayPersonaIds?: string[];
      };

    if (!profileId || !personaId) {
      return new Response(
        JSON.stringify({ success: false, error: 'profileId and personaId are required' }),
        { status: 422, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date().toISOString();

    // Supersede existing active assignments
    await supabase
      .from('re_user_persona_assignments')
      .update({ is_active: false, superseded_at: now })
      .eq('profile_id', profileId)
      .eq('is_active', true);

    // Insert new active assignment
    const { error } = await supabase
      .from('re_user_persona_assignments')
      .insert({
        profile_id: profileId,
        persona_id: personaId,
        confidence,
        assigned_by: assignedBy,
        overlay_persona_ids: overlayPersonaIds,
        is_active: true,
        assigned_at: now,
      });

    if (error) throw error;

    // Mirror to re_user_household_profiles for fast plan-generation access
    await supabase
      .from('re_user_household_profiles')
      .upsert({ profile_id: profileId, persona_id: personaId, overlay_persona_ids: overlayPersonaIds }, { onConflict: 'profile_id' });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
