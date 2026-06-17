// DOC-28 / BUILD-10: Versioning, Governance & Change Log.
// Pure helpers exported for unit testing.
// Wraps re-admin.repository for release creation with governance validation.

import { createTaxonomyRelease } from '../repositories/re-admin.repository';
import { Logger } from '../utils/systemLogger';
import type { TaxonomyReleaseInput, TaxonomyRiskLevel } from '../repositories/re-admin.repository';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VersionBump = 'patch' | 'minor' | 'major';

export interface ChangelogEntry {
  taxonomyVersion: string;
  versionFrom: string;
  versionTo: string;
  changedEntities: string[];
  riskLevel: TaxonomyRiskLevel;
  approvedBy: string;
  releaseNotes: string;
  rollbackPlan: string;
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/**
 * @summary Parse a semver string into its [major, minor, patch] tuple.
 *
 * @param {string} version - e.g. 'meal_taxonomy_1.2.3' or '1.2.3'
 * @returns {[number, number, number]} Parsed components.
 * @throws if the version string cannot be parsed.
 */
export function parseSemver(version: string): [number, number, number] {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Cannot parse version: ${version}`);
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * @summary Bump a version string by the given bump type.
 *
 * @description DOC-28 §5 Semantic Release Rules:
 *   - patch: typo / tag fix / source note → 1.0.0 → 1.0.1
 *   - minor: add class / dish / city overlay → 1.0.0 → 1.1.0
 *   - major: change hierarchy / alter API / rewrite cohort → 1.0.0 → 2.0.0
 *
 * Preserves any non-numeric prefix (e.g. 'meal_taxonomy_').
 *
 * @param {string}      current - Current version string.
 * @param {VersionBump} bump    - 'patch' | 'minor' | 'major'
 * @returns {string} New version string.
 */
export function bumpVersion(current: string, bump: VersionBump): string {
  const [major, minor, patch] = parseSemver(current);
  const prefix = current.replace(/\d+\.\d+\.\d+.*$/, '');

  switch (bump) {
    case 'major': return `${prefix}${major + 1}.0.0`;
    case 'minor': return `${prefix}${major}.${minor + 1}.0`;
    case 'patch': return `${prefix}${major}.${minor}.${patch + 1}`;
  }
}

/**
 * @summary Determine what kind of version bump occurred between two versions.
 *
 * @param {string} from - Previous version string.
 * @param {string} to   - New version string.
 * @returns {VersionBump | null} The bump type, or null if versions are equal or to < from.
 */
export function classifyVersionBump(from: string, to: string): VersionBump | null {
  const [maj1, min1, pat1] = parseSemver(from);
  const [maj2, min2, pat2] = parseSemver(to);

  if (maj2 > maj1) return 'major';
  if (maj2 === maj1 && min2 > min1) return 'minor';
  if (maj2 === maj1 && min2 === min1 && pat2 > pat1) return 'patch';
  return null;
}

/**
 * @summary Derive appropriate risk level from the version bump type.
 *
 * @description DOC-28 §5: major → high, minor → medium, patch → low.
 *
 * @param {VersionBump} bump
 * @returns {TaxonomyRiskLevel}
 */
export function riskLevelForBump(bump: VersionBump): TaxonomyRiskLevel {
  switch (bump) {
    case 'major': return 'high';
    case 'minor': return 'medium';
    case 'patch': return 'low';
  }
}

// ── Service operations ────────────────────────────────────────────────────────

/**
 * @summary Create a governance changelog entry and persist a taxonomy release record.
 *
 * @description DOC-28 §7 Change Log Template.
 *   Derives risk level from the version bump automatically.
 *   Release starts in 'pending' QA status; the QA team updates it via admin ops.
 *
 * @param {ChangelogEntry} entry
 * @returns {Promise<string>} The created release ID.
 */
export async function createChangelogEntry(entry: ChangelogEntry): Promise<string> {
  try {
    const bump = classifyVersionBump(entry.versionFrom, entry.versionTo);
    if (!bump) {
      throw new Error(`Version ${entry.versionTo} is not greater than ${entry.versionFrom}`);
    }

    const riskLevel = riskLevelForBump(bump);

    const input: TaxonomyReleaseInput = {
      taxonomyVersion: entry.taxonomyVersion,
      versionFrom: entry.versionFrom,
      versionTo: entry.versionTo,
      changedEntities: entry.changedEntities,
      riskLevel,
      approvedBy: entry.approvedBy,
      releaseNotes: entry.releaseNotes,
      rollbackPlan: entry.rollbackPlan,
    };

    const releaseId = await createTaxonomyRelease(input);
    Logger.info('RE_GOVERNANCE', 'Changelog entry created', {
      releaseId, version: entry.taxonomyVersion, bump, riskLevel,
    });
    return releaseId;
  } catch (err: unknown) {
    Logger.error('RE_GOVERNANCE', 'createChangelogEntry failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
