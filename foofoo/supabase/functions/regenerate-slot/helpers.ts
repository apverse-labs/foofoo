/**
 * @summary Shared helpers for regenerate-slot Edge Function.
 *
 * @description IST date utilities, weather fetcher, seeded RNG, and standard
 *   HTTP response envelope. Mirrors generate-daily-plan/helpers.ts where the
 *   logic must stay in sync (date computation, weather caching).
 *
 * @calledBy supabase/functions/regenerate-slot/index.ts, scoring.ts
 */

import { RE_V1 } from './re-config.ts';

/**
 * @summary Returns today's date in IST as a YYYY-MM-DD string.
 * @returns {string} ISO date string in IST
 */
export function getTodayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * @summary Returns the IST date string for N days ago.
 * @param {number} n - Days to subtract
 * @returns {string} YYYY-MM-DD
 */
export function getDateDaysAgo(n: number): string {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * @summary Fetches weather for a city, using weather_cache table first.
 * @param {any} supabase - Authenticated Supabase client
 * @param {string} city - City to look up
 * @returns {Promise<{ weatherCode: number; tempCelsius: number } | null>}
 */
export async function getWeatherData(
  supabase: any,
  city: string,
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
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${apiKey}&units=metric`,
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
 * @summary Wraps success payload in the standard envelope.
 * @param {any} data - Payload to wrap
 * @param {Record<string,string>} headers - CORS+content headers
 * @returns {Response} 200 JSON response
 */
export function successResponse(data: any, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// Deterministic PRNG — xmur3 + mulberry32 (MIT)
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
 * @summary Deterministic pseudo-random number in [0,1) seeded by (userId, planDate, dishId, salt).
 */
export function seededRandom(userId: string, planDate: string, dishId: number, salt: string = ''): number {
  const seed = xmur3(`${userId}|${planDate}|${dishId}|${salt}`)();
  return mulberry32(seed)();
}
