import { intervalsOverlap } from './has-booking-overlap.util';

function instant(iso: string): Date {
  return new Date(iso);
}

describe('intervalsOverlap', () => {
  const existingStart = instant('2026-06-30T10:00:00+08:00');
  const existingEnd = instant('2026-06-30T11:00:00+08:00');

  it('returns true for partial overlap', () => {
    expect(
      intervalsOverlap(
        existingStart,
        existingEnd,
        instant('2026-06-30T10:30:00+08:00'),
        instant('2026-06-30T11:30:00+08:00'),
      ),
    ).toBe(true);
  });

  it('returns false for adjacent half-open windows (end === start)', () => {
    expect(
      intervalsOverlap(
        existingStart,
        existingEnd,
        instant('2026-06-30T11:00:00+08:00'),
        instant('2026-06-30T12:00:00+08:00'),
      ),
    ).toBe(false);
  });

  it('returns true for identical windows', () => {
    expect(
      intervalsOverlap(existingStart, existingEnd, existingStart, existingEnd),
    ).toBe(true);
  });

  it('returns false for non-overlapping separate windows', () => {
    expect(
      intervalsOverlap(
        existingStart,
        existingEnd,
        instant('2026-06-30T14:00:00+08:00'),
        instant('2026-06-30T15:00:00+08:00'),
      ),
    ).toBe(false);
  });

  it('returns true when new window is contained within existing', () => {
    expect(
      intervalsOverlap(
        instant('2026-06-30T10:00:00+08:00'),
        instant('2026-06-30T12:00:00+08:00'),
        instant('2026-06-30T10:30:00+08:00'),
        instant('2026-06-30T11:00:00+08:00'),
      ),
    ).toBe(true);
  });
});
