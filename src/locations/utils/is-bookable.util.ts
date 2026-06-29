import { Department } from '../../common/enums/department.enum';
import { OpenHours } from '../../common/types/open-hours.type';

export function isBookable(location: {
  department: Department | null;
  capacity: number | null;
  openHours: OpenHours | null;
}): boolean {
  return (
    location.department !== null &&
    location.capacity !== null &&
    location.openHours !== null
  );
}
