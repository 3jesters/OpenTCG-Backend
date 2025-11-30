import { AbilityEffectType } from '../enums/ability-effect-type.enum';
import { TargetType } from '../enums/target-type.enum';
import { ConditionValidator } from './condition.validator';
import type {
  AbilityEffect,
  HealAbilityEffect,
  PreventDamageAbilityEffect,
  StatusConditionAbilityEffect,
  EnergyAccelerationAbilityEffect,
  SwitchPokemonAbilityEffect,
  DrawCardsEffect,
  SearchDeckEffect,
  BoostAttackEffect,
  BoostHPEffect,
  ReduceDamageEffect,
  DiscardFromHandEffect,
  AttachFromDiscardEffect,
  RetrieveFromDiscardEffect,
} from '../value-objects/ability-effect.value-object';

/**
 * Validator for Ability Effects
 * Provides comprehensive validation for all ability effect types
 */
export class AbilityEffectValidator {
  /**
   * Validate a single ability effect
   */
  static validate(effect: AbilityEffect): void {
    // General validation
    if (!effect.effectType) {
      throw new Error('Effect type is required');
    }

    if (!Object.values(AbilityEffectType).includes(effect.effectType)) {
      throw new Error(`Invalid effect type: ${effect.effectType}`);
    }

    // Validate required conditions if present
    if (effect.requiredConditions && effect.requiredConditions.length > 0) {
      try {
        ConditionValidator.validateAll(effect.requiredConditions);
      } catch (error) {
        throw new Error(`Invalid conditions: ${error.message}`);
      }
    }

    // Type-specific validation
    switch (effect.effectType) {
      case AbilityEffectType.HEAL:
        this.validateHeal(effect as HealAbilityEffect);
        break;
      case AbilityEffectType.PREVENT_DAMAGE:
        this.validatePreventDamage(effect as PreventDamageAbilityEffect);
        break;
      case AbilityEffectType.STATUS_CONDITION:
        this.validateStatusCondition(effect as StatusConditionAbilityEffect);
        break;
      case AbilityEffectType.ENERGY_ACCELERATION:
        this.validateEnergyAcceleration(
          effect as EnergyAccelerationAbilityEffect,
        );
        break;
      case AbilityEffectType.SWITCH_POKEMON:
        this.validateSwitchPokemon(effect as SwitchPokemonAbilityEffect);
        break;
      case AbilityEffectType.DRAW_CARDS:
        this.validateDrawCards(effect as DrawCardsEffect);
        break;
      case AbilityEffectType.SEARCH_DECK:
        this.validateSearchDeck(effect as SearchDeckEffect);
        break;
      case AbilityEffectType.BOOST_ATTACK:
        this.validateBoostAttack(effect as BoostAttackEffect);
        break;
      case AbilityEffectType.BOOST_HP:
        this.validateBoostHP(effect as BoostHPEffect);
        break;
      case AbilityEffectType.REDUCE_DAMAGE:
        this.validateReduceDamage(effect as ReduceDamageEffect);
        break;
      case AbilityEffectType.DISCARD_FROM_HAND:
        this.validateDiscardFromHand(effect as DiscardFromHandEffect);
        break;
      case AbilityEffectType.ATTACH_FROM_DISCARD:
        this.validateAttachFromDiscard(effect as AttachFromDiscardEffect);
        break;
      case AbilityEffectType.RETRIEVE_FROM_DISCARD:
        this.validateRetrieveFromDiscard(effect as RetrieveFromDiscardEffect);
        break;
      default:
        throw new Error(`Unhandled effect type: ${effect.effectType}`);
    }
  }

  /**
   * Validate an array of ability effects
   */
  static validateAll(effects: AbilityEffect[]): void {
    if (!Array.isArray(effects)) {
      throw new Error('Effects must be an array');
    }

    effects.forEach((effect, index) => {
      try {
        this.validate(effect);
      } catch (error) {
        throw new Error(`Effect at index ${index}: ${error.message}`);
      }
    });
  }

  // ========================================
  // TYPE-SPECIFIC VALIDATORS
  // ========================================

  private static validateHeal(effect: HealAbilityEffect): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.ALL_YOURS,
      TargetType.BENCHED_YOURS,
      TargetType.ACTIVE_YOURS,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Heal effect target must be: self, all_yours, benched_yours, or active_yours',
      );
    }

    if (typeof effect.amount !== 'number' || effect.amount < 1) {
      throw new Error('Heal amount must be at least 1');
    }
  }

  private static validatePreventDamage(
    effect: PreventDamageAbilityEffect,
  ): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.ALL_YOURS,
      TargetType.BENCHED_YOURS,
      TargetType.ACTIVE_YOURS,
      TargetType.DEFENDING,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Prevent damage target must be: self, all_yours, benched_yours, active_yours, or defending',
      );
    }

    const validDurations = ['next_turn', 'this_turn', 'permanent'];
    if (!effect.duration || !validDurations.includes(effect.duration)) {
      throw new Error(
        'Duration must be: next_turn, this_turn, or permanent',
      );
    }

    if (
      effect.amount !== undefined &&
      effect.amount !== 'all' &&
      (typeof effect.amount !== 'number' || effect.amount < 1)
    ) {
      throw new Error('Prevent damage amount must be at least 1 or "all"');
    }
  }

  private static validateStatusCondition(
    effect: StatusConditionAbilityEffect,
  ): void {
    const validTargets = [
      TargetType.DEFENDING,
      TargetType.ALL_OPPONENTS,
      TargetType.ACTIVE_OPPONENT,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Status condition target must be: defending, all_opponents, or active_opponent',
      );
    }

    const validStatuses = [
      'PARALYZED',
      'POISONED',
      'BURNED',
      'ASLEEP',
      'CONFUSED',
    ];
    if (
      !effect.statusCondition ||
      !validStatuses.includes(effect.statusCondition)
    ) {
      throw new Error(
        'Status condition must be: PARALYZED, POISONED, BURNED, ASLEEP, or CONFUSED',
      );
    }
  }

  private static validateEnergyAcceleration(
    effect: EnergyAccelerationAbilityEffect,
  ): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.BENCHED_YOURS,
      TargetType.ALL_YOURS,
      TargetType.ACTIVE_YOURS,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Energy acceleration target must be: self, benched_yours, all_yours, or active_yours',
      );
    }

    const validSources = ['deck', 'discard', 'hand'];
    if (!effect.source || !validSources.includes(effect.source)) {
      throw new Error('Source must be: deck, discard, or hand');
    }

    if (typeof effect.count !== 'number' || effect.count < 1) {
      throw new Error('Count must be at least 1');
    }

    if (
      effect.selector &&
      effect.selector !== 'choice' &&
      effect.selector !== 'random'
    ) {
      throw new Error('Selector must be: choice or random');
    }
  }

  private static validateSwitchPokemon(
    effect: SwitchPokemonAbilityEffect,
  ): void {
    if (effect.target !== TargetType.SELF) {
      throw new Error('Switch Pokémon target must be: self');
    }

    if (effect.with !== TargetType.BENCHED_YOURS) {
      throw new Error('Switch with must be: benched_yours');
    }

    if (effect.selector !== 'choice' && effect.selector !== 'random') {
      throw new Error('Selector must be: choice or random');
    }
  }

  private static validateDrawCards(effect: DrawCardsEffect): void {
    if (typeof effect.count !== 'number' || effect.count < 1) {
      throw new Error('Draw count must be at least 1');
    }
  }

  private static validateSearchDeck(effect: SearchDeckEffect): void {
    if (typeof effect.count !== 'number' || effect.count < 1) {
      throw new Error('Search count must be at least 1');
    }

    const validDestinations = ['hand', 'bench'];
    if (
      !effect.destination ||
      !validDestinations.includes(effect.destination)
    ) {
      throw new Error('Destination must be: hand or bench');
    }

    if (
      effect.selector &&
      effect.selector !== 'choice' &&
      effect.selector !== 'random'
    ) {
      throw new Error('Selector must be: choice or random');
    }
  }

  private static validateBoostAttack(effect: BoostAttackEffect): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.ALL_YOURS,
      TargetType.BENCHED_YOURS,
      TargetType.ACTIVE_YOURS,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Boost attack target must be: self, all_yours, benched_yours, or active_yours',
      );
    }

    if (typeof effect.modifier !== 'number' || effect.modifier === 0) {
      throw new Error('Modifier must be a non-zero number');
    }
  }

  private static validateBoostHP(effect: BoostHPEffect): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.ALL_YOURS,
      TargetType.BENCHED_YOURS,
      TargetType.ACTIVE_YOURS,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Boost HP target must be: self, all_yours, benched_yours, or active_yours',
      );
    }

    if (typeof effect.modifier !== 'number' || effect.modifier === 0) {
      throw new Error('Modifier must be a non-zero number');
    }
  }

  private static validateReduceDamage(effect: ReduceDamageEffect): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.ALL_YOURS,
      TargetType.BENCHED_YOURS,
      TargetType.ACTIVE_YOURS,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Reduce damage target must be: self, all_yours, benched_yours, or active_yours',
      );
    }

    if (
      effect.amount !== 'all' &&
      (typeof effect.amount !== 'number' || effect.amount < 1)
    ) {
      throw new Error('Amount must be at least 1 or "all"');
    }
  }

  private static validateDiscardFromHand(
    effect: DiscardFromHandEffect,
  ): void {
    if (
      effect.count !== 'all' &&
      (typeof effect.count !== 'number' || effect.count < 1)
    ) {
      throw new Error('Count must be at least 1 or "all"');
    }

    if (effect.selector !== 'choice' && effect.selector !== 'random') {
      throw new Error('Selector must be: choice or random');
    }
  }

  private static validateAttachFromDiscard(
    effect: AttachFromDiscardEffect,
  ): void {
    const validTargets = [
      TargetType.SELF,
      TargetType.BENCHED_YOURS,
      TargetType.ALL_YOURS,
      TargetType.ACTIVE_YOURS,
    ];
    if (!effect.target || !validTargets.includes(effect.target)) {
      throw new Error(
        'Attach from discard target must be: self, benched_yours, all_yours, or active_yours',
      );
    }

    if (typeof effect.count !== 'number' || effect.count < 1) {
      throw new Error('Count must be at least 1');
    }

    if (
      effect.selector &&
      effect.selector !== 'choice' &&
      effect.selector !== 'random'
    ) {
      throw new Error('Selector must be: choice or random');
    }
  }

  private static validateRetrieveFromDiscard(
    effect: RetrieveFromDiscardEffect,
  ): void {
    if (typeof effect.count !== 'number' || effect.count < 1) {
      throw new Error('Count must be at least 1');
    }

    if (effect.selector !== 'choice' && effect.selector !== 'random') {
      throw new Error('Selector must be: choice or random');
    }
  }
}

