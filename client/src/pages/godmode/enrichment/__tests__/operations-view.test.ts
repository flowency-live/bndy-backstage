import { describe, expect, it } from 'vitest';
import { describeCandidate, freshnessTone, summariseWouldWrites } from '../operations-view';
import type { BacklineProjectionItem } from '@/lib/services/backline-service';

function item(overrides: Partial<BacklineProjectionItem> = {}): BacklineProjectionItem {
  return {
    idempotencyKey: 'k',
    sourceId: 'lemonrock-gig-hydration',
    observationId: 'obs-1',
    candidateKey: 'event:lemonrock-gig-hydration:lemonrock:gig:1',
    action: 'create',
    status: 'shadow',
    wouldWrite: 'create',
    reason: 'source is in shadow mode',
    completedAt: '2026-09-04T11:17:33.651Z',
    candidate: {
      sourceEventKey: 'lemonrock:gig:1',
      artistName: 'Basher Tate',
      venueName: 'Cowick Street Railway Club',
      venueLocation: 'Exeter',
      date: '2027-05-01',
      startTime: '20:30',
      observedAt: '2026-09-04T11:17:00Z',
      supportingClaims: 156,
    },
    ...overrides,
  };
}

describe('freshnessTone', () => {
  it('maps every freshness verdict to an accessible tone and label', () => {
    expect(freshnessTone('healthy')).toEqual({ label: 'FRESH', className: expect.stringContaining('emerald') });
    expect(freshnessTone('stale')).toEqual({ label: 'STALE', className: expect.stringContaining('red') });
    expect(freshnessTone('missing')).toEqual({ label: 'NEVER RAN', className: expect.stringContaining('amber') });
    expect(freshnessTone('invalid')).toEqual({ label: 'INVALID', className: expect.stringContaining('red') });
    expect(freshnessTone('disabled')).toEqual({ label: 'OFF', className: expect.stringContaining('muted') });
  });
});

describe('summariseWouldWrites', () => {
  it('counts decisions by action, status and source', () => {
    const summary = summariseWouldWrites([
      item(),
      item({ idempotencyKey: 'k2', sourceId: 'lemonrock-new-gigs', wouldWrite: 'update', action: 'update' }),
      item({ idempotencyKey: 'k3', status: 'failed', wouldWrite: null, candidate: null, error: 'boom' }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.byAction).toEqual({ create: 2, update: 1 });
    expect(summary.byStatus).toEqual({ shadow: 2, failed: 1 });
    expect(summary.sources).toBe(2);
  });

  it('returns zeros for an empty list', () => {
    expect(summariseWouldWrites([])).toEqual({ total: 0, byAction: {}, byStatus: {}, sources: 0 });
  });
});

describe('describeCandidate', () => {
  it('renders artist, venue, town and a UK date', () => {
    expect(describeCandidate(item().candidate)).toBe('Basher Tate at Cowick Street Railway Club, Exeter on 01/05/2027 20:30');
  });

  it('degrades when the candidate is absent', () => {
    expect(describeCandidate(null)).toBe('No candidate materialised');
  });
});
