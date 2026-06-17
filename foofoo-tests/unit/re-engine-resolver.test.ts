import {
  resolveEngineVersion,
  createEngine,
  SUPPORTED_ENGINE_VERSIONS,
} from '../../foofoo/src/re-engine/resolver/engineResolver';

// ── resolveEngineVersion ──────────────────────────────────────────────────────

describe('resolveEngineVersion', () => {
  it('returns classfirst_v1 for a known supported version', () => {
    expect(resolveEngineVersion('classfirst_v1')).toBe('classfirst_v1');
  });

  it('defaults to classfirst_v1 when version is null', () => {
    expect(resolveEngineVersion(null)).toBe('classfirst_v1');
  });

  it('defaults to classfirst_v1 when version is undefined', () => {
    expect(resolveEngineVersion(undefined)).toBe('classfirst_v1');
  });

  it('defaults to classfirst_v1 for an unknown future version string', () => {
    expect(resolveEngineVersion('classfirst_v2')).toBe('classfirst_v1');
    expect(resolveEngineVersion('ml_ranking_v1')).toBe('classfirst_v1');
  });

  it('defaults to classfirst_v1 for an empty string', () => {
    expect(resolveEngineVersion('')).toBe('classfirst_v1');
  });

  it('every string in SUPPORTED_ENGINE_VERSIONS resolves to itself', () => {
    for (const v of SUPPORTED_ENGINE_VERSIONS) {
      expect(resolveEngineVersion(v)).toBe(v);
    }
  });
});

// ── createEngine ──────────────────────────────────────────────────────────────

describe('createEngine', () => {
  it('returns an engine with engineVersion matching the requested version', () => {
    const engine = createEngine('classfirst_v1');
    expect(engine.engineVersion).toBe('classfirst_v1');
  });

  it('returned engine exposes the required interface methods', () => {
    const engine = createEngine('classfirst_v1');
    expect(typeof engine.generateWeeklyPlan).toBe('function');
    expect(typeof engine.getTodayView).toBe('function');
    expect(typeof engine.recordFeedback).toBe('function');
  });
});
