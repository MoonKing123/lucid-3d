import { describe, it, expect } from 'vitest';
import { generateReport, parseRegressionResults } from '../../../scripts/regression-full';

describe('regression KR3 — full demo loop', () => {
  describe('parseRegressionResults', () => {
    it('parses screenshot JSON output to status map', () => {
      const stdout = JSON.stringify({
        'runner-3d': { status: 'pass' },
        'br-12p': { status: 'pass' },
        'action-rpg': { status: 'broken', error: 'Vite build failed' },
      });
      const results = parseRegressionResults(stdout);
      expect(results['runner-3d'].status).toBe('pass');
      expect(results['action-rpg'].status).toBe('broken');
      expect(results['action-rpg'].error).toContain('Vite');
    });
  });

  describe('generateReport', () => {
    it('produces markdown table with all 6 examples', () => {
      const md = generateReport({
        results: {
          'runner-3d': { status: 'pass' },
          'action-rpg': { status: 'pass' },
          'action-rpg-v2': { status: 'pass' },
          'br-12p': { status: 'pass' },
          'slg-3d': { status: 'pass' },
          'tower-defense-3d': { status: 'pass' },
        },
        brokenIssues: [],
      });
      expect(md.match(/✅ pass/g)?.length).toBe(6);
      expect(md).toContain('runner-3d');
      expect(md).toContain('br-12p');
    });

    it('includes broken issue links in report', () => {
      const md = generateReport({
        results: { 'action-rpg': { status: 'broken', error: 'foo' } },
        brokenIssues: [{ demo: 'action-rpg', issue: 999 }],
      });
      expect(md).toContain('#999');
    });
  });
});
