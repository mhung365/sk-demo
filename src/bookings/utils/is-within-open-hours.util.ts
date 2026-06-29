import { DateTime } from 'luxon';
import { OpenHoursType } from '../../common/dto/open-hours.dto';
import { OpenHours } from '../../common/types/open-hours.type';

function isEndpointWithinRecurring(
  instant: Date,
  openHours: { days: number[]; startTime: string; endTime: string },
  timezone: string,
): boolean {
  const local = DateTime.fromJSDate(instant, { zone: 'utc' }).setZone(timezone);
  if (!openHours.days.includes(local.weekday)) {
    return false;
  }
  const hhmm = local.toFormat('HH:mm');
  return hhmm >= openHours.startTime && hhmm <= openHours.endTime;
}

export function isWithinOpenHours(
  startAt: Date,
  endAt: Date,
  openHours: OpenHours,
  timezone: string,
): boolean {
  if (openHours.type === OpenHoursType.ALWAYS_OPEN) {
    return true;
  }
  return (
    isEndpointWithinRecurring(startAt, openHours, timezone) &&
    isEndpointWithinRecurring(endAt, openHours, timezone)
  );
}
