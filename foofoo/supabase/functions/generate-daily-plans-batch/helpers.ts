/**
 * @summary Date/time utilities, weather fetching, carousel reader, and HTTP response builder.
 *
 * @description Pure helper functions with no scoring logic.
 *   All are sync except getWeatherData and fetchCarousel which hit Supabase/OWM.
 *
 * @calledBy generate-daily-plan/index.ts
 */

import { RE_V1 } from './re-config.ts';

/**
 * @summary Returns today's date in IST as a YYYY-MM-DD string.
 * @returns {string} ISO date string in IST (e.g. '2026-05-21')
 */
export function getTodayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * @summary Returns the IST date string for N days ago.
 * @param {number} n - Number of days to subtract from today
 * @returns {string} YYYY-MM-DD date string in IST
 */
export function getDateDaysAgo(n: number): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * @summary Fetches current weather for a city, using the weather_cache table first.
 *
 * @description Cache TTL is RE_V1.WEATHER_CACHE_HOURS. On cache miss, calls OpenWeatherMap
 *   API and writes the result back to weather_cache. Returns null if key is missing or
 *   any network/DB error occurs — scoring continues without weather boost.
 *
 * @param {any} supabase - Authenticated Supabase client
 * @param {string} city - City name to look up (e.g. 'Mumbai')
 * @returns {Promise<{ weatherCode: number; tempCelsius: number } | null>}
 *   Weather data or null if unavailable
 */
export async function getWeatherData(
  supabase: any,
  city: string
): Promise<{ weatherCode: number; tempCelsius: number } | null> {
  try {
    const { data: rows } = await supabase
      .from('weather_cache')
      .select('weather_code, temp_celsius, expires_at')
      .eq('city', city)
      .limit(1);

    const cached = rows?.[0];
    if (cached && new Date(cached.expires_at) > new Date()) {
      return { weatherCode: cached.weather_code, tempCelsius: Number(cached.temp_celsius) };
    }

    const apiKey = Deno.env.get('OPENWEATHERMAP_KEY');
    if (!apiKey) return null;

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${apiKey}&units=metric`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const weatherCode: number = data.weather?.[0]?.id;
    const tempCelsius: number = data.main?.temp;
    const expiresAt = new Date(Date.now() + RE_V1.WEATHER_CACHE_HOURS * 60 * 60 * 1000).toISOString();

    await supabase.from('weather_cache')
      .insert({ city, weather_code: weatherCode, temp_celsius: tempCelsius, expires_at: expiresAt })
      .then(() => {});

    return { weatherCode, tempCelsius };
  } catch {
    return null;
  }
}

/**
 * @summary Reads an existing planner row's carousel from planner_carousel and groups by slot.
 *
 * @param {any} supabase - Authenticated Supabase client
 * @param {string} planId - UUID of the planner row
 * @returns {Promise<{ breakfast: any; lunch: any; dinner: any }>}
 *   Each slot contains { dish, carouselCount }
 */
export async function fetchCarousel(
  supabase: any,
  planId: string
): Promise<{ breakfast: any; lunch: any; dinner: any }> {
  // planner_carousel.ref_id is polymorphic — no FK to dishes — so PostgREST
  // can't auto-embed. Do two queries and assemble.
  const { data: rows } = await supabase
    .from('planner_carousel')
    .select('ref_id, ref_type, meal_slot, position')
    .eq('planner_id', planId)
    .eq('ref_type', 'dish')
    .order('position');

  const dishIds: number[] = ((rows || []) as any[])
    .map((r) => r.ref_id)
    .filter((id) => id != null);

  let dishesById = new Map<number, any>();
  if (dishIds.length > 0) {
    const { data: dishes } = await supabase
      .from('dishes')
      .select(`id, name, slug, cuisine_id, diet_type, spice_level,
               cook_time_mins, difficulty, calories, meal_types,
               dish_role, hero_image_url, blurhash,
               cuisines(id, code, name)`)
      .in('id', dishIds);
    dishesById = new Map(((dishes || []) as any[]).map((d) => [d.id as number, d]));
  }

  const bySlot: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
  for (const row of (rows || []) as any[]) {
    const dish = dishesById.get(row.ref_id);
    if (dish && bySlot[row.meal_slot]) bySlot[row.meal_slot].push(dish);
  }

  return {
    breakfast: { dish: bySlot.breakfast[0], carouselCount: bySlot.breakfast.length },
    lunch: { dish: bySlot.lunch[0], carouselCount: bySlot.lunch.length },
    dinner: { dish: bySlot.dinner[0], carouselCount: bySlot.dinner.length },
  };
}

/**
 * @summary Wraps a data payload in the standard { success: true, data } envelope.
 *
 * @param {any} data - The payload to wrap
 * @param {Record<string, string>} headers - CORS + content-type headers to include
 * @returns {Response} HTTP 200 response with JSON body
 */
export function successResponse(data: any, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// xmur3 + mulberry32 — small, fast, deterministic PRNG.
// Source: https://github.com/bryc/code/blob/master/jshash/PRNGs.md (MIT)
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @summary Deterministic pseudo-random number for (userId, planDate, dishId, salt).
 *
 * @description Same inputs always return the same number, so re-running plan
 *   generation for the same user on the same day yields an identical carousel
 *   order. Salt lets us request multiple decorrelated streams per (user, day,
 *   dish) when needed (e.g. different slots).
 *
 * @returns Number in [0, 1)
 */
export function seededRandom(userId: string, planDate: string, dishId: number, salt: string = ''): number {
  const seed = xmur3(`${userId}|${planDate}|${dishId}|${salt}`)();
  return mulberry32(seed)();
}
