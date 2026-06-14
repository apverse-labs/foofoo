/** re-reason-tags.test.ts — pure why-this + confidence copy (UI-BUILD-04/05). */
import {
  reasonCopy, buildReasonText, confidenceLabel, confidenceCopy,
} from '../../foofoo/src/utils/re-reason-tags';

describe('reasonCopy / buildReasonText', () => {
  it('maps each signal to short copy', () => {
    expect(reasonCopy('home_state')).toMatch(/home/i);
    expect(reasonCopy('weekend')).toMatch(/weekend/i);
  });
  it('falls back to chef pick for none/unknown', () => {
    expect(reasonCopy('none')).toMatch(/chef/i);
  });
  it('composes headline + one supporting, deduped, max 2', () => {
    const t = buildReasonText('home_state', ['history', 'weekday']);
    expect(t.split(' · ')).toHaveLength(2);
  });
  it('dedupes identical signals', () => {
    expect(buildReasonText('history', ['history'])).toBe(reasonCopy('history'));
  });
});

describe('confidence copy', () => {
  it('thresholds map to honest labels', () => {
    expect(confidenceLabel(0.9)).toBe('high');
    expect(confidenceLabel(0.7)).toBe('medium');
    expect(confidenceLabel(0.4)).toBe('learning');
  });
  it('never exposes a raw number', () => {
    expect(confidenceCopy(0.9)).not.toMatch(/\d/);
    expect(confidenceCopy(0.4)).toMatch(/sharpen/i);
  });
});
