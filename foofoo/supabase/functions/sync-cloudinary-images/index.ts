/**
 * @summary Syncs Cloudinary image assets to the dishes.cloudinary_public_id column.
 *
 * @description
 * Calls the Cloudinary Admin API to list all uploaded images, then matches
 * each one to a dish row using slug normalisation:
 *   public_id "curd_rice_hero_01_qxxbm7"
 *     → strip "_hero_01_XXXXXX" suffix → base slug "curd_rice"
 *     → match dishes WHERE LOWER(REPLACE(name, ' ', '_')) = 'curd_rice'
 *     → UPDATE dishes SET cloudinary_public_id = 'curd_rice_hero_01_qxxbm7'
 *
 * Secrets required (add in Supabase Dashboard → Settings → Vault):
 *   CLOUDINARY_API_KEY    — Cloudinary API key
 *   CLOUDINARY_API_SECRET — Cloudinary API secret
 *
 * Invoke with:
 *   supabase functions invoke sync-cloudinary-images --no-verify-jwt
 *
 * @returns {Response} JSON summary with matched/unmatched counts and names.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLOUDINARY_CLOUD_NAME = 'dzlqsobol';
const CLOUDINARY_API_BASE = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;
const PAGE_SIZE = 500; // max per Cloudinary Admin API request

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * @summary Strips the _hero_01_XXXXXX suffix from a Cloudinary public_id.
 * @param {string} publicId - e.g. "curd_rice_hero_01_qxxbm7"
 * @returns {string} base slug, e.g. "curd_rice"
 */
function extractBaseSlug(publicId: string): string {
  // Remove optional subfolder prefix (e.g. "folder/curd_rice_hero_01_qxxbm7")
  const name = publicId.split('/').pop() ?? publicId;
  // Strip _hero_01_XXXXXX: remove the last two underscore-delimited segments
  // "curd_rice_hero_01_qxxbm7" → split by "_" → [..., "hero", "01", "qxxbm7"]
  // We look for the first occurrence of "_hero_01_" and take everything before it.
  const heroIdx = name.indexOf('_hero_01_');
  if (heroIdx !== -1) return name.slice(0, heroIdx);
  // Fallback: strip last segment (the Cloudinary ID)
  const parts = name.split('_');
  return parts.slice(0, -1).join('_');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    // 1. Read secrets from Supabase Vault
    const apiKey    = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'MISSING_SECRETS', message: 'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set in Supabase Vault.' },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);

    // 2. Fetch all Cloudinary assets (paginated)
    const allResources: Array<{ public_id: string }> = [];
    let nextCursor: string | null = null;

    do {
      const url = new URL(`${CLOUDINARY_API_BASE}/resources/image`);
      url.searchParams.set('max_results', String(PAGE_SIZE));
      url.searchParams.set('resource_type', 'image');
      if (nextCursor) url.searchParams.set('next_cursor', nextCursor);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: authHeader },
      });

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

    // 3. Fetch all dish rows (id, name) for matching
    const { data: dishes, error: dishErr } = await supabase
      .from('dishes')
      .select('id, name');

    if (dishErr || !dishes) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'DB_ERROR', message: dishErr?.message ?? 'Could not fetch dishes' },
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Build lookup: normalised_slug → dish_id
    const slugToDish = new Map<string, { id: number; name: string }>();
    for (const d of dishes) {
      const slug = d.name.toLowerCase().replace(/\s+/g, '_');
      slugToDish.set(slug, { id: d.id, name: d.name });
    }

    // 4. Match assets → dishes
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

    // 5. Update dishes in batches of 50
    const BATCH = 50;
    let updateErrors = 0;
    for (let i = 0; i < matched.length; i += BATCH) {
      const batch = matched.slice(i, i + BATCH);
      const updates = await Promise.allSettled(
        batch.map(m =>
          supabase.from('dishes')
            .update({ cloudinary_public_id: m.publicId })
            .eq('id', m.dishId)
        )
      );
      for (const r of updates) {
        if (r.status === 'rejected' || r.value?.error) updateErrors++;
      }
    }

    // 6. Log summary
    const unmatchedNames = unmatched.map(u => u.publicId);
    console.log(`[SYNC-CLOUDINARY] Matched: ${matched.length} | Unmatched: ${unmatched.length} | Update errors: ${updateErrors}`);
    if (unmatched.length > 0) {
      console.log('[SYNC-CLOUDINARY] Unmatched public_ids:', unmatchedNames.join(', '));
    }

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
