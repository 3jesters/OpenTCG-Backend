import { IsEnum, IsString, Matches } from 'class-validator';
import { EnergyType } from '../../domain/enums/energy-type.enum';

/**
 * Weakness Import DTO
 * For validating weakness data from JSON import
 */
export class WeaknessImportDto {
  @IsEnum(EnergyType)
  type: EnergyType;

  @IsString()
  @Matches(/^[×+]\d+$/, {
    message: 'Weakness modifier must be in format ×2, +20, etc.',
  })
  modifier: string;
}
