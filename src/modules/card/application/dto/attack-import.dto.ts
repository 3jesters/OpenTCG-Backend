import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnergyType } from '../../domain/enums/energy-type.enum';
import { AttackPreconditionImportDto } from './attack-precondition-import.dto';
import { AttackEffectImportDto } from './attack-effect-import.dto';

/**
 * Attack Import DTO
 * For validating attack data from JSON import
 */
export class AttackImportDto {
  @IsString()
  name: string;

  @IsArray()
  @IsEnum(EnergyType, { each: true })
  energyCost: EnergyType[];

  @IsString()
  damage: string;

  @IsString()
  text: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackPreconditionImportDto)
  preconditions?: AttackPreconditionImportDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackEffectImportDto)
  effects?: AttackEffectImportDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  energyBonusCap?: number; // Maximum number of extra energy that can contribute to bonus damage (for "+" damage attacks)
}
