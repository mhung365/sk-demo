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

/**
 * Stub DTO matching AD-4 structured open_hours schema.
 * Full human-label parser deferred to Story 1.6.
 */
export class OpenHoursDto {
  @IsEnum(OpenHoursType)
  type!: OpenHoursType;

  @ValidateIf((o: OpenHoursDto) => o.type === OpenHoursType.RECURRING)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @Type(() => Number)
  days?: number[];

  @ValidateIf((o: OpenHoursDto) => o.type === OpenHoursType.RECURRING)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @ValidateIf((o: OpenHoursDto) => o.type === OpenHoursType.RECURRING)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
