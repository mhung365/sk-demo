import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Department } from '../../common/enums/department.enum';

@ValidatorConstraint({ name: 'isEndAfterStart', async: false })
export class IsEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateBookingDto;
    if (!dto.startAt || !dto.endAt) {
      return true;
    }
    return new Date(dto.endAt) > new Date(dto.startAt);
  }

  defaultMessage(): string {
    return 'endAt must be after startAt';
  }
}

export class CreateBookingDto {
  @IsUUID()
  locationId!: string;

  @IsEnum(Department)
  department!: Department;

  @IsInt()
  @Min(1)
  attendeeCount!: number;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  @Validate(IsEndAfterStartConstraint)
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bookedBy?: string;
}
