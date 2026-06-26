import { OpenHoursType } from '../dto/open-hours.dto';

export type AlwaysOpenHours = {
  type: OpenHoursType.ALWAYS_OPEN;
};

export type RecurringOpenHours = {
  type: OpenHoursType.RECURRING;
  days: number[];
  startTime: string;
  endTime: string;
  label?: string;
};

export type OpenHours = AlwaysOpenHours | RecurringOpenHours;
