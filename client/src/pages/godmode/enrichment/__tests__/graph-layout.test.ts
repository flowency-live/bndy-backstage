import { describe, expect, it } from 'vitest';
import { positionNeighborhood } from '../graph-layout';

describe('positionNeighborhood', () => {
  it('keeps the selected intelligence node in the centre', () => {
    const result = positionNeighborhood([
      { ref: 'source:klma', kind: 'source', label: 'KLMA' },
      { ref: 'obs:1', kind: 'observation', label: 'Observation' },
    ], 'source:klma', 1000, 600);
    expect(result[0]).toMatchObject({ ref: 'source:klma', x: 500, y: 300 });
    expect(result[1].ref).toBe('obs:1');
    expect(result[1].y).not.toBe(300);
  });

  it('returns an empty graph for an empty response', () => {
    expect(positionNeighborhood([], 'source:missing')).toEqual([]);
  });
});
