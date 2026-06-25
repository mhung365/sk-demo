import { IsNotEmpty, IsString } from 'class-validator';

export class ValidationProbeDto {
  @IsString()
  @IsNotEmpty()
  requiredField!: string;
}
