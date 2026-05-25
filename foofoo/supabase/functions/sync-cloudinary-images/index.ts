/**
 * @summary Syncs Cloudinary image assets to the dishes.cloudinary_public_id column.
 *
 * @description
 * Calls the Cloudinary Admin API to list all uploaded images, then matches
 * each one to a dish row using slug normalisation:
 *   public_id "curd_rice_hero_01_qxxbm7"
 *     -> strip "_hero_01_XXXXXX" suffix -> base slug "curd_rice"
 *     -> match dishes WHERE LOWER(REPLACE(name, ' ', '_')) = 'curd_rice'
 *     -> UPDATE dishes SET cloudinary_public_id = 'curd_rice_hero_01_qxxbm7'
 *
 * Secrets required -- add in Supabase Dashboard -> Integrations -> Vault:
 *   CLOUDINARY_API_KEY    -- Cloudinary API key
 *   CLOUDINARY_API_SECRET -- Cloudinary API secret
 *
 * Vault secrets are read via supabase.rpc('get_vault_secret') -- a SECURITY
 * DEFINER SQL function in the public schema that reads vault.decrypted_secrets.
 * This function is created by migration 20260525000000_add_get_vault_secret_fn.sql.
 *
 * Fallback: if Vault returns null, reads CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * from Edge Function environment variables (Dashboard -> Edge Functions ->
 * sync-cloudinary-images -> Secrets).
 *
 * Invoke with:
 *   supabase functions invoke sync-cloudinary-images --no-verify-jwt
 *
 * @returns {Response} JSON summary with matched/unmatched counts and names.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLOUDINARY_CLOUD_NAME = 'dzlqsobol';
const CLOUDINARY_API_BASE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;
const PAGE_SIZE = 500;

function extractBaseSlug(publicId: string): string {
  const name = publicId.split('/').pop() ?? publicId;
  const heroIdx = name.indexOf('_hero_01_');
  if (heroIdx !== -1) return name.slice(0, heroIdx);
  const parts = name.split('_');
  return parts.slice(0, -1).join('_');
}

Deno.serve(async (_req) => {
  try {
    // 1. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase runtime.
    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Read Cloudinary credentials via RPC.
    //    PostgREST only exposes the public schema, so we cannot query vault.decrypted_secrets
    //    directly. Instead we call get_vault_secret(), a SECURITY DEFINER SQL function
    //    (created by migration 20260525000000_add_get_vault_secret_fn.sql) that reads Vault.
    //    Fallback: Edge Function env var (Dashboard -> Edge Functions -> Secrets).
    const readSecret = async (secretName: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc('get_vault_secret', { p_name: secretName });
      if (error) console.warn(`[SYNC-CLOUDINARY] Vault RPC error for ${secretName}:`, error.message);
      return (data as string | null) ?? Deno.env.get(secretName) ?? null;
    };

    const [apiKey, apiSecret] = await Promise.all([
      readSecret('CLOUDINARY_API_KEY'),
      readSecret('CLOUDINARY_API_SECRET'),
    ]);

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'MISSING_SECRETS',
          message:
            'CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET not found. ' +
            'Option A: ensure get_vault_secret SQL function exists (migration 20260525000000) ' +
            'and secrets are in Vault. ' +
            'Option B: set them via Dashboard -> Edge Functions -> sync-cloudinary-images -> Secrets.',
        },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);

    // 3. Fetch all Cloudinary assets (paginated)
    const allResources: Array<{ public_id: string }> = [];
    let nextCursor: string | null = null;

    do {
      const url = new URL(`${CLOUDINARY_API_BASE}/resources/image`);
      url.searchParams.set('max_results', String(PAGE_SIZE));
      url.searchParams.set('resource_type', 'image');
      if (nextCursor) url.searchParams.set('next_cursor', nextCursor);

      const resp = await fetch(url.toString(), { headers: { Authorization: authHeader } });

      if (!resp.ok) {
        const body = await resp.text();
        return new Response(JSON.stringify({
          success: false,
          error: { code: 'CLOUDINARY_API_ERROR', message: body },
        }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }

      const data = await resp.json() as {
        resources: Array<{ public_id: string }>;
        next_cursor?: string;
      };
      allResources.push(...data.resources);
      nextCursor = data.next_cursor ?? null;
    } while (nextCursor);

    console.log(`[SYNC-CLOUDINARY] Fetched ${allResources.length} Cloudinary assets`);

    // 4. Fetch all dish rows for matching
    const { data: dishes, error: dishErr } = await supabase.from('dishes').select('id, name');

    if (dishErr || !dishes) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'DB_ERROR', message: dishErr?.message ?? 'Could not fetch dishes' },
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const slugToDish = new Map<string, { id: number; name: string }>();
    for (const d of dishes) {
      slugToDish.set(d.name.toLowerCase().replace(/\s+/g, '_'), { id: d.id, name: d.name });
    }

    // 5. Match assets -> dishes
    const matched:   Array<{ dishId: number; dishName: string; publicId: string }> = [];
    const unmatched: Array<{ publicId: string; baseSlug: string }> = [];

    for (const asset of allResources) {
      const baseSlug = extractBaseSlug(asset.public_id);
      const dish = slugToDish.get(baseSlug);
      if (dish) {
        matched.push({ dishId: dish.id, dishName: dish.name, publicId: asset.public_id });
      } else {
        unmatched.push({ publicId: asset.public_id, baseSlug });
      }
    }

    // 6. Update dishes in batches of 50
    const BATCH = 50;
    let updateErrors = 0;
    for (let i = 0; i < matched.length; i += BATCH) {
      const batch = matched.slice(i, i + BATCH);
      const updates = await Promise.allSettled(
        batch.map(m => supabase.from('dishes').update({ cloudinary_public_id: m.publicId }).eq('id', m.dishId))
      );
      for (const r of updates) {
        if (r.status === 'rejected' || r.value?.error) updateErrors++;
      }
    }

    // 7. Return summary
    const unmatchedNames = unmatched.map(u => u.publicId);
    console.log(`[SYNC-CLOUDINARY] Matched: ${matched.length} | Unmatched: ${unmatched.length} | Errors: ${updateErrors}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalAssets: allResources.length,
        matched: matched.length,
        unmatched: unmatched.length,
        updateErrors,
        matchedDishes: matched.map(m => ({ dishId: m.dishId, name: m.dishName, publicId: m.publicId })),
        unmatchedPublicIds: unmatchedNames,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SYNC-CLOUDINARY] Unhandled error:', msg);
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: msg },
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
