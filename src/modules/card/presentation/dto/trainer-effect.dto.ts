import { ApiProperty } from '@nestjs/swagger';
import { TrainerEffectType } from '../../domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';

/**
 * Trainer Effect DTO
 * Represents a structured effect of a Trainer card in API responses
 */
export class TrainerEffectDto {
  @ApiProperty({
    description: 'Type of trainer effect',
    enum: TrainerEffectType,
    example: TrainerEffectType.DRAW_CARDS,
  })
  effectType: TrainerEffectType;

  @ApiProperty({
    description: 'Target of the effect',
    enum: TargetType,
    example: TargetType.SELF,
  })
  target: TargetType;

  @ApiProperty({
    description: 'Numeric or string value for the effect (e.g., number of cards to draw, HP to heal)',
    required: false,
    example: 2,
  })
  value?: number | string;

  @ApiProperty({
    description: 'Type of card to search/retrieve (for search/retrieve effects)',
    required: false,
    example: 'Energy',
  })
  cardType?: string;

  @ApiProperty({
    description: 'Condition or restriction for the effect',
    required: false,
    example: 'if heads',
  })
  condition?: string;

  @ApiProperty({
    description: 'Human-readable description of the effect',
    required: false,
    example: 'Draw 2 cards',
  })
  description?: string;

  @ApiProperty({
    description: 'Source location for effects that retrieve/move cards (e.g., "DISCARD", "OPPONENT_DISCARD", "HAND", "DECK")',
    required: false,
    example: 'DISCARD',
  })
  source?: string;
}

