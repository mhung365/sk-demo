import { IsOptional, IsUUID } from 'class-validator';

export class ListLocationsQueryDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
