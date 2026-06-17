// DOC-23 / BUILD-08: Maps a user's assigned engine version string to a concrete engine instance.
// Pure functions are exported for unit testing; async resolution is handled by re-engine.service.ts.

import { REV1Engine } from '../versions/RE_V1';
import type { MealPlanningREEngine } from '../interface/MealPlanningREEngine';

export const SUPPORTED_ENGINE_VERSIONS = ['classfirst_v1'] as const;
export type SupportedEngineVersion = typeof SUPPORTED_ENGINE_VERSIONS[number];

/**
 * Canonicalise a raw profile version string into a supported version key.
 * Unknown or null/undefined values default to the current production version.
 */
export function resolveEngineVersion(rawVersion: string | null | undefined): SupportedEngineVersion {
  if ((SUPPORTED_ENGINE_VERSIONS as readonly string[]).includes(rawVersion ?? '')) {
    return rawVersion as SupportedEngineVersion;
  }
  return 'classfirst_v1';
}

/**
 * Instantiate the engine for a given supported version.
 * Future versions (RE_V2, RE_V3 …) are added here as new cases.
 */
export function createEngine(version: SupportedEngineVersion): MealPlanningREEngine {
  switch (version) {
    case 'classfirst_v1':
    default:
      return new REV1Engine();
  }
}
