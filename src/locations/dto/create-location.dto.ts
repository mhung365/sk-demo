import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OpenHoursDto } from '../../common/dto/open-hours.dto';
import { Department } from '../../common/enums/department.enum';

export class CreateLocationDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  locationNumber!: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => OpenHoursDto)
  openHours?: OpenHoursDto;
}
