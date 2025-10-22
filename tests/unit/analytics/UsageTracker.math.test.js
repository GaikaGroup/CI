import { describe, it, expect, beforeEach } from 'vitest';
import { UsageTracker } from '$lib/modules/analytics/UsageTracker';

describe('UsageTracker - Math Metrics', () => {
  let tracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  it('should record math query with classification', () => {
    const classification = {
      isMath: true,
      category: 'algebra',
      confidence: 0.95
    };

    const tokens = {
      total: 2500,
      prompt: 500,
      completion: 2000
    };

    const cost = 0.05;

    tracker.recordMathQuery(classification, tokens, cost);

    const summary = tracker.getMathSummary();
    expect(summary.totalMathQueries).toBe(1);
    expect(summary.totalTokens).toBe(2500);
    expect(summary.totalCost).toBe(0.05);
    expect(summary.categories).toHaveLength(1);
    expect(summary.categories[0].category).toBe('algebra');
    expect(summary.categories[0].count).toBe(1);
  });

  it('should track multiple categories', () => {
    tracker.recordMathQuery(
      { isMath: true, category: 'algebra', confidence: 0.9 },
      { total: 2000 },
      0.04
    );

    tracker.recordMathQuery(
      { isMath: true, category: 'calculus', confidence: 0.85 },
      { total: 3000 },
      0.06
    );

    tracker.recordMathQuery(
      { isMath: true, category: 'algebra', confidence: 0.92 },
      { total: 2500 },
      0.05
    );

    const summary = tracker.getMathSummary();
    expect(summary.totalMathQueries).toBe(3);
    expect(summary.totalTokens).toBe(7500);
    expect(summary.categories).toHaveLength(2);

    const algebraCategory = summary.categories.find((c) => c.category === 'algebra');
    expect(algebraCategory.count).toBe(2);
    expect(algebraCategory.totalTokens).toBe(4500);
    expect(algebraCategory.avgTokens).toBe(2250);

    const calculusCategory = summary.categories.find((c) => c.category === 'calculus');
    expect(calculusCategory.count).toBe(1);
    expect(calculusCategory.totalTokens).toBe(3000);
  });

  it('should calculate average confidence per category', () => {
    tracker.recordMathQuery(
      { isMath: true, category: 'geometry', confidence: 0.8 },
      { total: 2000 },
      0.04
    );

    tracker.recordMathQuery(
      { isMath: true, category: 'geometry', confidence: 0.9 },
      { total: 2000 },
      0.04
    );

    const summary = tracker.getMathSummary();
    const geometryCategory = summary.categories.find((c) => c.category === 'geometry');
    expect(geometryCategory.avgConfidence).toBe(0.85);
  });

  it('should store recent classifications for analysis', () => {
    for (let i = 0; i < 15; i++) {
      tracker.recordMathQuery(
        { isMath: true, category: 'algebra', confidence: 0.9 },
        { total: 2000 },
        0.04
      );
    }

    const summary = tracker.getMathSummary();
    expect(summary.recentClassifications).toHaveLength(10);
    expect(summary.recentClassifications[0]).toHaveProperty('category');
    expect(summary.recentClassifications[0]).toHaveProperty('confidence');
    expect(summary.recentClassifications[0]).toHaveProperty('timestamp');
  });

  it('should not record non-math queries', () => {
    const classification = {
      isMath: false,
      category: null,
      confidence: 0.3
    };

    tracker.recordMathQuery(classification, { total: 1000 }, 0.02);

    const summary = tracker.getMathSummary();
    expect(summary.totalMathQueries).toBe(0);
    expect(summary.totalTokens).toBe(0);
  });

  it('should calculate average tokens and cost', () => {
    tracker.recordMathQuery(
      { isMath: true, category: 'algebra', confidence: 0.9 },
      { total: 2000 },
      0.04
    );

    tracker.recordMathQuery(
      { isMath: true, category: 'calculus', confidence: 0.85 },
      { total: 4000 },
      0.08
    );

    const summary = tracker.getMathSummary();
    expect(summary.avgTokens).toBe(3000);
    expect(summary.avgCost).toBe(0.06);
  });

  it('should handle missing token data gracefully', () => {
    tracker.recordMathQuery({ isMath: true, category: 'algebra', confidence: 0.9 }, {}, 0.04);

    const summary = tracker.getMathSummary();
    expect(summary.totalMathQueries).toBe(1);
    expect(summary.totalTokens).toBe(0);
  });

  it('should reset math metrics', () => {
    tracker.recordMathQuery(
      { isMath: true, category: 'algebra', confidence: 0.9 },
      { total: 2000 },
      0.04
    );

    tracker.reset();

    const summary = tracker.getMathSummary();
    expect(summary.totalMathQueries).toBe(0);
    expect(summary.totalTokens).toBe(0);
    expect(summary.categories).toHaveLength(0);
    expect(summary.recentClassifications).toHaveLength(0);
  });
});
