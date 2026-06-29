import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OpenHoursDto } from '../../common/dto/open-hours.dto';
import { Department } from '../../common/enums/department.enum';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => OpenHoursDto)
  openHours?: OpenHoursDto | null;
}
