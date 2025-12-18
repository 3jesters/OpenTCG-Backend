import { ApiProperty } from '@nestjs/swagger';
import { EnergyType } from '../../domain/enums';
import { AttackEffectDto } from './attack-effect.dto';

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
    example: 'Flip a coin. If heads, the Defending Pokémon is now Confused.',
  })
  text: string;

  @ApiProperty({
    description: 'Structured attack effects',
    type: [AttackEffectDto],
    required: false,
  })
  effects?: AttackEffectDto[];

  @ApiProperty({
    description:
      'Maximum number of extra energy that can contribute to bonus damage (for "+" damage attacks)',
    required: false,
    example: 2,
  })
  energyBonusCap?: number;
}
