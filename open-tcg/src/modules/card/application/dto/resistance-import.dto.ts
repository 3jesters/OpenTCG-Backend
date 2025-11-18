import { IsEnum, IsString, Matches } from 'class-validator';
import { EnergyType } from '../../domain/enums/energy-type.enum';

/**
 * Resistance Import DTO
 * For validating resistance data from JSON import
 */
export class ResistanceImportDto {
  @IsEnum(EnergyType)
  type: EnergyType;

  @IsString()
  @Matches(/^-\d+$/, {
    message: 'Resistance modifier must be in format -20, -30, etc.',
  })
  modifier: string;
}

