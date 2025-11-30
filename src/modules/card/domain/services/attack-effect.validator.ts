import { AttackEffectType } from '../enums/attack-effect-type.enum';
import { TargetType } from '../enums/target-type.enum';
import {
  AttackEffect,
  DiscardEnergyEffect,
  StatusConditionEffect,
  DamageModifierEffect,
  HealEffect,
  PreventDamageEffect,
  RecoilDamageEffect,
  EnergyAccelerationEffect,
  SwitchPokemonEffect,
} from '../value-objects/attack-effect.value-object';
import { ConditionValidator } from './condition.validator';

/**
 * Attack Effect Validator
 * Validates that attack effects are well-formed and contain valid data
 */
export class AttackEffectValidator {
  /**
   * Validate an attack effect
   * @param effect The effect to validate
   * @returns true if valid
   * @throws Error with descriptive message if validation fails
   */
  static validate(effect: AttackEffect): boolean {
    if (!effect) {
      throw new Error('Effect is required');
    }

    if (!effect.effectType) {
      throw new Error('Effect type is required');
    }

    // Validate required conditions if present
    if (effect.requiredConditions && effect.requiredConditions.length > 0) {
      try {
        ConditionValidator.validateAll(effect.requiredConditions);
      } catch (error) {
        throw new Error(`Invalid required conditions: ${error.message}`);
      }
    }

    // Validate based on effect type
    switch (effect.effectType) {
      case AttackEffectType.DISCARD_ENERGY:
        return this.validateDiscardEnergy(effect as DiscardEnergyEffect);
      case AttackEffectType.STATUS_CONDITION:
        return this.validateStatusCondition(effect as StatusConditionEffect);
      case AttackEffectType.DAMAGE_MODIFIER:
        return this.validateDamageModifier(effect as DamageModifierEffect);
      case AttackEffectType.HEAL:
        return this.validateHeal(effect as HealEffect);
      case AttackEffectType.PREVENT_DAMAGE:
        return this.validatePreventDamage(effect as PreventDamageEffect);
      case AttackEffectType.RECOIL_DAMAGE:
        return this.validateRecoilDamage(effect as RecoilDamageEffect);
      case AttackEffectType.ENERGY_ACCELERATION:
        return this.validateEnergyAcceleration(effect as EnergyAccelerationEffect);
      case AttackEffectType.SWITCH_POKEMON:
        return this.validateSwitchPokemon(effect as SwitchPokemonEffect);
      default:
        throw new Error(`Unknown effect type: ${(effect as any).effectType}`);
    }
  }

  /**
   * Validate discard energy effect
   */
  private static validateDiscardEnergy(effect: DiscardEnergyEffect): boolean {
    if (!effect.target) {
      throw new Error('Discard energy target is required');
    }

    if (effect.target !== TargetType.SELF && effect.target !== TargetType.DEFENDING) {
      throw new Error('Discard energy target must be "self" or "defending"');
    }

    if (effect.amount === undefined || effect.amount === null) {
      throw new Error('Discard energy amount is required');
    }

    if (effect.amount !== 'all') {
      if (typeof effect.amount !== 'number') {
        throw new Error('Discard energy amount must be a number or "all"');
      }

      if (effect.amount < 1) {
        throw new Error('Discard energy amount must be at least 1');
      }

      if (!Number.isInteger(effect.amount)) {
        throw new Error('Discard energy amount must be an integer');
      }
    }

    return true;
  }

  /**
   * Validate status condition effect
   */
  private static validateStatusCondition(effect: StatusConditionEffect): boolean {
    if (!effect.target) {
      throw new Error('Status condition target is required');
    }

    if (effect.target !== TargetType.DEFENDING) {
      throw new Error('Status condition target must be "defending"');
    }

    if (!effect.statusCondition) {
      throw new Error('Status condition is required');
    }

    const validStatuses = ['PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'CONFUSED'];
    if (!validStatuses.includes(effect.statusCondition)) {
      throw new Error(
        `Invalid status condition: ${effect.statusCondition}. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Validate damage modifier effect
   */
  private static validateDamageModifier(effect: DamageModifierEffect): boolean {
    if (effect.modifier === undefined || effect.modifier === null) {
      throw new Error('Damage modifier is required');
    }

    if (typeof effect.modifier !== 'number') {
      throw new Error('Damage modifier must be a number');
    }

    if (!Number.isInteger(effect.modifier)) {
      throw new Error('Damage modifier must be an integer');
    }

    if (effect.modifier === 0) {
      throw new Error('Damage modifier cannot be 0');
    }

    return true;
  }

  /**
   * Validate heal effect
   */
  private static validateHeal(effect: HealEffect): boolean {
    if (!effect.target) {
      throw new Error('Heal target is required');
    }

    if (effect.target !== TargetType.SELF && effect.target !== TargetType.DEFENDING) {
      throw new Error('Heal target must be "self" or "defending"');
    }

    if (effect.amount === undefined || effect.amount === null) {
      throw new Error('Heal amount is required');
    }

    if (typeof effect.amount !== 'number') {
      throw new Error('Heal amount must be a number');
    }

    if (effect.amount < 1) {
      throw new Error('Heal amount must be at least 1');
    }

    if (!Number.isInteger(effect.amount)) {
      throw new Error('Heal amount must be an integer');
    }

    return true;
  }

  /**
   * Validate prevent damage effect
   */
  private static validatePreventDamage(effect: PreventDamageEffect): boolean {
    if (!effect.target) {
      throw new Error('Prevent damage target is required');
    }

    if (effect.target !== TargetType.SELF && effect.target !== TargetType.DEFENDING) {
      throw new Error('Prevent damage target must be "self" or "defending"');
    }

    if (!effect.duration) {
      throw new Error('Prevent damage duration is required');
    }

    if (!['next_turn', 'this_turn'].includes(effect.duration)) {
      throw new Error('Prevent damage duration must be "next_turn" or "this_turn"');
    }

    if (effect.amount !== undefined && effect.amount !== 'all') {
      if (typeof effect.amount !== 'number') {
        throw new Error('Prevent damage amount must be a number or "all"');
      }

      if (effect.amount < 1) {
        throw new Error('Prevent damage amount must be at least 1');
      }

      if (!Number.isInteger(effect.amount)) {
        throw new Error('Prevent damage amount must be an integer');
      }
    }

    return true;
  }

  /**
   * Validate recoil damage effect
   */
  private static validateRecoilDamage(effect: RecoilDamageEffect): boolean {
    if (!effect.target) {
      throw new Error('Recoil damage target is required');
    }

    if (effect.target !== TargetType.SELF) {
      throw new Error('Recoil damage target must be "self"');
    }

    if (effect.amount === undefined || effect.amount === null) {
      throw new Error('Recoil damage amount is required');
    }

    if (typeof effect.amount !== 'number') {
      throw new Error('Recoil damage amount must be a number');
    }

    if (effect.amount < 1) {
      throw new Error('Recoil damage amount must be at least 1');
    }

    if (!Number.isInteger(effect.amount)) {
      throw new Error('Recoil damage amount must be an integer');
    }

    return true;
  }

  /**
   * Validate energy acceleration effect
   */
  private static validateEnergyAcceleration(
    effect: EnergyAccelerationEffect,
  ): boolean {
    if (!effect.target) {
      throw new Error('Energy acceleration target is required');
    }

    if (effect.target !== TargetType.SELF && effect.target !== TargetType.BENCHED_YOURS) {
      throw new Error('Energy acceleration target must be "self" or "benched"');
    }

    if (!effect.source) {
      throw new Error('Energy acceleration source is required');
    }

    if (!['deck', 'discard', 'hand'].includes(effect.source)) {
      throw new Error('Energy acceleration source must be "deck", "discard", or "hand"');
    }

    if (effect.count === undefined || effect.count === null) {
      throw new Error('Energy acceleration count is required');
    }

    if (typeof effect.count !== 'number') {
      throw new Error('Energy acceleration count must be a number');
    }

    if (effect.count < 1) {
      throw new Error('Energy acceleration count must be at least 1');
    }

    if (!Number.isInteger(effect.count)) {
      throw new Error('Energy acceleration count must be an integer');
    }

    if (effect.selector && !['choice', 'random'].includes(effect.selector)) {
      throw new Error('Energy acceleration selector must be "choice" or "random"');
    }

    return true;
  }

  /**
   * Validate switch Pokémon effect
   */
  private static validateSwitchPokemon(effect: SwitchPokemonEffect): boolean {
    if (!effect.target) {
      throw new Error('Switch Pokémon target is required');
    }

    if (effect.target !== TargetType.SELF) {
      throw new Error('Switch Pokémon target must be "self"');
    }

    if (!effect.with) {
      throw new Error('Switch Pokémon "with" is required');
    }

    if (effect.with !== TargetType.BENCHED_YOURS) {
      throw new Error('Switch Pokémon "with" must be "benched"');
    }

    if (!effect.selector) {
      throw new Error('Switch Pokémon selector is required');
    }

    if (!['choice', 'random'].includes(effect.selector)) {
      throw new Error('Switch Pokémon selector must be "choice" or "random"');
    }

    return true;
  }

  /**
   * Validate multiple effects
   * @param effects Array of effects to validate
   * @returns true if all are valid
   * @throws Error if any validation fails
   */
  static validateAll(effects: AttackEffect[]): boolean {
    if (!Array.isArray(effects)) {
      throw new Error('Effects must be an array');
    }

    effects.forEach((effect, index) => {
      try {
        this.validate(effect);
      } catch (error) {
        throw new Error(`Effect at index ${index} is invalid: ${error.message}`);
      }
    });

    return true;
  }
}

