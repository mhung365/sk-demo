import { OpenHoursType } from '../dto/open-hours.dto';
import { OpenHours } from '../types/open-hours.type';

const DAY_ABBREVS: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export class InvalidOpenHoursLabelError extends Error {
  constructor(readonly label: string) {
    super(`Unrecognized open hours label: ${label}`);
    this.name = 'InvalidOpenHoursLabelError';
  }
}

function parseDayAbbrev(day: string): number {
  const key = day.trim().slice(0, 3).toLowerCase();
  const value = DAY_ABBREVS[key];
  if (value === undefined) {
    throw new InvalidOpenHoursLabelError(day);
  }
  return value;
}

function expandDayRange(startDay: string, endDay: string): number[] {
  const start = parseDayAbbrev(startDay);
  const end = parseDayAbbrev(endDay);
  if (start > end) {
    throw new InvalidOpenHoursLabelError(`${startDay}–${endDay}`);
  }
  const days: number[] = [];
  for (let day = start; day <= end; day++) {
    days.push(day);
  }
  return days;
}

function parseTime(timeStr: string): string {
  const normalized = timeStr.trim().toUpperCase().replace(/\s+/g, '');

  const clockMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (clockMatch) {
    const hours = parseInt(clockMatch[1], 10);
    const minutes = clockMatch[2];
    if (hours > 23) {
      throw new InvalidOpenHoursLabelError(timeStr);
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  const amPmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2] ?? '00';
    const period = amPmMatch[3];
    if (hours < 1 || hours > 12) {
      throw new InvalidOpenHoursLabelError(timeStr);
    }
    if (period === 'AM') {
      if (hours === 12) {
        hours = 0;
      }
    } else if (hours !== 12) {
      hours += 12;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  throw new InvalidOpenHoursLabelError(timeStr);
}

const RECURRING_LABEL_PATTERN =
  /^([A-Za-z]{3,})\s*[–-]\s*([A-Za-z]{3,})\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)|\d{2}:\d{2})\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)|\d{2}:\d{2})$/i;

export function parseOpenHoursLabel(label: string): OpenHours {
  const trimmed = label.trim();

  if (/^always\s+open$/i.test(trimmed)) {
    return { type: OpenHoursType.ALWAYS_OPEN };
  }

  const match = trimmed.match(RECURRING_LABEL_PATTERN);
  if (!match) {
    throw new InvalidOpenHoursLabelError(label);
  }

  const [, startDay, endDay, startTimeRaw, endTimeRaw] = match;

  return {
    type: OpenHoursType.RECURRING,
    days: expandDayRange(startDay, endDay),
    startTime: parseTime(startTimeRaw),
    endTime: parseTime(endTimeRaw),
    label: trimmed,
  };
}
