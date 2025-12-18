import { AttackEffectType } from '../enums/attack-effect-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { TargetType } from '../enums/target-type.enum';
import { Condition } from './condition.value-object';

/**
 * Discard Energy Effect
 * Discard energy cards from this Pokémon or the defending Pokémon
 */
export interface DiscardEnergyEffect {
  effectType: AttackEffectType.DISCARD_ENERGY;
  target: TargetType.SELF | TargetType.DEFENDING;
  amount: number | 'all'; // Number of energy or 'all'
  energyType?: EnergyType; // Optional: discard specific energy type
  requiredConditions?: Condition[];
}

/**
 * Status Condition Effect
 * Apply a status condition to the defending Pokémon
 */
export interface StatusConditionEffect {
  effectType: AttackEffectType.STATUS_CONDITION;
  target: TargetType.DEFENDING;
  statusCondition: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED';
  requiredConditions?: Condition[];
}

/**
 * Damage Modifier Effect
 * Modify the damage dealt by this attack
 */
export interface DamageModifierEffect {
  effectType: AttackEffectType.DAMAGE_MODIFIER;
  modifier: number; // Positive for increase, negative for decrease
  requiredConditions?: Condition[];
}

/**
 * Heal Effect
 * Heal damage from this Pokémon or the defending Pokémon
 */
export interface HealEffect {
  effectType: AttackEffectType.HEAL;
  target: TargetType.SELF | TargetType.DEFENDING;
  amount: number; // Amount of damage to heal
  requiredConditions?: Condition[];
}

/**
 * Prevent Damage Effect
 * Prevent damage to this Pokémon or the defending Pokémon
 */
export interface PreventDamageEffect {
  effectType: AttackEffectType.PREVENT_DAMAGE;
  target: TargetType.SELF | TargetType.DEFENDING;
  duration: 'next_turn' | 'this_turn';
  amount?: number | 'all'; // Optional: prevent specific amount or all damage
  requiredConditions?: Condition[];
}

/**
 * Recoil Damage Effect
 * This Pokémon takes recoil damage
 */
export interface RecoilDamageEffect {
  effectType: AttackEffectType.RECOIL_DAMAGE;
  target: TargetType.SELF;
  amount: number; // Amount of recoil damage
  requiredConditions?: Condition[];
}

/**
 * Energy Acceleration Effect
 * Attach energy cards from deck, discard, or hand
 */
export interface EnergyAccelerationEffect {
  effectType: AttackEffectType.ENERGY_ACCELERATION;
  target: TargetType.SELF | TargetType.BENCHED_YOURS;
  source: 'deck' | 'discard' | 'hand';
  energyType?: EnergyType; // Optional: specific energy type
  count: number; // Number of energy cards to attach
  selector?: 'choice' | 'random'; // How to select if multiple targets
  requiredConditions?: Condition[];
}

/**
 * Switch Pokémon Effect
 * Switch this Pokémon with a benched Pokémon
 */
export interface SwitchPokemonEffect {
  effectType: AttackEffectType.SWITCH_POKEMON;
  target: TargetType.SELF;
  with: TargetType.BENCHED_YOURS;
  selector: 'choice' | 'random'; // Player chooses or random
  requiredConditions?: Condition[];
}

/**
 * Attack Effect
 * Discriminated union of all effect types
 */
export type AttackEffect =
  | DiscardEnergyEffect
  | StatusConditionEffect
  | DamageModifierEffect
  | HealEffect
  | PreventDamageEffect
  | RecoilDamageEffect
  | EnergyAccelerationEffect
  | SwitchPokemonEffect;

/**
 * Attack Effect Factory
 * Helper methods for creating effects with proper typing
 */
export class AttackEffectFactory {
  /**
   * Create a discard energy effect
   */
  static discardEnergy(
    target: TargetType.SELF | TargetType.DEFENDING,
    amount: number | 'all',
    energyType?: EnergyType,
    requiredConditions?: Condition[],
  ): DiscardEnergyEffect {
    return {
      effectType: AttackEffectType.DISCARD_ENERGY,
      target,
      amount,
      energyType,
      requiredConditions,
    };
  }

  /**
   * Create a status condition effect
   */
  static statusCondition(
    statusCondition:
      | 'PARALYZED'
      | 'POISONED'
      | 'BURNED'
      | 'ASLEEP'
      | 'CONFUSED',
    requiredConditions?: Condition[],
  ): StatusConditionEffect {
    return {
      effectType: AttackEffectType.STATUS_CONDITION,
      target: TargetType.DEFENDING,
      statusCondition,
      requiredConditions,
    };
  }

  /**
   * Create a damage modifier effect
   */
  static damageModifier(
    modifier: number,
    requiredConditions?: Condition[],
  ): DamageModifierEffect {
    return {
      effectType: AttackEffectType.DAMAGE_MODIFIER,
      modifier,
      requiredConditions,
    };
  }

  /**
   * Create a heal effect
   */
  static heal(
    target: TargetType.SELF | TargetType.DEFENDING,
    amount: number,
    requiredConditions?: Condition[],
  ): HealEffect {
    return {
      effectType: AttackEffectType.HEAL,
      target,
      amount,
      requiredConditions,
    };
  }

  /**
   * Create a prevent damage effect
   */
  static preventDamage(
    target: TargetType.SELF | TargetType.DEFENDING,
    duration: 'next_turn' | 'this_turn',
    amount?: number | 'all',
    requiredConditions?: Condition[],
  ): PreventDamageEffect {
    return {
      effectType: AttackEffectType.PREVENT_DAMAGE,
      target,
      duration,
      amount,
      requiredConditions,
    };
  }

  /**
   * Create a recoil damage effect
   */
  static recoilDamage(
    amount: number,
    requiredConditions?: Condition[],
  ): RecoilDamageEffect {
    return {
      effectType: AttackEffectType.RECOIL_DAMAGE,
      target: TargetType.SELF,
      amount,
      requiredConditions,
    };
  }

  /**
   * Create an energy acceleration effect
   */
  static energyAcceleration(
    target: TargetType.SELF | TargetType.BENCHED_YOURS,
    source: 'deck' | 'discard' | 'hand',
    count: number,
    energyType?: EnergyType,
    selector?: 'choice' | 'random',
    requiredConditions?: Condition[],
  ): EnergyAccelerationEffect {
    return {
      effectType: AttackEffectType.ENERGY_ACCELERATION,
      target,
      source,
      count,
      energyType,
      selector,
      requiredConditions,
    };
  }

  /**
   * Create a switch Pokémon effect
   */
  static switchPokemon(
    selector: 'choice' | 'random',
    requiredConditions?: Condition[],
  ): SwitchPokemonEffect {
    return {
      effectType: AttackEffectType.SWITCH_POKEMON,
      target: TargetType.SELF,
      with: TargetType.BENCHED_YOURS,
      selector,
      requiredConditions,
    };
  }
}
