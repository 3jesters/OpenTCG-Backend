import { ApiProperty } from '@nestjs/swagger';
import { CardStrengthResult } from '../../domain/services/card-strength-calculator.service';

/**
 * Card Strength Response DTO
 * Response for card strength calculation endpoint
 */
export class CardStrengthResponseDto implements CardStrengthResult {
  @ApiProperty({
    description: 'Total strength score (0-100)',
    example: 75.5,
    minimum: 0,
    maximum: 100,
  })
  totalStrength: number;

  @ApiProperty({
    description: 'Balance category',
    enum: ['very_weak', 'weak', 'balanced', 'strong', 'too_strong'],
    example: 'strong',
  })
  balanceCategory: 'very_weak' | 'weak' | 'balanced' | 'strong' | 'too_strong';

  @ApiProperty({
    description: 'Strength breakdown by component',
    type: 'object',
    properties: {
      hpStrength: {
        type: 'number',
        description: 'HP strength component (0-100)',
        example: 45.2,
      },
      attackStrength: {
        type: 'number',
        description: 'Attack strength component (0-100)',
        example: 60.5,
      },
      abilityStrength: {
        type: 'number',
        description: 'Ability strength component (0-100)',
        example: 80.0,
      },
    },
  })
  breakdown: {
    hpStrength: number;
    attackStrength: number;
    abilityStrength: number;
  };

  @ApiProperty({
    description: 'Penalties applied to the card',
    type: 'object',
    properties: {
      sustainability: {
        type: 'number',
        description: 'Sustainability penalty (self-damage)',
        example: 10.0,
      },
      evolutionDependency: {
        type: 'number',
        description: 'Evolution dependency penalty',
        example: 5.0,
      },
      prizeLiability: {
        type: 'number',
        description: 'Prize liability penalty (low HP)',
        example: 2.0,
      },
      evolution: {
        type: 'number',
        description: 'Evolution stage penalty',
        example: 8.0,
      },
    },
  })
  penalties: {
    sustainability: number;
    evolutionDependency: number;
    prizeLiability: number;
    evolution: number;
  };

  @ApiProperty({
    description: 'Bonuses applied to the card',
    type: 'object',
    properties: {
      retreatCost: {
        type: 'number',
        description: 'Retreat cost bonus/penalty',
        example: 5.0,
      },
      basicPokemon: {
        type: 'number',
        description: 'Basic Pokémon format bonus',
        example: 5.0,
      },
    },
  })
  bonuses: {
    retreatCost: number;
    basicPokemon: number;
  };

  /**
   * Create DTO from domain result
   */
  static fromDomain(result: CardStrengthResult): CardStrengthResponseDto {
    const dto = new CardStrengthResponseDto();
    dto.totalStrength = result.totalStrength;
    dto.balanceCategory = result.balanceCategory;
    dto.breakdown = { ...result.breakdown };
    dto.penalties = { ...result.penalties };
    dto.bonuses = { ...result.bonuses };
    return dto;
  }
}

