import { ApiProperty } from '@nestjs/swagger';
import {
  AbilityActivationType,
  GameEventType,
  UsageLimit,
} from '../../domain/enums';

/**
 * Ability DTO
 * Represents a Pokémon ability in API responses
 */
export class AbilityDto {
  @ApiProperty({
    description: 'Ability name',
    example: 'Damage Swap',
  })
  name: string;

  @ApiProperty({
    description: 'Human-readable ability text',
    example:
      'As often as you like during your turn (before your attack), you may move 1 damage counter from 1 of your Pokémon to another...',
  })
  text: string;

  @ApiProperty({
    description: 'How the ability activates',
    enum: AbilityActivationType,
    example: AbilityActivationType.ACTIVATED,
  })
  activationType: AbilityActivationType;

  @ApiProperty({
    description: 'Game event that triggers the ability (for triggered abilities)',
    enum: GameEventType,
    required: false,
  })
  triggerEvent?: GameEventType;

  @ApiProperty({
    description: 'Usage limit for the ability',
    enum: UsageLimit,
    required: false,
    example: UsageLimit.UNLIMITED,
  })
  usageLimit?: UsageLimit;
}

