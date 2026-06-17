import {
  parseSemver,
  bumpVersion,
  classifyVersionBump,
  riskLevelForBump,
} from '../../foofoo/src/services/re-governance.service';

// ── parseSemver ───────────────────────────────────────────────────────────────

describe('parseSemver', () => {
  it('parses a plain semver string', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
  });

  it('parses a prefixed taxonomy version', () => {
    expect(parseSemver('meal_taxonomy_1.0.0')).toEqual([1, 0, 0]);
  });

  it('throws for an unparseable string', () => {
    expect(() => parseSemver('not-a-version')).toThrow();
  });
});

// ── bumpVersion ───────────────────────────────────────────────────────────────

describe('bumpVersion', () => {
  it('increments patch version', () => {
    expect(bumpVersion('meal_taxonomy_1.0.0', 'patch')).toBe('meal_taxonomy_1.0.1');
    expect(bumpVersion('meal_taxonomy_1.2.3', 'patch')).toBe('meal_taxonomy_1.2.4');
  });

  it('increments minor version and resets patch', () => {
    expect(bumpVersion('meal_taxonomy_1.0.0', 'minor')).toBe('meal_taxonomy_1.1.0');
    expect(bumpVersion('meal_taxonomy_1.2.3', 'minor')).toBe('meal_taxonomy_1.3.0');
  });

  it('increments major version and resets minor and patch', () => {
    expect(bumpVersion('meal_taxonomy_1.0.0', 'major')).toBe('meal_taxonomy_2.0.0');
    expect(bumpVersion('meal_taxonomy_1.9.7', 'major')).toBe('meal_taxonomy_2.0.0');
  });

  it('preserves the non-numeric prefix', () => {
    const result = bumpVersion('meal_taxonomy_2.1.0', 'patch');
    expect(result.startsWith('meal_taxonomy_')).toBe(true);
  });
});

// ── classifyVersionBump ───────────────────────────────────────────────────────

describe('classifyVersionBump', () => {
  it('classifies major bump correctly', () => {
    expect(classifyVersionBump('meal_taxonomy_1.0.0', 'meal_taxonomy_2.0.0')).toBe('major');
  });

  it('classifies minor bump correctly', () => {
    expect(classifyVersionBump('meal_taxonomy_1.0.0', 'meal_taxonomy_1.1.0')).toBe('minor');
  });

  it('classifies patch bump correctly', () => {
    expect(classifyVersionBump('meal_taxonomy_1.0.0', 'meal_taxonomy_1.0.1')).toBe('patch');
  });

  it('returns null for equal versions', () => {
    expect(classifyVersionBump('meal_taxonomy_1.0.0', 'meal_taxonomy_1.0.0')).toBeNull();
  });

  it('returns null for downgrade', () => {
    expect(classifyVersionBump('meal_taxonomy_2.0.0', 'meal_taxonomy_1.0.0')).toBeNull();
  });
});

// ── riskLevelForBump ──────────────────────────────────────────────────────────

describe('riskLevelForBump', () => {
  it('major bump → high risk', () => {
    expect(riskLevelForBump('major')).toBe('high');
  });

  it('minor bump → medium risk', () => {
    expect(riskLevelForBump('minor')).toBe('medium');
  });

  it('patch bump → low risk', () => {
    expect(riskLevelForBump('patch')).toBe('low');
  });
});
