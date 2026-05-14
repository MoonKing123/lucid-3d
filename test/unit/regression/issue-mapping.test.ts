import { describe, it, expect } from 'vitest';
import { ISSUE_MAPPING, getMappingForIssue, getAllIssueNumbers } from '../../../scripts/regression-mapping';

describe('regression KR4 — issue mapping table', () => {
  it('maps all 25 phase 50-57 issues', () => {
    expect(getAllIssueNumbers()).toEqual([
      366, 367, 368,            // Phase 50
      372, 373, 374,            // Phase 51
      378, 379, 380,            // Phase 52
      384, 385, 386,            // Phase 53
      390, 391, 392,            // Phase 54
      396, 397, 398,            // Phase 55
      402, 403, 404, 405, 406,  // Phase 56
      412, 413, 414, 415,       // Phase 57
    ]);
  });

  it('every mapping entry has phase, kr, demo, issue', () => {
    for (const issue of getAllIssueNumbers()) {
      const m = getMappingForIssue(issue);
      expect(m).toBeDefined();
      expect(m!.phase).toBeGreaterThanOrEqual(50);
      expect(m!.phase).toBeLessThanOrEqual(57);
      expect(m!.kr).toBeTruthy();
      expect(m!.demo).toMatch(/^(runner-3d|action-rpg|action-rpg-v2|br-12p|slg-3d|tower-defense-3d)$/);
    }
  });

  it('phase 50-52 use br-12p or slg-3d (post-fx most visible)', () => {
    for (const issue of [366, 367, 368]) {
      expect(getMappingForIssue(issue)!.demo).toBe('br-12p');
    }
    for (const issue of [378, 379, 380]) {
      expect(getMappingForIssue(issue)!.demo).toBe('slg-3d');
    }
  });

  it('phase 53-56 use action-rpg-v2 (animation demos)', () => {
    for (const issue of [384, 385, 386, 390, 391, 392, 396, 397, 398, 402, 403, 404, 405, 406]) {
      expect(getMappingForIssue(issue)!.demo).toBe('action-rpg-v2');
    }
  });

  it('phase 57 uses br-12p (network demo)', () => {
    for (const issue of [412, 413, 414, 415]) {
      expect(getMappingForIssue(issue)!.demo).toBe('br-12p');
    }
  });
});
