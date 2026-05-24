/**
 * @summary Cloudinary image URL builder and public-ID helpers.
 *
 * @description
 * All Cloudinary transforms go through this file — never construct
 * Cloudinary URLs manually elsewhere in the codebase.
 *
 * Cloud: dzlqsobol (public — no env var needed).
 * Images live at the root of the media library with the naming convention:
 *   <dish_slug>_hero_01_<cloudinary_id>
 *   e.g. curd_rice_hero_01_qxxbm7
 *
 * Size presets:
 *   thumb → 240 px wide, q_75, f_auto  (WeekView cells)
 *   card  → 720 px wide, q_75, f_auto  (MealCard)
 *   hero  → 1080 px wide, q_80, f_auto (Dish Detail)
 */

export const CLOUDINARY_CLOUD_NAME = 'dzlqsobol';

const BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

type ImageSize = 'thumb' | 'card' | 'hero';

const TRANSFORMS: Record<ImageSize, string> = {
  thumb: 'w_240,q_75,f_auto',
  card:  'w_720,q_75,f_auto',
  hero:  'w_1080,q_80,f_auto',
};

/**
 * @summary Builds an optimised Cloudinary URL for a given public_id and size.
 *
 * @param {string} publicId - Full Cloudinary public_id, e.g. "curd_rice_hero_01_qxxbm7"
 * @param {ImageSize} size  - Size preset: 'thumb' | 'card' | 'hero'
 * @returns {string} Full CDN URL with transform parameters
 *
 * @example
 * getCloudinaryUrl('curd_rice_hero_01_qxxbm7', 'card')
 * // → "https://res.cloudinary.com/dzlqsobol/image/upload/w_720,q_75,f_auto/curd_rice_hero_01_qxxbm7"
 */
export function getCloudinaryUrl(publicId: string, size: ImageSize): string {
  return `${BASE_URL}/${TRANSFORMS[size]}/${publicId}`;
}

/**
 * @summary Converts a dish name to the Cloudinary public_id prefix for matching.
 *
 * @description
 * Used during the sync script to match Cloudinary assets to dish rows.
 * The actual stored public_id has an additional suffix (e.g. _qxxbm7), so
 * this returns the base pattern only — not a complete public_id.
 *
 * @param {string} dishName - Human-readable dish name, e.g. "Curd Rice"
 * @returns {string} Base search slug, e.g. "curd_rice_hero_01"
 *
 * @example
 * dishNameToPublicId('Curd Rice')   // → "curd_rice_hero_01"
 * dishNameToPublicId('Kootu')       // → "kootu_hero_01"
 */
export function dishNameToPublicId(dishName: string): string {
  return `${dishName.toLowerCase().replace(/\s+/g, '_')}_hero_01`;
}

// ─── Quick smoke test (console.log 3 samples) ────────────────────────────────
// To verify, run:  npx ts-node -e "require('./src/utils/cloudinary')"
// Expected output:
//   https://res.cloudinary.com/dzlqsobol/image/upload/w_240,q_75,f_auto/curd_rice_hero_01_qxxbm7
//   https://res.cloudinary.com/dzlqsobol/image/upload/w_720,q_75,f_auto/kootu_hero_01_ox7giv
//   https://res.cloudinary.com/dzlqsobol/image/upload/w_1080,q_80,f_auto/dal_makhani_hero_01_abc123
if (process.env.CLOUDINARY_SMOKE_TEST) {
  console.log(getCloudinaryUrl('curd_rice_hero_01_qxxbm7', 'thumb'));
  console.log(getCloudinaryUrl('kootu_hero_01_ox7giv', 'card'));
  console.log(getCloudinaryUrl('dal_makhani_hero_01_abc123', 'hero'));
}
