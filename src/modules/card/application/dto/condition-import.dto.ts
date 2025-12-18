import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ConditionType } from '../../domain/enums/condition-type.enum';

/**
 * Condition Import DTO
 * For validating condition data from JSON import
 */
export class ConditionImportDto {
  @IsEnum(ConditionType)
  type: ConditionType;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsNumber()
  numericValue?: number;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialConditions?: string[];

  @IsOptional()
  @IsString()
  targetType?: string;
}
