import 'reflect-metadata';
import { OpenHoursType } from '../../common/dto/open-hours.dto';
import { OpenHours } from '../../common/types/open-hours.type';
import { isWithinOpenHours } from './is-within-open-hours.util';

const TIMEZONE = 'Asia/Singapore';

const monFriNineToSix: OpenHours = {
  type: OpenHoursType.RECURRING,
  days: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
};

const alwaysOpen: OpenHours = {
  type: OpenHoursType.ALWAYS_OPEN,
};

function instant(iso: string): Date {
  return new Date(iso);
}

describe('isWithinOpenHours', () => {
  describe('RECURRING Mon–Fri 09:00–18:00', () => {
    it('accepts Tuesday 10:00–11:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-06-30T10:00:00+08:00'),
          instant('2026-06-30T11:00:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(true);
    });

    it('rejects Saturday 10:00–11:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-07-04T10:00:00+08:00'),
          instant('2026-07-04T11:00:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(false);
    });

    it('rejects Tuesday start before 09:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-06-30T08:00:00+08:00'),
          instant('2026-06-30T09:00:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(false);
    });

    it('rejects Tuesday end after 18:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-06-30T17:00:00+08:00'),
          instant('2026-06-30T18:30:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(false);
    });

    it('accepts inclusive start at 09:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-06-30T09:00:00+08:00'),
          instant('2026-06-30T10:00:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(true);
    });

    it('accepts inclusive end at 18:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-06-30T17:00:00+08:00'),
          instant('2026-06-30T18:00:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(true);
    });

    it('rejects booking starting at 18:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-06-30T18:00:00+08:00'),
          instant('2026-06-30T19:00:00+08:00'),
          monFriNineToSix,
          TIMEZONE,
        ),
      ).toBe(false);
    });
  });

  describe('ALWAYS_OPEN', () => {
    it('accepts Saturday 02:00–03:00', () => {
      expect(
        isWithinOpenHours(
          instant('2026-07-04T02:00:00+08:00'),
          instant('2026-07-04T03:00:00+08:00'),
          alwaysOpen,
          TIMEZONE,
        ),
      ).toBe(true);
    });
  });
});
