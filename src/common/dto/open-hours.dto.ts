import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum OpenHoursType {
  ALWAYS_OPEN = 'ALWAYS_OPEN',
  RECURRING = 'RECURRING',
}

/** Structured open_hours schema (AD-4). Label-only input is parsed in LocationsService.update(). */
export class OpenHoursDto {
  @ValidateIf((o: OpenHoursDto) => !o.label)
  @IsEnum(OpenHoursType)
  type!: OpenHoursType;

  @ValidateIf(
    (o: OpenHoursDto) => !o.label && o.type === OpenHoursType.RECURRING,
  )
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @Type(() => Number)
  days?: number[];

  @ValidateIf(
    (o: OpenHoursDto) => !o.label && o.type === OpenHoursType.RECURRING,
  )
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @ValidateIf(
    (o: OpenHoursDto) => !o.label && o.type === OpenHoursType.RECURRING,
  )
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
