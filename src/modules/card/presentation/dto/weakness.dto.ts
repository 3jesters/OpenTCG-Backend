import { ApiProperty } from '@nestjs/swagger';
import { EnergyType } from '../../domain/enums';

/**
 * Weakness DTO
 * Represents a Pokémon's weakness in API responses
 */
export class WeaknessDto {
  @ApiProperty({
    description: 'Type that this Pokémon is weak to',
    enum: EnergyType,
    example: EnergyType.PSYCHIC,
  })
  type: EnergyType;

  @ApiProperty({
    description: 'Damage modifier (e.g., "×2", "+20")',
    example: '×2',
  })
  modifier: string;
}
