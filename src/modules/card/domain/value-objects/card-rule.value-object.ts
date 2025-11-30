import { CardRuleType } from '../enums/card-rule-type.enum';
import { RulePriority } from '../enums/rule-priority.enum';
import { PokemonType } from '../enums/pokemon-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { Condition } from './condition.value-object';

/**
 * Rule Metadata
 * Additional data specific to different rule types
 */
export type RuleMetadata =
  | MovementRuleMetadata
  | AttackRuleMetadata
  | DamageRuleMetadata
  | StatusRuleMetadata
  | PrizeRuleMetadata
  | EvolutionRuleMetadata
  | PlayRuleMetadata
  | EnergyRuleMetadata;

// Movement Rule Metadata
export interface MovementRuleMetadata {
  category: 'movement';
  allowedActions?: string[];
  switchTarget?: 'benched' | 'random';
}

// Attack Rule Metadata
export interface AttackRuleMetadata {
  category: 'attack';
  costReduction?: number;
  costIncrease?: number;
  affectedAttacks?: string[]; // Specific attack names
  perCondition?: string; // "per damage counter", etc.
}

// Damage Rule Metadata
export interface DamageRuleMetadata {
  category: 'damage';
  immuneFrom?: PokemonType[] | string[]; // Types or special categories like "EX", "GX"
  reductionAmount?: number;
  increaseAmount?: number;
  immuneFromSubtype?: string; // "Pokémon-EX", "Pokémon-GX", etc.
}

// Status Rule Metadata
export interface StatusRuleMetadata {
  category: 'status';
  immuneStatus?: string[]; // Status conditions
  effectTypes?: string[]; // Types of effects
}

// Prize Rule Metadata
export interface PrizeRuleMetadata {
  category: 'prize';
  prizeCount?: number; // Extra prizes to take
}

// Evolution Rule Metadata
export interface EvolutionRuleMetadata {
  category: 'evolution';
  allowFirstTurn?: boolean;
  skipStages?: number;
  allowedEvolutions?: string[];
}

// Play Rule Metadata
export interface PlayRuleMetadata {
  category: 'play';
  restriction?: string; // "first turn", "once per game", etc.
  discardTiming?: 'after_use' | 'end_of_turn';
  usageLimit?: 'once_per_game' | 'once_per_turn';
}

// Energy Rule Metadata
export interface EnergyRuleMetadata {
  category: 'energy';
  costReduction?: number;
  perCondition?: string; // "per damage counter", etc.
  energyType?: EnergyType;
  changeToType?: EnergyType;
  extraAttachments?: number;
}

/**
 * Card Rule Value Object
 * Represents special rules that modify card behavior
 * 
 * Card rules are always-on modifications or restrictions,
 * different from abilities which are active effects.
 */
export class CardRule {
  constructor(
    public readonly ruleType: CardRuleType,
    public readonly text: string,
    public readonly conditions?: Condition[],
    public readonly priority: RulePriority = RulePriority.NORMAL,
    public readonly metadata?: RuleMetadata,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.ruleType) {
      throw new Error('Rule type is required');
    }

    if (!Object.values(CardRuleType).includes(this.ruleType)) {
      throw new Error(`Invalid rule type: ${this.ruleType}`);
    }

    if (!this.text || this.text.trim() === '') {
      throw new Error('Rule text is required');
    }

    if (!Object.values(RulePriority).includes(this.priority)) {
      throw new Error(`Invalid rule priority: ${this.priority}`);
    }

    // Validate metadata if present
    if (this.metadata) {
      this.validateMetadata();
    }
  }

  private validateMetadata(): void {
    if (!this.metadata) return;

    // Validate category-specific requirements
    switch (this.metadata.category) {
      case 'prize':
        const prizeMetadata = this.metadata as PrizeRuleMetadata;
        // Allow 0 for NO_PRIZE_CARDS rule type
        if (
          this.ruleType !== CardRuleType.NO_PRIZE_CARDS &&
          prizeMetadata.prizeCount !== undefined &&
          prizeMetadata.prizeCount < 1
        ) {
          throw new Error('Prize count must be at least 1');
        }
        break;

      case 'attack':
        const attackMetadata = this.metadata as AttackRuleMetadata;
        if (
          attackMetadata.costReduction !== undefined &&
          attackMetadata.costReduction < 0
        ) {
          throw new Error('Cost reduction cannot be negative');
        }
        break;

      case 'damage':
        const damageMetadata = this.metadata as DamageRuleMetadata;
        if (
          damageMetadata.reductionAmount !== undefined &&
          damageMetadata.reductionAmount < 0
        ) {
          throw new Error('Damage reduction cannot be negative');
        }
        break;

      case 'energy':
        const energyMetadata = this.metadata as EnergyRuleMetadata;
        if (
          energyMetadata.extraAttachments !== undefined &&
          energyMetadata.extraAttachments < 1
        ) {
          throw new Error('Extra attachments must be at least 1');
        }
        break;
    }
  }

  /**
   * Get the priority value for sorting
   */
  getPriority(): RulePriority {
    return this.priority;
  }

  /**
   * Get priority as number for sorting (higher = execute first)
   */
  getPriorityValue(): number {
    const priorityMap: Record<RulePriority, number> = {
      [RulePriority.HIGHEST]: 5,
      [RulePriority.HIGH]: 4,
      [RulePriority.NORMAL]: 3,
      [RulePriority.LOW]: 2,
      [RulePriority.LOWEST]: 1,
    };
    return priorityMap[this.priority];
  }

  /**
   * Check if rule has conditions
   */
  hasConditions(): boolean {
    return !!this.conditions && this.conditions.length > 0;
  }

  /**
   * Check if rule has metadata
   */
  hasMetadata(): boolean {
    return !!this.metadata;
  }
}

/**
 * Card Rule Factory
 * Helper methods to create common card rules
 */
export class CardRuleFactory {
  // ========================================
  // MOVEMENT RULES
  // ========================================

  static cannotRetreat(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.CANNOT_RETREAT,
      "This Pokémon can't retreat",
      conditions,
      RulePriority.HIGH,
      { category: 'movement' },
    );
  }

  static freeRetreat(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.FREE_RETREAT,
      "This Pokémon's Retreat Cost is 0",
      conditions,
      RulePriority.NORMAL,
      { category: 'movement' },
    );
  }

  static forcedSwitch(
    switchTarget: 'benched' | 'random' = 'benched',
    conditions?: Condition[],
  ): CardRule {
    return new CardRule(
      CardRuleType.FORCED_SWITCH,
      'Switch this Pokémon after certain actions',
      conditions,
      RulePriority.NORMAL,
      { category: 'movement', switchTarget },
    );
  }

  // ========================================
  // ATTACK RULES
  // ========================================

  static cannotAttack(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.CANNOT_ATTACK,
      "This Pokémon can't attack",
      conditions,
      RulePriority.HIGH,
      { category: 'attack' },
    );
  }

  static attackCostReduction(
    reduction: number,
    conditions?: Condition[],
    perCondition?: string,
  ): CardRule {
    const text = perCondition
      ? `This Pokémon's attacks cost ${reduction} less Energy ${perCondition}`
      : `This Pokémon's attacks cost ${reduction} less Energy`;

    return new CardRule(
      CardRuleType.ATTACK_COST_MODIFICATION,
      text,
      conditions,
      RulePriority.NORMAL,
      { category: 'attack', costReduction: reduction, perCondition },
    );
  }

  // ========================================
  // DAMAGE RULES
  // ========================================

  static damageImmunity(
    immuneFromSubtype?: string,
    conditions?: Condition[],
  ): CardRule {
    const text = immuneFromSubtype
      ? `Prevent all damage done to this Pokémon by attacks from ${immuneFromSubtype}`
      : 'Prevent all damage done to this Pokémon';

    return new CardRule(
      CardRuleType.DAMAGE_IMMUNITY,
      text,
      conditions,
      RulePriority.HIGH,
      { category: 'damage', immuneFromSubtype },
    );
  }

  static damageReduction(
    amount: number,
    conditions?: Condition[],
  ): CardRule {
    return new CardRule(
      CardRuleType.DAMAGE_REDUCTION_RULE,
      `This Pokémon takes ${amount} less damage from attacks`,
      conditions,
      RulePriority.NORMAL,
      { category: 'damage', reductionAmount: amount },
    );
  }

  // ========================================
  // STATUS RULES
  // ========================================

  static statusImmunity(
    statusTypes: string[],
    conditions?: Condition[],
  ): CardRule {
    const statusList = statusTypes.join(', ');
    const text = `This Pokémon can't be affected by ${statusList}`;

    return new CardRule(
      CardRuleType.STATUS_IMMUNITY,
      text,
      conditions,
      RulePriority.HIGH,
      { category: 'status', immuneStatus: statusTypes },
    );
  }

  static effectImmunity(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.EFFECT_IMMUNITY,
      'Prevent all effects of attacks, except damage, done to this Pokémon',
      conditions,
      RulePriority.HIGH,
      { category: 'status' },
    );
  }

  // ========================================
  // PRIZE RULES
  // ========================================

  static extraPrizeCards(count: number, conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.EXTRA_PRIZE_CARDS,
      `When this Pokémon is Knocked Out, your opponent takes ${count} more Prize card${count > 1 ? 's' : ''}`,
      conditions,
      RulePriority.NORMAL,
      { category: 'prize', prizeCount: count },
    );
  }

  static noPrizeCards(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.NO_PRIZE_CARDS,
      "If this Pokémon is Knocked Out, your opponent doesn't take any Prize cards",
      conditions,
      RulePriority.NORMAL,
      { category: 'prize', prizeCount: 0 },
    );
  }

  // ========================================
  // EVOLUTION RULES
  // ========================================

  static canEvolveTurnOne(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.CAN_EVOLVE_TURN_ONE,
      'This Pokémon can evolve during your first turn or the turn it was played',
      conditions,
      RulePriority.NORMAL,
      { category: 'evolution', allowFirstTurn: true },
    );
  }

  static cannotEvolve(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.CANNOT_EVOLVE,
      "This Pokémon can't evolve",
      conditions,
      RulePriority.HIGH,
      { category: 'evolution' },
    );
  }

  // ========================================
  // PLAY RULES
  // ========================================

  static oncePerGame(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.ONCE_PER_GAME,
      'You can use this only once per game',
      conditions,
      RulePriority.HIGHEST,
      { category: 'play', usageLimit: 'once_per_game' },
    );
  }

  static discardAfterUse(conditions?: Condition[]): CardRule {
    return new CardRule(
      CardRuleType.DISCARD_AFTER_USE,
      'Discard this card after you use it',
      conditions,
      RulePriority.NORMAL,
      { category: 'play', discardTiming: 'after_use' },
    );
  }

  // ========================================
  // ENERGY RULES
  // ========================================

  static energyCostReduction(
    reduction: number,
    energyType?: EnergyType,
    conditions?: Condition[],
  ): CardRule {
    const typeText = energyType ? ` ${energyType}` : '';
    const text = `This Pokémon's attacks cost ${reduction} less${typeText} Energy`;

    return new CardRule(
      CardRuleType.ENERGY_COST_REDUCTION,
      text,
      conditions,
      RulePriority.NORMAL,
      { category: 'energy', costReduction: reduction, energyType },
    );
  }

  static extraEnergyAttachment(
    count: number,
    conditions?: Condition[],
  ): CardRule {
    return new CardRule(
      CardRuleType.EXTRA_ENERGY_ATTACHMENT,
      `You may attach ${count} extra Energy card${count > 1 ? 's' : ''} to this Pokémon during your turn`,
      conditions,
      RulePriority.NORMAL,
      { category: 'energy', extraAttachments: count },
    );
  }

  static energyTypeChange(
    changeToType: EnergyType,
    conditions?: Condition[],
  ): CardRule {
    return new CardRule(
      CardRuleType.ENERGY_TYPE_CHANGE,
      `All Energy attached to this Pokémon are ${changeToType} Energy`,
      conditions,
      RulePriority.NORMAL,
      { category: 'energy', changeToType },
    );
  }
}
