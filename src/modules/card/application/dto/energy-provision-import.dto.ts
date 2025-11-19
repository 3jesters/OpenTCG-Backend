import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EnergyType } from '../../domain/enums/energy-type.enum';

/**
 * Energy Provision Import DTO
 * For validating energy provision data from JSON import
 */
export class EnergyProvisionImportDto {
  @IsArray()
  @IsEnum(EnergyType, { each: true })
  energyTypes: EnergyType[];

  @IsNumber()
  @Min(1)
  amount: number;

  @IsBoolean()
  isSpecial: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictions?: string[];

  @IsOptional()
  @IsString()
  additionalEffects?: string;
}

