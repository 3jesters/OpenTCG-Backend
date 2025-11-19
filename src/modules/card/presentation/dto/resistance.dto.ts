import { ApiProperty } from '@nestjs/swagger';
import { EnergyType } from '../../domain/enums';

/**
 * Resistance DTO
 * Represents a Pokémon's resistance in API responses
 */
export class ResistanceDto {
  @ApiProperty({
    description: 'Type that this Pokémon resists',
    enum: EnergyType,
    example: EnergyType.FIGHTING,
  })
  type: EnergyType;

  @ApiProperty({
    description: 'Damage reduction (e.g., "-20", "-30")',
    example: '-20',
  })
  modifier: string;
}

