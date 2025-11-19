import { ApiProperty } from '@nestjs/swagger';
import { EnergyType } from '../../domain/enums';

/**
 * Attack DTO
 * Represents a Pokémon attack in API responses
 */
export class AttackDto {
  @ApiProperty({
    description: 'Attack name',
    example: 'Confuse Ray',
  })
  name: string;

  @ApiProperty({
    description: 'Energy cost for the attack',
    type: [String],
    enum: EnergyType,
    example: [EnergyType.PSYCHIC, EnergyType.PSYCHIC, EnergyType.PSYCHIC],
  })
  energyCost: EnergyType[];

  @ApiProperty({
    description: 'Base damage (can include modifiers like + or ×)',
    example: '30',
  })
  damage: string;

  @ApiProperty({
    description: 'Human-readable attack effect text',
    example:
      'Flip a coin. If heads, the Defending Pokémon is now Confused.',
  })
  text: string;
}

