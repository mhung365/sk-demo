import { Department } from '../../common/enums/department.enum';
import { OpenHours } from '../../common/types/open-hours.type';
import { Location } from '../entities/location.entity';
import { isBookable } from '../utils/is-bookable.util';

export class LocationResponseDto {
  id!: string;
  parentId!: string | null;
  name!: string;
  locationNumber!: string;
  department!: Department | null;
  capacity!: number | null;
  openHours!: OpenHours | null;
  isBookable!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static fromEntity(location: Location): LocationResponseDto {
    const dto = new LocationResponseDto();
    dto.id = location.id;
    dto.parentId = location.parentId;
    dto.name = location.name;
    dto.locationNumber = location.locationNumber;
    dto.department = location.department;
    dto.capacity = location.capacity;
    dto.openHours = location.openHours;
    dto.isBookable = isBookable(location);
    dto.createdAt = location.createdAt.toISOString();
    dto.updatedAt = location.updatedAt.toISOString();
    return dto;
  }
}
