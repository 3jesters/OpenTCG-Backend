import { ApiProperty } from '@nestjs/swagger';
import { AttackEffectType } from '../../domain/enums/attack-effect-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';
import { EnergyType } from '../../domain/enums/energy-type.enum';

/**
 * Attack Effect DTO
 * Represents an attack effect in API responses
 */
export class AttackEffectDto {
  @ApiProperty({
    description: 'Type of attack effect',
    enum: AttackEffectType,
    example: AttackEffectType.DISCARD_ENERGY,
  })
  effectType: AttackEffectType;

  @ApiProperty({
    description: 'Target of the effect',
    enum: TargetType,
    required: false,
    example: TargetType.SELF,
  })
  target?: TargetType;

  // DISCARD_ENERGY specific fields
  @ApiProperty({
    description: 'Amount of energy to discard (for DISCARD_ENERGY)',
    required: false,
    example: 1,
  })
  amount?: number | 'all';

  @ApiProperty({
    description: 'Specific energy type to discard (for DISCARD_ENERGY)',
    enum: EnergyType,
    required: false,
    example: EnergyType.FIRE,
  })
  energyType?: EnergyType;

  // STATUS_CONDITION specific fields
  @ApiProperty({
    description: 'Status condition to apply (for STATUS_CONDITION)',
    required: false,
    example: 'PARALYZED',
  })
  statusCondition?: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED';

  // DAMAGE_MODIFIER specific fields
  @ApiProperty({
    description: 'Damage modifier amount (for DAMAGE_MODIFIER)',
    required: false,
    example: 30,
  })
  modifier?: number;

  // HEAL specific fields
  @ApiProperty({
    description: 'Amount of damage to heal (for HEAL)',
    required: false,
    example: 20,
  })
  healAmount?: number;

  // PREVENT_DAMAGE specific fields
  @ApiProperty({
    description: 'Duration of damage prevention (for PREVENT_DAMAGE)',
    required: false,
    example: 'next_turn',
  })
  duration?: 'next_turn' | 'this_turn';

  // RECOIL_DAMAGE specific fields
  @ApiProperty({
    description: 'Amount of recoil damage (for RECOIL_DAMAGE)',
    required: false,
    example: 10,
  })
  recoilAmount?: number;

  // ENERGY_ACCELERATION specific fields
  @ApiProperty({
    description: 'Source of energy (for ENERGY_ACCELERATION)',
    required: false,
    example: 'deck',
  })
  source?: 'deck' | 'discard' | 'hand';

  @ApiProperty({
    description: 'Number of energy cards (for ENERGY_ACCELERATION)',
    required: false,
    example: 1,
  })
  count?: number;

  // SWITCH_POKEMON specific fields
  @ApiProperty({
    description: 'Selector for switching (for SWITCH_POKEMON)',
    required: false,
    example: 'choice',
  })
  selector?: 'choice' | 'random';

  @ApiProperty({
    description: 'Target to switch with (for SWITCH_POKEMON)',
    enum: TargetType,
    required: false,
    example: TargetType.BENCHED_YOURS,
  })
  with?: TargetType;
}
