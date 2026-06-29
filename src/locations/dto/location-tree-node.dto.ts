import { Location } from '../entities/location.entity';
import { LocationResponseDto } from './location-response.dto';

export class LocationTreeNodeDto {
  id!: string;
  parentId!: string | null;
  name!: string;
  locationNumber!: string;
  department!: LocationResponseDto['department'];
  capacity!: number | null;
  openHours!: LocationResponseDto['openHours'];
  isBookable!: boolean;
  createdAt!: string;
  updatedAt!: string;
  children!: LocationTreeNodeDto[];

  static fromEntity(location: Location): LocationTreeNodeDto {
    const flat = LocationResponseDto.fromEntity(location);
    const node = new LocationTreeNodeDto();
    Object.assign(node, flat);
    node.children = [];
    return node;
  }
}
