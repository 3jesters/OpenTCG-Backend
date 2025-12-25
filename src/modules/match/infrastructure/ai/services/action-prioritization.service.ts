import { Injectable } from '@nestjs/common';
import { GameState, PlayerGameState, CardInstance } from '../../../domain/value-objects';
import { PlayerIdentifier, PokemonPosition, StatusEffect } from '../../../domain/enums';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { StatusConditionEffect } from '../../../../card/domain/value-objects/attack-effect.value-object';
import { CardType, AttackEffectType } from '../../../../card/domain/enums';
import { PreconditionType } from '../../../../card/domain/enums/precondition-type.enum';
import { ConditionType } from '../../../../card/domain/enums/condition-type.enum';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import {
  AttackAnalysis,
  KnockoutAnalysis,
  OpponentThreat,
  SortedAttackAnalysisList,
  SortedKnockoutAnalysisList,
} from '../types/action-analysis.types';
import { sortAttackAnalyses, sortKnockoutAnalyses } from '../utils/sorting.utils';

/**
 * Action Prioritization Service
 * Analyzes available actions and prioritizes them based on game state
 */
@Injectable()
export class ActionPrioritizationService {
  constructor(
    private readonly opponentAnalysisService: OpponentAnalysisService,
    private readonly attackEnergyValidatorService: AttackEnergyValidatorService,
    private readonly attackDamageCalculationService: AttackDamageCalculationService,
  ) {}

  /**
   * Find all available attacks for the player
   * Returns attacks sorted by priority (canPerform, position, damage, side effects)
   */
  async findAvailableAttacks(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<SortedAttackAnalysisList> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const analyses: AttackAnalysis[] = [];

    // Analyze active Pokemon attacks
    if (playerState.activePokemon) {
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      if (activeCard.cardType === CardType.POKEMON && activeCard.attacks) {
        for (const attack of activeCard.attacks) {
          const analysis = await this.analyzeAttack(
            attack,
            playerState.activePokemon,
            activeCard,
            PokemonPosition.ACTIVE,
            cardsMap,
          );
          analyses.push(analysis);
        }
      }
    }

    // Analyze bench Pokemon attacks
    for (let i = 0; i < playerState.bench.length; i++) {
      const benchInstance = playerState.bench[i];
      const benchCard = await getCardEntity(benchInstance.cardId);
      if (benchCard.cardType === CardType.POKEMON && benchCard.attacks) {
        const position = this.getBenchPosition(i);
        for (const attack of benchCard.attacks) {
          const analysis = await this.analyzeAttack(
            attack,
            benchInstance,
            benchCard,
            position,
            cardsMap,
          );
          analyses.push(analysis);
        }
      }
    }

    // If no attacks can be performed, return empty array
    // Otherwise, return all attacks (including non-performable ones for planning)
    const hasPerformableAttacks = analyses.some((a) => a.canPerform);
    if (!hasPerformableAttacks) {
      return [];
    }

    return sortAttackAnalyses(analyses);
  }

  /**
   * Identify attacks that can knockout opponent Pokemon
   * Returns knockout analyses sorted by priority (target position, side effects, damage)
   * Note: Only considers attacks from active Pokemon (only active Pokemon can attack)
   */
  async identifyKnockoutAttacks(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<SortedKnockoutAnalysisList> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const knockouts: KnockoutAnalysis[] = [];

    // Get all available attacks
    const availableAttacks = await this.findAvailableAttacks(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Filter to only attacks we can perform
    // Note: In Pokemon TCG, only active Pokemon can attack, but we analyze all attacks
    // for planning purposes (e.g., if we retreat and make bench Pokemon active)
    const performableAttacks = availableAttacks.filter((a) => a.canPerform);

    // Check each attack against opponent Pokemon
    for (const attackAnalysis of performableAttacks) {
      // Check active Pokemon
      if (opponentState.activePokemon) {
        const opponentActiveCard = await getCardEntity(
          opponentState.activePokemon.cardId,
        );
        const knockout = await this.checkKnockout(
          attackAnalysis,
          opponentState.activePokemon,
          opponentActiveCard,
          PokemonPosition.ACTIVE,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );
        if (knockout) {
          knockouts.push(knockout);
        }
      }

      // Check bench Pokemon (some attacks can target bench)
      for (let i = 0; i < opponentState.bench.length; i++) {
        const benchInstance = opponentState.bench[i];
        const benchCard = await getCardEntity(benchInstance.cardId);
        const position = this.getBenchPosition(i);
        const knockout = await this.checkKnockout(
          attackAnalysis,
          benchInstance,
          benchCard,
          position,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );
        if (knockout) {
          knockouts.push(knockout);
        }
      }
    }

    return sortKnockoutAnalyses(knockouts);
  }

  /**
   * Find attacks with maximum damage potential
   * Returns attack analyses sorted by damage potential (considering effects and knockouts)
   */
  async findMaximumDamageAttacks(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<SortedAttackAnalysisList> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const analyses: AttackAnalysis[] = [];

    // Get all available attacks
    const availableAttacks = await this.findAvailableAttacks(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Calculate expected value for each attack
    const attacksWithValue = await Promise.all(
      availableAttacks.map(async (analysis) => {
        // Check if this attack can knockout
        let canKnockout = false;
        if (opponentState.activePokemon) {
          const damage = await this.calculateDamage(
            analysis,
            opponentState.activePokemon,
            await getCardEntity(opponentState.activePokemon.cardId),
            gameState,
            playerIdentifier,
            cardsMap,
            getCardEntity,
          );
          canKnockout = damage >= opponentState.activePokemon.currentHp;
        }

        // Calculate expected value
        const expectedValue = this.calculateExpectedValue(
          analysis,
          opponentState.activePokemon,
          canKnockout,
        );

        return {
          analysis,
          expectedValue,
          canKnockout,
        };
      }),
    );

    // Sort by: knockout first, then expected value
    attacksWithValue.sort((a, b) => {
      if (a.canKnockout !== b.canKnockout) {
        return a.canKnockout ? -1 : 1;
      }
      return b.expectedValue - a.expectedValue;
    });

    return attacksWithValue.map((item) => item.analysis);
  }

  /**
   * Assess opponent threat to our Pokemon
   * Returns threat analysis including knockout potential and damage capabilities
   */
  async assessOpponentThreat(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<OpponentThreat> {
    return await this.opponentAnalysisService.analyzeOpponentThreat(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );
  }

  /**
   * Analyze a single attack and create AttackAnalysis
   */
  private async analyzeAttack(
    attack: Attack,
    pokemon: CardInstance,
    card: Card,
    position: PokemonPosition,
    cardsMap: Map<string, Card>,
  ): Promise<AttackAnalysis> {
    // Get energy card data
    const energyCardData = this.getEnergyCardData(
      pokemon.attachedEnergy || [],
      cardsMap,
    );

    // Validate energy requirements
    const energyValidation =
      this.attackEnergyValidatorService.validateEnergyRequirements(
        attack,
        energyCardData,
      );

    // Parse base damage
    const baseDamage = this.parseBaseDamage(attack.damage || '');

    // Check for coin flip
    const hasCoinFlip =
      attack.hasPreconditions() &&
      attack.getPreconditionsByType(PreconditionType.COIN_FLIP).length > 0;

    // Check for status effects
    const hasPoisonEffect = this.hasPoisonEffect(attack);
    const hasOnlySideEffect = baseDamage === 0 && this.hasStatusEffect(attack);

    // Calculate side effect points
    const sideEffectPoints = this.calculateSideEffectPoints(attack, baseDamage);

    return {
      attack,
      pokemon,
      card,
      position,
      energyCost: attack.getTotalEnergyCost(),
      baseDamage,
      hasCoinFlip,
      hasPoisonEffect,
      hasOnlySideEffect,
      sideEffectPoints,
      canPerform: energyValidation.isValid,
    };
  }

  /**
   * Check if an attack can knockout a target Pokemon
   */
  private async checkKnockout(
    attackAnalysis: AttackAnalysis,
    targetPokemon: CardInstance,
    targetCard: Card,
    targetPosition: PokemonPosition,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<KnockoutAnalysis | null> {
    const damage = await this.calculateDamage(
      attackAnalysis,
      targetPokemon,
      targetCard,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    const willKnockout = damage >= targetPokemon.currentHp;

    if (!willKnockout) {
      return null;
    }

    // Check for side effects
    const hasSideEffectToOpponent = this.hasStatusEffect(attackAnalysis.attack);
    const hasSideEffectToPlayer = this.hasSelfSideEffect(attackAnalysis.attack);

    return {
      attack: attackAnalysis.attack,
      attackAnalysis,
      targetPokemon,
      targetCard,
      targetPosition,
      damage,
      willKnockout: true,
      hasSideEffectToOpponent,
      hasSideEffectToPlayer,
    };
  }

  /**
   * Calculate damage for an attack against a target
   */
  private async calculateDamage(
    attackAnalysis: AttackAnalysis,
    targetPokemon: CardInstance,
    targetCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Use the Pokemon that has the attack (from attackAnalysis)
    const attackerCard = attackAnalysis.card;

    const baseDamage = this.parseBaseDamage(attackAnalysis.attack.damage || '');

    // Calculate final damage using damage calculation service
    const finalDamage = await this.attackDamageCalculationService.calculateFinalDamage(
      {
        baseDamage,
        attack: attackAnalysis.attack,
        attackerCard,
        defenderCard: targetCard,
        gameState,
        playerIdentifier,
        playerState,
        opponentState,
        calculateMinusDamageReduction: (
          damage: number,
          attack: Attack,
          attackText: string,
          attackerName: string,
          playerState: PlayerGameState,
          opponentState: PlayerGameState,
        ) => damage, // Pass through for analysis
        calculatePlusDamageBonus: async (
          attack: Attack,
          attackerName: string,
          playerState: PlayerGameState,
          opponentState: PlayerGameState,
          attackText: string,
          gameState: GameState,
          playerIdentifier: PlayerIdentifier,
        ) => 0, // No bonus for analysis
        evaluateEffectConditions: async (
          conditions: any[],
          gameState: GameState,
          playerIdentifier: PlayerIdentifier,
          playerState: PlayerGameState,
          opponentState: PlayerGameState,
        ) => false, // No conditions for analysis
      },
    );

    return finalDamage;
  }

  /**
   * Calculate expected value for an attack
   * Considers: knockout priority, base damage, and effect value
   */
  private calculateExpectedValue(
    attackAnalysis: AttackAnalysis,
    targetPokemon: CardInstance | null,
    canKnockout: boolean,
  ): number {
    // If knockout, prioritize highly
    if (canKnockout) {
      return 10000 + attackAnalysis.baseDamage;
    }

    let expectedValue = attackAnalysis.baseDamage;

    // Add effect value if target doesn't already have the effect
    if (attackAnalysis.hasPoisonEffect || attackAnalysis.hasOnlySideEffect) {
      if (targetPokemon) {
        // Check if target already has the status effect
        const alreadyHasEffect = this.targetHasStatusEffect(
          attackAnalysis.attack,
          targetPokemon,
        );

        if (!alreadyHasEffect) {
          const effectValue = attackAnalysis.hasPoisonEffect ? 20 : 10;
          // Check if the status effect has coin flip conditions
          const effectProbability = this.getStatusEffectProbability(
            attackAnalysis.attack,
          );
          expectedValue += effectValue * effectProbability;
        }
      } else {
        // No target Pokemon, assume effect applies
        const effectValue = attackAnalysis.hasPoisonEffect ? 20 : 10;
        const effectProbability = this.getStatusEffectProbability(
          attackAnalysis.attack,
        );
        expectedValue += effectValue * effectProbability;
      }
    }

    return expectedValue;
  }

  /**
   * Check if target Pokemon already has the status effect from the attack
   */
  private targetHasStatusEffect(
    attack: Attack,
    targetPokemon: CardInstance,
  ): boolean {
    if (!attack.hasEffects()) {
      return false;
    }

    const statusEffects = attack.getEffectsByType(
      AttackEffectType.STATUS_CONDITION,
    );

    for (const effect of statusEffects) {
      if (effect.effectType === AttackEffectType.STATUS_CONDITION) {
        const statusEffect = effect as StatusConditionEffect;
        const statusEffectEnum = this.mapStatusConditionToStatusEffect(
          statusEffect.statusCondition,
        );
        if (statusEffectEnum && targetPokemon.statusEffects.includes(statusEffectEnum)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Map status condition string to StatusEffect enum
   */
  private mapStatusConditionToStatusEffect(
    statusCondition: string,
  ): StatusEffect | null {
    switch (statusCondition) {
      case 'POISONED':
        return StatusEffect.POISONED;
      case 'PARALYZED':
        return StatusEffect.PARALYZED;
      case 'ASLEEP':
        return StatusEffect.ASLEEP;
      case 'CONFUSED':
        return StatusEffect.CONFUSED;
      case 'BURNED':
        return StatusEffect.BURNED;
      default:
        return null;
    }
  }

  /**
   * Get the probability of a status effect applying
   * Returns 0.5 if the effect has coin flip conditions, 1.0 otherwise
   */
  private getStatusEffectProbability(attack: Attack): number {
    if (!attack.hasEffects()) {
      return 1.0;
    }

    const statusEffects = attack.getEffectsByType(
      AttackEffectType.STATUS_CONDITION,
    );

    if (statusEffects.length === 0) {
      return 1.0;
    }

    // Check if any status effect has coin flip conditions
    for (const effect of statusEffects) {
      if (effect.requiredConditions) {
        const hasCoinFlipCondition = effect.requiredConditions.some(
          (condition) =>
            condition.type === ConditionType.COIN_FLIP_SUCCESS ||
            condition.type === ConditionType.COIN_FLIP_FAILURE,
        );
        if (hasCoinFlipCondition) {
          return 0.5;
        }
      }
    }

    return 1.0;
  }

  /**
   * Get energy card data from attached energy IDs
   */
  private getEnergyCardData(
    energyCardIds: string[],
    cardsMap: Map<string, Card>,
  ): Array<{
    cardType: CardType;
    energyType?: any;
    energyProvision?: any;
  }> {
    return energyCardIds
      .map((cardId) => cardsMap.get(cardId))
      .filter((card): card is Card => card !== undefined)
      .filter((card) => card.cardType === CardType.ENERGY)
      .map((card) => ({
        cardType: card.cardType,
        energyType: card.energyType,
        energyProvision: card.energyProvision,
      }));
  }

  /**
   * Get bench position from index
   */
  private getBenchPosition(index: number): PokemonPosition {
    const positions = [
      PokemonPosition.BENCH_0,
      PokemonPosition.BENCH_1,
      PokemonPosition.BENCH_2,
      PokemonPosition.BENCH_3,
      PokemonPosition.BENCH_4,
    ];
    return positions[index] || PokemonPosition.BENCH_0;
  }

  /**
   * Parse base damage from damage string
   */
  private parseBaseDamage(damage: string): number {
    if (!damage || damage.trim() === '') {
      return 0;
    }
    const match = damage.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if attack has poison effect
   */
  private hasPoisonEffect(attack: Attack): boolean {
    if (!attack.hasEffects()) {
      return false;
    }

    const statusEffects = attack.getEffectsByType(
      AttackEffectType.STATUS_CONDITION,
    );

    return statusEffects.some((effect) => {
      if (effect.effectType === AttackEffectType.STATUS_CONDITION) {
        const statusEffect = effect as StatusConditionEffect;
        return statusEffect.statusCondition === 'POISONED';
      }
      return false;
    });
  }

  /**
   * Check if attack has any status effect
   */
  private hasStatusEffect(attack: Attack): boolean {
    if (!attack.hasEffects()) {
      return false;
    }

    const statusEffects = attack.getEffectsByType(
      AttackEffectType.STATUS_CONDITION,
    );

    return statusEffects.length > 0;
  }

  /**
   * Check if attack has self-side effects (affects player)
   */
  private hasSelfSideEffect(attack: Attack): boolean {
    if (!attack.hasEffects()) {
      return false;
    }

    // Check for discard energy effects on self
    const discardEffects = attack.getEffectsByType(
      AttackEffectType.DISCARD_ENERGY,
    );
    const hasDiscardSelf = discardEffects.some((effect) => {
      // Check if effect targets self
      const attackText = attack.text?.toLowerCase() || '';
      return (
        attackText.includes('discard') &&
        (attackText.includes('this pokemon') ||
          attackText.includes('attacking pokemon') ||
          attackText.includes('yourself'))
      );
    });

    // Check for recoil damage effects (always target self)
    const recoilEffects = attack.getEffectsByType(
      AttackEffectType.RECOIL_DAMAGE,
    );
    const hasRecoil = recoilEffects.length > 0;

    return hasDiscardSelf || hasRecoil;
  }

  /**
   * Calculate side effect points
   * Only calculated when attack has status condition side effects
   * - Poison: 20
   * - Other status effects: 10
   * - No side effect: 0
   */
  private calculateSideEffectPoints(attack: Attack, baseDamage: number): number {
    if (!attack.hasEffects()) {
      return 0;
    }

    const statusEffects = attack.getEffectsByType(
      AttackEffectType.STATUS_CONDITION,
    );

    if (statusEffects.length === 0) {
      return 0;
    }

    // Check if any status effect is poison
    const hasPoison = statusEffects.some((effect) => {
      if (effect.effectType === AttackEffectType.STATUS_CONDITION) {
        const statusEffect = effect as StatusConditionEffect;
        return statusEffect.statusCondition === 'POISONED';
      }
      return false;
    });

    if (hasPoison) {
      return 20;
    }

    // Other status effects (paralyze, sleep, confuse, burn)
    return 10;
  }
}
