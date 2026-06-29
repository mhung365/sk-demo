import 'reflect-metadata';
import {
  InvalidOpenHoursLabelError,
  parseOpenHoursLabel,
} from './parse-open-hours-label.util';

describe('parseOpenHoursLabel', () => {
  it.each([
    ['Mon–Fri 9AM–6PM', [1, 2, 3, 4, 5], '09:00', '18:00'],
    ['Mon-Fri 9AM-6PM', [1, 2, 3, 4, 5], '09:00', '18:00'],
    ['mon–fri 9am–6pm', [1, 2, 3, 4, 5], '09:00', '18:00'],
    ['Mon–Sat 9AM–6PM', [1, 2, 3, 4, 5, 6], '09:00', '18:00'],
    ['Mon–Sun 9AM–6PM', [1, 2, 3, 4, 5, 6, 7], '09:00', '18:00'],
  ] as const)(
    'parses recurring label "%s"',
    (label, days, startTime, endTime) => {
      const result = parseOpenHoursLabel(label);
      expect(result).toEqual({
        type: 'RECURRING',
        days: [...days],
        startTime,
        endTime,
        label,
      });
    },
  );

  it('parses 24h clock times', () => {
    const result = parseOpenHoursLabel('Mon–Fri 09:00–18:00');
    expect(result).toMatchObject({
      type: 'RECURRING',
      days: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '18:00',
    });
  });

  it('parses Always open (case-insensitive)', () => {
    expect(parseOpenHoursLabel('Always open')).toEqual({
      type: 'ALWAYS_OPEN',
    });
    expect(parseOpenHoursLabel('ALWAYS OPEN')).toEqual({
      type: 'ALWAYS_OPEN',
    });
  });

  it('throws for unrecognized labels', () => {
    expect(() => parseOpenHoursLabel('Open sometimes maybe')).toThrow(
      InvalidOpenHoursLabelError,
    );
  });
});
