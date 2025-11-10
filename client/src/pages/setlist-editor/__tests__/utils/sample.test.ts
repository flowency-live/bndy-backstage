import { describe, it, expect } from 'vitest';

describe('Sample Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify test infrastructure is working', () => {
    const result = 'test'.toUpperCase();
    expect(result).toBe('TEST');
  });
});
