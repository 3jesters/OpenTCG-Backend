import { IsEnum, IsNumber, IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PreconditionType } from '../../domain/enums/precondition-type.enum';
import { ConditionImportDto } from './condition-import.dto';

/**
 * Attack Precondition Import DTO
 * For validating attack precondition data from JSON import
 */
export class AttackPreconditionImportDto {
  @IsEnum(PreconditionType)
  type: PreconditionType;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  energyTypes?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionImportDto)
  conditions?: ConditionImportDto[];
}

