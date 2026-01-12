import { Injectable, Inject } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../../domain/value-objects';
import {
  PlayerIdentifier,
  PokemonPosition,
  StatusEffect,
} from '../../../domain/enums';
import { Card } from '../../../../card/domain/entities';
import { TrainerEffect } from '../../../../card/domain/value-objects';
import { TrainerEffectType, CardType } from '../../../../card/domain/enums';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { CardRuleType } from '../../../../card/domain/enums/card-rule-type.enum';
import { ActionPrioritizationService } from './action-prioritization.service';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { Attack } from '../../../../card/domain/value-objects';
import { PreconditionType } from '../../../../card/domain/enums/precondition-type.enum';
import {
  TrainerCardCategory,
  TrainerCardOption,
  TrainerCardImpact,
  SortedTrainerCardOptionList,
  SwitchRetreatOption,
  SwitchRetreatPriority,
} from '../types/action-analysis.types';
import { sortTrainerCardOptions } from '../utils/sorting.utils';
import { ILogger } from '../../../../../shared/application/ports/logger.interface';

/**
 * Trainer Card Analyzer Service
 * Analyzes trainer card options and determines optimal trainer card plays
 */
@Injectable()
export class TrainerCardAnalyzerService {
  // Effects to ignore when categorizing multi-effect cards
  private readonly IGNORED_EFFECTS: TrainerEffectType[] = [
    TrainerEffectType.DISCARD_HAND,
    TrainerEffectType.SHUFFLE_DECK,
    TrainerEffectType.DISCARD_ENERGY,
    TrainerEffectType.ATTACH_TO_POKEMON,
    TrainerEffectType.DEVOLVE_POKEMON,
    TrainerEffectType.OPPONENT_DISCARDS,
  ];

  constructor(
    private readonly actionPrioritizationService: ActionPrioritizationService,
    private readonly opponentAnalysisService: OpponentAnalysisService,
    private readonly pokemonScoringService: PokemonScoringService,
    private readonly attackEnergyValidatorService: AttackEnergyValidatorService,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  /**
   * Categorize a trainer card by its effect type
   * Returns the category based on the highest priority non-ignored effect
   */
  async categorizeTrainerCard(card: Card): Promise<TrainerCardCategory> {
    if (!card.trainerEffects || card.trainerEffects.length === 0) {
      throw new Error('Trainer card has no effects');
    }

    // Filter out ignored effects
    const nonIgnoredEffects = card.trainerEffects.filter(
      (effect) => !this.IGNORED_EFFECTS.includes(effect.effectType),
    );

    if (nonIgnoredEffects.length === 0) {
      // If all effects are ignored, use the first effect (fallback)
      return this.mapEffectTypeToCategory(card.trainerEffects[0].effectType);
    }

    // Find highest priority effect (lowest category number = highest priority)
    let highestPriorityCategory = TrainerCardCategory.SPECIAL_EFFECTS;
    let highestPriority = 8;

    for (const effect of nonIgnoredEffects) {
      const category = this.mapEffectTypeToCategory(effect.effectType);
      if (category < highestPriority) {
        highestPriority = category;
        highestPriorityCategory = category;
      }
    }

    return highestPriorityCategory;
  }

  /**
   * Map trainer effect type to category
   */
  private mapEffectTypeToCategory(
    effectType: TrainerEffectType,
  ): TrainerCardCategory {
    switch (effectType) {
      case TrainerEffectType.HEAL:
      case TrainerEffectType.CURE_STATUS:
        return TrainerCardCategory.HEALING_DAMAGE_REMOVAL;

      case TrainerEffectType.INCREASE_DAMAGE:
      case TrainerEffectType.REDUCE_DAMAGE:
        return TrainerCardCategory.DAMAGE_MODIFICATION;

      case TrainerEffectType.DRAW_CARDS:
      case TrainerEffectType.SEARCH_DECK:
      case TrainerEffectType.LOOK_AT_DECK:
        return TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION;

      case TrainerEffectType.RETRIEVE_FROM_DISCARD:
        return TrainerCardCategory.CARD_DISCARD_RETRIEVAL;

      case TrainerEffectType.OPPONENT_DRAWS:
      case TrainerEffectType.OPPONENT_SHUFFLES_HAND:
        return TrainerCardCategory.OPPONENT_MANIPULATION;

      case TrainerEffectType.SWITCH_ACTIVE:
      case TrainerEffectType.RETURN_TO_HAND:
      case TrainerEffectType.RETURN_TO_DECK:
      case TrainerEffectType.FORCE_SWITCH:
      case TrainerEffectType.EVOLVE_POKEMON:
      case TrainerEffectType.PUT_INTO_PLAY:
        return TrainerCardCategory.POKEMON_MANIPULATION;

      case TrainerEffectType.REMOVE_ENERGY:
      case TrainerEffectType.RETRIEVE_ENERGY:
        return TrainerCardCategory.ENERGY_MANIPULATION;

      default:
        return TrainerCardCategory.SPECIAL_EFFECTS;
    }
  }

  /**
   * Evaluate all trainer card options in hand
   * Returns sorted list of trainer card options with evaluation
   */
  async evaluateTrainerCardOptions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<SortedTrainerCardOptionList> {
    this.logger.debug(
      'evaluateTrainerCardOptions called',
      'TrainerCardAnalyzerService',
      {
        playerIdentifier,
        handSize: gameState.getPlayerState(playerIdentifier).hand.length,
      },
    );
    const playerState = gameState.getPlayerState(playerIdentifier);
    const options: TrainerCardOption[] = [];

    // Get all trainer cards from hand
    for (const cardId of playerState.hand) {
      const card = await getCardEntity(cardId);
      if (!card || !card.isTrainerCard()) {
        continue; // Skip non-trainer cards or missing cards
      }

      const option = await this.evaluateTrainerCard(
        cardId,
        card,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      if (option) {
        options.push(option);
      }
    }

    const sorted = sortTrainerCardOptions(options);
    this.logger.info(
      'Trainer card options evaluated',
      'TrainerCardAnalyzerService',
      {
        optionsCount: sorted.length,
        shouldPlayCount: sorted.filter((o) => o.shouldPlay).length,
      },
    );
    return sorted;
  }

  /**
   * Evaluate a single trainer card
   */
  private async evaluateTrainerCard(
    cardId: string,
    card: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<TrainerCardOption | null> {
    if (!card.trainerEffects || card.trainerEffects.length === 0) {
      return null; // No effects to evaluate
    }

    // Filter out ignored effects
    const nonIgnoredEffects = card.trainerEffects.filter(
      (effect) => !this.IGNORED_EFFECTS.includes(effect.effectType),
    );

    // Get primary effect type (highest priority)
    const primaryEffectType = this.getPrimaryEffectType(
      card.trainerEffects,
      nonIgnoredEffects,
    );
    const category = await this.categorizeTrainerCard(card);

    // Check if playing would cause deck to be empty
    const wouldCauseDeckEmpty = this.wouldCauseDeckEmpty(
      card,
      gameState,
      playerIdentifier,
    );

    // Evaluate the card based on its effects
    const evaluation = await this.evaluateCardEffects(
      card,
      nonIgnoredEffects,
      primaryEffectType,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    return {
      trainerCardId: cardId,
      trainerCard: card,
      effectTypes: nonIgnoredEffects.map((e) => e.effectType),
      primaryEffectType,
      category,
      shouldPlay: evaluation.shouldPlay,
      reason: evaluation.reason,
      targetPokemon: evaluation.targetPokemon,
      targetCard: evaluation.targetCard,
      wouldCauseDeckEmpty,
      estimatedImpact: evaluation.impact,
    };
  }

  /**
   * Get primary effect type (highest priority non-ignored effect)
   */
  private getPrimaryEffectType(
    allEffects: TrainerEffect[],
    nonIgnoredEffects: TrainerEffect[],
  ): TrainerEffectType {
    if (nonIgnoredEffects.length === 0) {
      return allEffects[0].effectType; // Fallback to first effect
    }

    let highestPriority = TrainerCardCategory.SPECIAL_EFFECTS;
    let primaryEffectType = nonIgnoredEffects[0].effectType;

    for (const effect of nonIgnoredEffects) {
      const category = this.mapEffectTypeToCategory(effect.effectType);
      if (category < highestPriority) {
        highestPriority = category;
        primaryEffectType = effect.effectType;
      }
    }

    return primaryEffectType;
  }

  /**
   * Check if playing this card would cause deck to be empty
   */
  private wouldCauseDeckEmpty(
    card: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const deckSize = playerState.deck.length;

    // Check for DRAW_CARDS effect
    const drawEffect = card.trainerEffects?.find(
      (e) => e.effectType === TrainerEffectType.DRAW_CARDS,
    );

    if (drawEffect && typeof drawEffect.value === 'number') {
      // If drawing would require drawing from empty deck, it's a lose condition
      return deckSize < drawEffect.value;
    }

    return false;
  }

  /**
   * Evaluate card effects and determine if it should be played
   */
  private async evaluateCardEffects(
    card: Card,
    effects: TrainerEffect[],
    primaryEffectType: TrainerEffectType,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Initialize impact
    const impact: TrainerCardImpact = {
      changesOpponentSureDamage: false,
      enablesKnockout: false,
      preventsOurKnockout: false,
      improvesHandSize: false,
      improvesOpponentHandSize: false,
      reducesRoundsToKnockout: false,
      increasesRoundsWeCanSurvive: false,
    };

    // Evaluate based on primary effect type
    switch (primaryEffectType) {
      case TrainerEffectType.HEAL:
        return await this.evaluateHealEffect(
          card,
          effects,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
          impact,
        );

      case TrainerEffectType.INCREASE_DAMAGE:
        return await this.evaluateIncreaseDamageEffect(
          card,
          effects,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
          impact,
        );

      case TrainerEffectType.REDUCE_DAMAGE:
        return await this.evaluateReduceDamageEffect(
          card,
          effects,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
          impact,
        );

      case TrainerEffectType.DRAW_CARDS:
        return await this.evaluateDrawCardsEffect(
          card,
          effects,
          gameState,
          playerIdentifier,
          impact,
        );

      case TrainerEffectType.REMOVE_ENERGY:
        return await this.evaluateRemoveEnergyEffect(
          card,
          effects,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
          impact,
        );

      case TrainerEffectType.OPPONENT_DRAWS:
        return await this.evaluateOpponentDrawsEffect(
          card,
          effects,
          gameState,
          playerIdentifier,
          impact,
        );

      default:
        return {
          shouldPlay: false,
          reason: 'Effect type not yet implemented',
          impact,
        };
    }
  }

  /**
   * Evaluate HEAL effect
   */
  private async evaluateHealEffect(
    card: Card,
    effects: TrainerEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const healEffect = effects.find(
      (e) => e.effectType === TrainerEffectType.HEAL,
    );
    if (!healEffect || typeof healEffect.value !== 'number') {
      return {
        shouldPlay: false,
        reason: 'Invalid heal effect',
        impact,
      };
    }

    const healAmount = healEffect.value;
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Get opponent sure attack damage
    const opponentSureDamage =
      await this.opponentAnalysisService.calculateSureAttackDamage(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

    // Check active Pokemon first
    if (
      playerState.activePokemon &&
      healEffect.target === TargetType.ACTIVE_YOURS
    ) {
      const damage =
        playerState.activePokemon.maxHp - playerState.activePokemon.currentHp;

      // Don't heal if healing amount exceeds damage
      if (healAmount > damage) {
        // Check bench Pokemon instead, but if no bench or bench can't be healed, return false
        const benchResult = await this.evaluateHealBenchPokemon(
          card,
          healAmount,
          playerState,
          cardsMap,
          getCardEntity,
          impact,
        );
        // If bench can't be healed either, return false
        if (!benchResult.shouldPlay) {
          return {
            shouldPlay: false,
            reason: 'healing amount exceeds damage counters',
            impact,
          };
        }
        return benchResult;
      }

      // Check if healing would prevent knockout
      const hpAfterHeal = playerState.activePokemon.currentHp + healAmount;
      if (hpAfterHeal > opponentSureDamage) {
        const activeCard = await getCardEntity(
          playerState.activePokemon.cardId,
        );
        impact.preventsOurKnockout = true;
        return {
          shouldPlay: true,
          reason: `heal active Pokemon to prevent knockout (${healAmount} HP)`,
          targetPokemon: playerState.activePokemon,
          targetCard: activeCard,
          impact,
        };
      } else {
        // Active would still be knocked out, check bench
        return await this.evaluateHealBenchPokemon(
          card,
          healAmount,
          playerState,
          cardsMap,
          getCardEntity,
          impact,
        );
      }
    }

    // Check bench Pokemon
    if (healEffect.target === TargetType.BENCHED_YOURS) {
      return await this.evaluateHealBenchPokemon(
        card,
        healAmount,
        playerState,
        cardsMap,
        getCardEntity,
        impact,
      );
    }

    return {
      shouldPlay: false,
      reason: 'No valid heal target',
      impact,
    };
  }

  /**
   * Evaluate healing bench Pokemon (prioritize by score)
   */
  private async evaluateHealBenchPokemon(
    card: Card,
    healAmount: number,
    playerState: PlayerGameState,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    // Score all bench Pokemon
    const benchScores: Array<{
      instance: CardInstance;
      card: Card;
      score: number;
    }> = [];

    for (const benchInstance of playerState.bench) {
      const benchCard = await getCardEntity(benchInstance.cardId);
      const damage = benchInstance.maxHp - benchInstance.currentHp;

      // Don't heal if healing amount exceeds damage
      if (healAmount > damage) {
        continue;
      }

      const score = this.pokemonScoringService.calculateScore(
        benchCard,
        benchInstance,
      );
      benchScores.push({ instance: benchInstance, card: benchCard, score });
    }

    if (benchScores.length === 0) {
      return {
        shouldPlay: false,
        reason: 'No bench Pokemon worth healing',
        impact,
      };
    }

    // Sort by score (highest first)
    benchScores.sort((a, b) => b.score - a.score);

    const bestTarget = benchScores[0];
    impact.preventsOurKnockout = true; // Healing generally helps prevent knockout
    return {
      shouldPlay: true,
      reason: `Heal bench Pokemon (${healAmount} HP)`,
      targetPokemon: bestTarget.instance,
      targetCard: bestTarget.card,
      impact,
    };
  }

  /**
   * Evaluate INCREASE_DAMAGE effect
   */
  private async evaluateIncreaseDamageEffect(
    card: Card,
    effects: TrainerEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const increaseEffect = effects.find(
      (e) => e.effectType === TrainerEffectType.INCREASE_DAMAGE,
    );
    if (!increaseEffect || typeof increaseEffect.value !== 'number') {
      return {
        shouldPlay: false,
        reason: 'Invalid increase damage effect',
        impact,
      };
    }

    const increaseAmount = increaseEffect.value;
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    if (!playerState.activePokemon || !opponentState.activePokemon) {
      return {
        shouldPlay: false,
        reason: 'No active Pokemon to attack',
        impact,
      };
    }

    // Get available attacks
    const availableAttacks =
      await this.actionPrioritizationService.findAvailableAttacks(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

    if (availableAttacks.length === 0) {
      return {
        shouldPlay: false,
        reason: 'No available attacks',
        impact,
      };
    }

    // Filter to only performable attacks
    const performableAttacks = availableAttacks.filter((a) => a.canPerform);
    if (performableAttacks.length === 0) {
      return {
        shouldPlay: false,
        reason: 'No performable attacks',
        impact,
      };
    }

    // Get best attack (highest damage)
    const bestAttack = performableAttacks[0];
    const baseDamage = bestAttack.baseDamage;
    const totalDamage = baseDamage + increaseAmount;

    // Check if it enables knockout
    const opponentHp = opponentState.activePokemon.currentHp;
    if (totalDamage >= opponentHp && baseDamage < opponentHp) {
      impact.enablesKnockout = true;
      // Enabling knockout also reduces rounds (from multiple rounds to 1)
      const roundsWithoutIncrease = this.calculateRoundsToKnockout(
        opponentHp,
        baseDamage,
      );
      if (roundsWithoutIncrease > 1) {
        impact.reducesRoundsToKnockout = true;
      }
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      return {
        shouldPlay: true,
        reason: `Increase damage to enable knockout (${increaseAmount} bonus)`,
        targetPokemon: playerState.activePokemon,
        targetCard: activeCard,
        impact,
      };
    }

    // Check if attack already causes knockout without increase
    if (baseDamage >= opponentHp) {
      return {
        shouldPlay: false,
        reason: 'Attack already causes knockout without increase',
        impact,
      };
    }

    // Check if it reduces rounds to knockout
    // INCREASE_DAMAGE only applies to the first attack, then subsequent attacks use base damage
    // Calculate actual rounds by simulating damage
    const roundsWithoutIncrease = this.calculateRoundsToKnockout(
      opponentHp,
      baseDamage,
    );
    const roundsWithIncrease =
      this.calculateRoundsToKnockoutWithFirstAttackBonus(
        opponentHp,
        baseDamage,
        increaseAmount,
      );

    if (
      isFinite(roundsWithoutIncrease) &&
      isFinite(roundsWithIncrease) &&
      roundsWithIncrease < roundsWithoutIncrease
    ) {
      impact.reducesRoundsToKnockout = true;
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      return {
        shouldPlay: true,
        reason: `Increase damage to reduce rounds to knockout (${roundsWithoutIncrease} -> ${roundsWithIncrease})`,
        targetPokemon: playerState.activePokemon,
        targetCard: activeCard,
        impact,
      };
    }

    return {
      shouldPlay: false,
      reason: 'Increase damage does not reduce rounds to knockout',
      impact,
    };
  }

  /**
   * Evaluate REDUCE_DAMAGE effect
   */
  private async evaluateReduceDamageEffect(
    card: Card,
    effects: TrainerEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const reduceEffect = effects.find(
      (e) => e.effectType === TrainerEffectType.REDUCE_DAMAGE,
    );
    if (!reduceEffect || typeof reduceEffect.value !== 'number') {
      return {
        shouldPlay: false,
        reason: 'Invalid reduce damage effect',
        impact,
      };
    }

    const reduceAmount = reduceEffect.value;
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    if (!playerState.activePokemon) {
      return {
        shouldPlay: false,
        reason: 'No active Pokemon to protect',
        impact,
      };
    }

    // Get opponent sure attack damage
    const opponentSureDamage =
      await this.opponentAnalysisService.calculateSureAttackDamage(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

    if (opponentSureDamage === 0) {
      return {
        shouldPlay: false,
        reason: 'Opponent cannot deal damage',
        impact,
      };
    }

    const playerHp = playerState.activePokemon.currentHp;
    const damageAfterReduction = Math.max(0, opponentSureDamage - reduceAmount);

    // Check if it prevents knockout
    if (damageAfterReduction < playerHp && opponentSureDamage >= playerHp) {
      impact.preventsOurKnockout = true;
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      return {
        shouldPlay: true,
        reason: `Reduce damage to prevent knockout (${reduceAmount} reduction)`,
        targetPokemon: playerState.activePokemon,
        targetCard: activeCard,
        impact,
      };
    }

    // Check if it increases rounds we can survive
    // REDUCE_DAMAGE applies to all attacks (damage reduction tool like Defender)
    // Calculate actual rounds by simulating damage
    const roundsWithoutReduction = this.calculateRoundsToKnockout(
      playerHp,
      opponentSureDamage,
    );
    const roundsWithReduction =
      damageAfterReduction > 0
        ? this.calculateRoundsToKnockout(playerHp, damageAfterReduction)
        : Infinity;

    if (roundsWithReduction > roundsWithoutReduction) {
      impact.increasesRoundsWeCanSurvive = true;
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      return {
        shouldPlay: true,
        reason: `Reduce damage to increase survival rounds (${roundsWithoutReduction} -> ${roundsWithReduction})`,
        targetPokemon: playerState.activePokemon,
        targetCard: activeCard,
        impact,
      };
    }

    return {
      shouldPlay: false,
      reason: 'Reduce damage does not increase survival rounds',
      impact,
    };
  }

  /**
   * Evaluate DRAW_CARDS effect
   */
  private async evaluateDrawCardsEffect(
    card: Card,
    effects: TrainerEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Always play if deck has cards and no side effects
    // (Side effects would be other non-ignored effects)
    const hasSideEffects = effects.some(
      (e) => e.effectType !== TrainerEffectType.DRAW_CARDS,
    );

    if (playerState.deck.length > 0 && !hasSideEffects) {
      impact.improvesHandSize = true;
      return {
        shouldPlay: true,
        reason: 'Draw cards to improve hand size',
        impact,
      };
    }

    return {
      shouldPlay: false,
      reason: 'Cannot draw cards or has side effects',
      impact,
    };
  }

  /**
   * Evaluate REMOVE_ENERGY effect
   */
  private async evaluateRemoveEnergyEffect(
    card: Card,
    effects: TrainerEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const removeEffect = effects.find(
      (e) => e.effectType === TrainerEffectType.REMOVE_ENERGY,
    );
    if (!removeEffect) {
      return {
        shouldPlay: false,
        reason: 'Invalid remove energy effect',
        impact,
      };
    }

    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Find opponent Pokemon with highest damage attack
    let bestTarget: CardInstance | null = null;
    let bestTargetCard: Card | null = null;
    let maxDamage = 0;

    // Check active Pokemon
    if (opponentState.activePokemon) {
      const activeCard = await getCardEntity(
        opponentState.activePokemon.cardId,
      );
      const damage = await this.getMaxDamageFromPokemon(
        opponentState.activePokemon,
        activeCard,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      if (damage > maxDamage) {
        maxDamage = damage;
        bestTarget = opponentState.activePokemon;
        bestTargetCard = activeCard;
      }
    }

    // Check bench Pokemon
    for (const benchInstance of opponentState.bench) {
      const benchCard = await getCardEntity(benchInstance.cardId);
      const damage = await this.getMaxDamageFromPokemon(
        benchInstance,
        benchCard,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      if (damage > maxDamage) {
        maxDamage = damage;
        bestTarget = benchInstance;
        bestTargetCard = benchCard;
      }
    }

    if (bestTarget && bestTargetCard) {
      impact.changesOpponentSureDamage = true;
      return {
        shouldPlay: true,
        reason: `Remove energy from opponent's highest damage Pokemon`,
        targetPokemon: bestTarget,
        targetCard: bestTargetCard,
        impact,
      };
    }

    return {
      shouldPlay: false,
      reason: 'No valid target for energy removal',
      impact,
    };
  }

  /**
   * Get maximum damage from a Pokemon (sure attack damage)
   */
  private async getMaxDamageFromPokemon(
    pokemon: CardInstance,
    card: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    if (!card.attacks || card.attacks.length === 0) {
      return 0;
    }

    let maxDamage = 0;

    for (const attack of card.attacks) {
      // Parse base damage
      const baseDamage = this.parseBaseDamage(attack.damage);
      if (baseDamage === 0) {
        continue;
      }

      // For simplicity, return base damage (sure attack damage)
      // In a full implementation, we'd calculate with weakness/resistance
      maxDamage = Math.max(maxDamage, baseDamage);
    }

    return maxDamage;
  }

  /**
   * Evaluate OPPONENT_DRAWS effect
   */
  private async evaluateOpponentDrawsEffect(
    card: Card,
    effects: TrainerEffect[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    impact: TrainerCardImpact,
  ): Promise<{
    shouldPlay: boolean;
    reason: string;
    targetPokemon?: CardInstance;
    targetCard?: Card;
    impact: TrainerCardImpact;
  }> {
    const opponentDrawsEffect = effects.find(
      (e) => e.effectType === TrainerEffectType.OPPONENT_DRAWS,
    );
    if (!opponentDrawsEffect || typeof opponentDrawsEffect.value !== 'number') {
      return {
        shouldPlay: false,
        reason: 'Invalid opponent draws effect',
        impact,
      };
    }

    const opponentState = gameState.getOpponentState(playerIdentifier);
    const currentOpponentHandSize = opponentState.hand.length;
    const cardsToDraw = opponentDrawsEffect.value;
    const newOpponentHandSize = currentOpponentHandSize + cardsToDraw;

    // Don't play if it gives opponent more cards than they would have without it
    // (This is a simplified check - in reality, we'd compare to expected hand size)
    if (newOpponentHandSize > currentOpponentHandSize) {
      impact.improvesOpponentHandSize = true;
      return {
        shouldPlay: false,
        reason: 'Would give opponent more cards in hand',
        impact,
      };
    }

    return {
      shouldPlay: false,
      reason: 'Opponent draws effect not beneficial',
      impact,
    };
  }

  /**
   * Calculate rounds to knockout by simulating damage
   * Returns the number of rounds needed to reduce HP to 0 or below
   */
  private calculateRoundsToKnockout(
    hp: number,
    damagePerRound: number,
  ): number {
    if (damagePerRound <= 0) {
      return Infinity; // Cannot knockout with 0 or negative damage
    }

    let remainingHp = hp;
    let rounds = 0;

    while (remainingHp > 0) {
      remainingHp -= damagePerRound;
      rounds++;
    }

    return rounds;
  }

  /**
   * Calculate rounds to knockout with first attack having bonus damage
   * First attack does (baseDamage + bonus), subsequent attacks do baseDamage
   */
  private calculateRoundsToKnockoutWithFirstAttackBonus(
    hp: number,
    baseDamage: number,
    bonusDamage: number,
  ): number {
    if (baseDamage <= 0) {
      return Infinity;
    }

    let remainingHp = hp;
    let rounds = 0;

    // First attack with bonus
    remainingHp -= baseDamage + bonusDamage;
    rounds++;

    // Subsequent attacks with base damage
    while (remainingHp > 0) {
      remainingHp -= baseDamage;
      rounds++;
    }

    return rounds;
  }

  /**
   * Parse base damage from damage string
   */
  private parseBaseDamage(damage: string): number {
    if (!damage || damage === '') {
      return 0;
    }

    // Remove + and - suffixes for now (simplified)
    const cleanDamage = damage.replace(/[+\-*x]/g, '');
    const parsed = parseInt(cleanDamage, 10);

    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Evaluate switch/retreat strategy
   * Determines if the player should switch their active Pokemon with a benched one
   */
  async evaluateSwitchRetreatStrategy(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<SwitchRetreatOption | null> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const activePokemon = playerState.activePokemon;

    // Must have an active Pokemon
    if (!activePokemon) {
      return null;
    }

    // Must have bench Pokemon to switch to
    if (!playerState.bench || playerState.bench.length === 0) {
      return null;
    }

    // Quick check: Can Pokemon retreat?
    const canRetreat = await this.canPokemonRetreat(
      activePokemon,
      cardsMap,
      getCardEntity,
    );

    if (!canRetreat.canRetreat) {
      return {
        shouldSwitch: false,
        reason: canRetreat.reason,
        shouldUseTrainerCard: false,
        retreatCost: 0,
        canAffordRetreat: false,
        priority: SwitchRetreatPriority.HIGH,
      };
    }

    // Get active Pokemon card
    const activeCard = await getCardEntity(activePokemon.cardId);

    // Evaluate if switching is beneficial
    const shouldConsider = await this.shouldConsiderSwitching(
      gameState,
      playerIdentifier,
      activePokemon,
      activeCard,
      playerState.bench,
      cardsMap,
      getCardEntity,
    );

    if (!shouldConsider.shouldConsider) {
      return {
        shouldSwitch: false,
        reason: shouldConsider.reason,
        shouldUseTrainerCard: false,
        retreatCost: 0,
        canAffordRetreat: false,
        priority: SwitchRetreatPriority.LOW,
      };
    }

    // Find best bench Pokemon for switching
    const bestBench = shouldConsider.bestBenchOption;
    if (!bestBench) {
      return {
        shouldSwitch: false,
        reason: 'No suitable bench Pokemon found',
        shouldUseTrainerCard: false,
        retreatCost: 0,
        canAffordRetreat: false,
        priority: SwitchRetreatPriority.LOW,
      };
    }

    const benchCard = await getCardEntity(bestBench.cardId);

    // Check for trainer card switch assistance
    const switchTrainerCard = await this.findSwitchTrainerCard(
      playerState.hand,
      cardsMap,
    );

    // Calculate retreat cost
    const retreatCostInfo = await this.evaluateRetreatCost(
      activePokemon,
      activeCard,
      switchTrainerCard,
    );

    // Determine priority
    const priority = this.determinePriority(
      retreatCostInfo,
      shouldConsider.isGameLosingScenario,
      switchTrainerCard !== null,
    );

    // Check if bench Pokemon will survive
    const benchWillSurvive = await this.willBenchPokemonSurvive(
      bestBench,
      benchCard,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    return {
      shouldSwitch: true,
      reason: shouldConsider.reason,
      targetPokemon: bestBench,
      targetCard: benchCard,
      shouldUseTrainerCard: switchTrainerCard !== null,
      trainerCardId: switchTrainerCard?.cardId,
      retreatCost: retreatCostInfo.cost,
      canAffordRetreat: retreatCostInfo.canAfford,
      priority,
      isGameLosingScenario: shouldConsider.isGameLosingScenario,
      benchPokemonWillSurvive: benchWillSurvive,
    };
  }

  /**
   * Check if Pokemon can retreat (status effects, card rules)
   */
  private async canPokemonRetreat(
    pokemon: CardInstance,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ canRetreat: boolean; reason: string }> {
    // Check status effects
    if (pokemon.hasStatusEffect(StatusEffect.PARALYZED)) {
      return {
        canRetreat: false,
        reason: 'Cannot retreat while Paralyzed',
      };
    }

    // Check card rules
    const card = await getCardEntity(pokemon.cardId);
    if (!card.canRetreat()) {
      return {
        canRetreat: false,
        reason: 'This Pokemon cannot retreat due to card rule',
      };
    }

    return { canRetreat: true, reason: '' };
  }

  /**
   * Determine if switching should be considered
   */
  private async shouldConsiderSwitching(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    activePokemon: CardInstance,
    activeCard: Card,
    bench: CardInstance[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{
    shouldConsider: boolean;
    reason: string;
    bestBenchOption?: CardInstance;
    isGameLosingScenario?: boolean;
  }> {
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const opponentActive = opponentState.activePokemon;

    if (!opponentActive) {
      return {
        shouldConsider: false,
        reason: 'No opponent active Pokemon',
      };
    }

    const opponentCard = await getCardEntity(opponentActive.cardId);

    // Check if active will be knocked out next turn
    const activeWillBeKnockedOut =
      await this.opponentAnalysisService.canOpponentKnockout(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

    // Get player state for prize card checks
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check game-losing scenario (next knockout would lose)
    const prizeCardsRemaining = playerState.getPrizeCardsRemaining();
    const isGameLosingScenario =
      activeWillBeKnockedOut && prizeCardsRemaining === 1;

    // Find best bench Pokemon
    const bestBench = await this.findBestBenchPokemonForSwitch(
      bench,
      opponentActive,
      opponentCard,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    if (!bestBench) {
      return {
        shouldConsider: false,
        reason: 'No suitable bench Pokemon found',
      };
    }

    // Check if bench can knockout opponent
    const benchCanKnockout = await this.canPokemonKnockout(
      bestBench.pokemon,
      bestBench.card,
      opponentActive,
      opponentCard,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Check if active can knockout opponent
    const activeCanKnockout = await this.canPokemonKnockout(
      activePokemon,
      activeCard,
      opponentActive,
      opponentCard,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Check win condition (knocking out opponent would win)
    // If player has 1 prize card remaining, knocking out opponent = win
    const playerPrizeCardsRemaining = playerState.getPrizeCardsRemaining();
    const opponentPrizeCardsRemaining = opponentState.getPrizeCardsRemaining();
    const wouldWin = playerPrizeCardsRemaining === 1;

    // Priority scenarios:
    // 1. Win condition - prefer faster win (check BEFORE game-losing scenario when wouldWin is true)
    if (wouldWin) {
      // If only bench can knockout, switch
      if (benchCanKnockout && !activeCanKnockout) {
        return {
          shouldConsider: true,
          reason:
            'Switching to bench Pokemon for faster win (1 prize remaining)',
          bestBenchOption: bestBench.pokemon,
        };
      }
      // If only active can knockout, don't switch
      if (activeCanKnockout && !benchCanKnockout) {
        return {
          shouldConsider: false,
          reason:
            'Active can win this turn (1 prize remaining), no need to switch',
        };
      }
      // If both can knockout, compare rounds to knockout
      if (activeCanKnockout && benchCanKnockout) {
        const activeRounds = await this.calculateRoundsToKnockoutForPokemon(
          activePokemon,
          activeCard,
          opponentActive,
          opponentCard,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );
        const benchRounds = await this.calculateRoundsToKnockoutForPokemon(
          bestBench.pokemon,
          bestBench.card,
          opponentActive,
          opponentCard,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );

        // Check if bench requires coin toss
        const benchRequiresCoinToss = await this.requiresCoinToss(
          bestBench.pokemon,
          bestBench.card,
          opponentActive,
          opponentCard,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );

        // If bench is faster (fewer rounds) and doesn't require coin toss, switch
        if (benchRounds < activeRounds && !benchRequiresCoinToss) {
          return {
            shouldConsider: true,
            reason:
              'Switching to bench Pokemon for faster win (1 prize remaining)',
            bestBenchOption: bestBench.pokemon,
          };
        }

        // If active is faster or same speed, OR bench requires coin toss, prefer active
        if (activeRounds <= benchRounds || benchRequiresCoinToss) {
          return {
            shouldConsider: false,
            reason: benchRequiresCoinToss
              ? 'Prefer guaranteed win from active over coin toss win from bench (1 prize remaining)'
              : 'Active can win faster or same speed, prefer guaranteed win (1 prize remaining)',
          };
        }
        // If bench is faster and doesn't require coin toss, switch (already handled above)
        // This should never be reached, but add as safety
        return {
          shouldConsider: true,
          reason:
            'Switching to bench Pokemon for faster win (1 prize remaining)',
          bestBenchOption: bestBench.pokemon,
        };
      }
      // Safety check: if wouldWin is true and we have at least one knockout option,
      // we should have returned above. If not, something went wrong.
      // Default to not switching if active can knockout, switch if only bench can
      if (activeCanKnockout) {
        return {
          shouldConsider: false,
          reason:
            'Active can win this turn (1 prize remaining), no need to switch',
        };
      }
      if (benchCanKnockout) {
        return {
          shouldConsider: true,
          reason:
            'Switching to bench Pokemon for faster win (1 prize remaining)',
          bestBenchOption: bestBench.pokemon,
        };
      }
      // If wouldWin but neither can knockout, handle game-losing scenario if applicable
      // (This should be rare - if we can't knockout, we can't win, but we might need to survive)
      if (isGameLosingScenario && !activeCanKnockout && !benchCanKnockout) {
        if (bestBench.willSurvive) {
          return {
            shouldConsider: true,
            reason:
              'Next knockout would lose the game, switching to bench Pokemon that will survive',
            bestBenchOption: bestBench.pokemon,
            isGameLosingScenario: true,
          };
        } else {
          return {
            shouldConsider: false,
            reason:
              'Bench Pokemon will also be knocked out next turn, no point switching',
            isGameLosingScenario: true,
          };
        }
      }
      // If wouldWin and at least one can knockout, we should have returned above
      // If we reach here, something unexpected happened - fall through to other checks
    }

    // 2. Game-losing scenario - must switch if bench will survive (only if not a win condition)
    // Note: If wouldWin is true, win conditions are already handled above
    if (isGameLosingScenario && !wouldWin) {
      if (bestBench.willSurvive) {
        return {
          shouldConsider: true,
          reason:
            'Next knockout would lose the game, switching to bench Pokemon that will survive',
          bestBenchOption: bestBench.pokemon,
          isGameLosingScenario: true,
        };
      } else {
        // Bench will also be knocked out - no point switching
        return {
          shouldConsider: false,
          reason:
            'Bench Pokemon will also be knocked out next turn, no point switching',
          isGameLosingScenario: true,
        };
      }
    }

    // 3. Bench can knockout and active cannot
    if (benchCanKnockout && !activeCanKnockout) {
      return {
        shouldConsider: true,
        reason: wouldWin
          ? 'Bench Pokemon can knockout opponent for win (1 prize remaining), active cannot'
          : 'Bench Pokemon can knockout opponent, active cannot',
        bestBenchOption: bestBench.pokemon,
      };
    }

    // 4. Can knockout in 2 turns with active and not threatened - don't switch
    // Check this before "active will be knocked out" to prioritize it
    // Don't require activeCanKnockout (which only checks 1-round knockouts)
    // Instead, calculate rounds directly to handle multi-round knockouts
    if (!activeWillBeKnockedOut && !wouldWin) {
      // Check if active has any attacks (can potentially knockout)
      if (activeCard.attacks && activeCard.attacks.length > 0) {
        const roundsToKnockout = await this.calculateRoundsToKnockoutForPokemon(
          activePokemon,
          activeCard,
          opponentActive,
          opponentCard,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );
        // If active can knockout in 2 rounds or less (finite number means can eventually knockout)
        if (isFinite(roundsToKnockout) && roundsToKnockout <= 2) {
          return {
            shouldConsider: false,
            reason:
              'Can knockout opponent in 2 turns with active and not threatened',
          };
        }
      }
    }

    // 5. Active will be knocked out and bench can do same or better damage
    if (activeWillBeKnockedOut) {
      const activeDamage = await this.getMaxDamage(
        activePokemon,
        activeCard,
        opponentActive,
        opponentCard,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );
      const benchDamage = await this.getMaxDamage(
        bestBench.pokemon,
        bestBench.card,
        opponentActive,
        opponentCard,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      if (benchDamage >= activeDamage) {
        return {
          shouldConsider: true,
          reason:
            'Active will be knocked out next turn, bench can do same or better damage (knockout)',
          bestBenchOption: bestBench.pokemon,
        };
      }
    }

    return {
      shouldConsider: false,
      reason: 'No compelling reason to switch',
    };
  }

  /**
   * Find best bench Pokemon for switching
   */
  private async findBestBenchPokemonForSwitch(
    bench: CardInstance[],
    opponentActive: CardInstance,
    opponentCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{
    pokemon: CardInstance;
    card: Card;
    willSurvive: boolean;
  } | null> {
    let bestBench: {
      pokemon: CardInstance;
      card: Card;
      willSurvive: boolean;
      score: number;
    } | null = null;

    for (const benchPokemon of bench) {
      const benchCard = await getCardEntity(benchPokemon.cardId);

      // Check if can knockout
      const canKnockout = await this.canPokemonKnockout(
        benchPokemon,
        benchCard,
        opponentActive,
        opponentCard,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      // Check if will survive
      const willSurvive = await this.willBenchPokemonSurvive(
        benchPokemon,
        benchCard,
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      // Get Pokemon score
      const scoreResult = this.pokemonScoringService.scorePokemon(
        benchPokemon,
        benchCard,
      );

      // Prioritize: can knockout > will survive > score
      const priorityScore =
        (canKnockout ? 1000 : 0) + (willSurvive ? 100 : 0) + scoreResult.score;

      if (!bestBench || priorityScore > bestBench.score) {
        bestBench = {
          pokemon: benchPokemon,
          card: benchCard,
          willSurvive,
          score: priorityScore,
        };
      }
    }

    return bestBench
      ? {
          pokemon: bestBench.pokemon,
          card: bestBench.card,
          willSurvive: bestBench.willSurvive,
        }
      : null;
  }

  /**
   * Check if Pokemon can knockout opponent
   */
  private async canPokemonKnockout(
    pokemon: CardInstance,
    pokemonCard: Card,
    targetPokemon: CardInstance,
    targetCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<boolean> {
    if (!pokemonCard.attacks || pokemonCard.attacks.length === 0) {
      return false;
    }

    // Get energy card data
    const energyCardData = this.getEnergyCardData(
      pokemon.attachedEnergy || [],
      cardsMap,
    );

    // Check each attack
    for (const attack of pokemonCard.attacks) {
      // Check if attack can be performed (energy requirements)
      const energyValidation =
        this.attackEnergyValidatorService.validateEnergyRequirements(
          attack,
          energyCardData,
        );

      if (!energyValidation.isValid) {
        continue; // Cannot perform this attack
      }

      // Parse base damage
      const baseDamage = this.parseBaseDamage(attack.damage || '');

      // Check if base damage can knockout (simplified - in full implementation would calculate final damage)
      if (baseDamage >= targetPokemon.currentHp) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get maximum damage Pokemon can deal
   */
  private async getMaxDamage(
    pokemon: CardInstance,
    pokemonCard: Card,
    targetPokemon: CardInstance,
    targetCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    if (!pokemonCard.attacks || pokemonCard.attacks.length === 0) {
      return 0;
    }

    // Get energy card data
    const energyCardData = this.getEnergyCardData(
      pokemon.attachedEnergy || [],
      cardsMap,
    );

    let maxDamage = 0;

    // Check each attack
    for (const attack of pokemonCard.attacks) {
      // Check if attack can be performed (energy requirements)
      const energyValidation =
        this.attackEnergyValidatorService.validateEnergyRequirements(
          attack,
          energyCardData,
        );

      if (!energyValidation.isValid) {
        continue; // Cannot perform this attack
      }

      // Parse base damage
      const baseDamage = this.parseBaseDamage(attack.damage || '');
      maxDamage = Math.max(maxDamage, baseDamage);
    }

    return maxDamage;
  }

  /**
   * Check if attack requires coin toss
   */
  private async requiresCoinToss(
    pokemon: CardInstance,
    pokemonCard: Card,
    targetPokemon: CardInstance,
    targetCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<boolean> {
    if (!pokemonCard.attacks || pokemonCard.attacks.length === 0) {
      return false;
    }

    // Get energy card data
    const energyCardData = this.getEnergyCardData(
      pokemon.attachedEnergy || [],
      cardsMap,
    );

    // Check each attack
    for (const attack of pokemonCard.attacks) {
      // Check if attack can be performed
      const energyValidation =
        this.attackEnergyValidatorService.validateEnergyRequirements(
          attack,
          energyCardData,
        );

      if (!energyValidation.isValid) {
        continue;
      }

      // Check if attack has coin flip preconditions
      if (attack.hasPreconditions()) {
        const coinFlips = attack.getPreconditionsByType(
          PreconditionType.COIN_FLIP,
        );
        if (coinFlips.length > 0) {
          return true;
        }
      }

      // Also check attack text for coin flip keywords
      const attackText = attack.text?.toLowerCase() || '';
      if (
        attackText.includes('flip') ||
        attackText.includes('coin') ||
        attackText.includes('heads') ||
        attackText.includes('tails')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate rounds to knockout for a Pokemon against a target
   * Uses Pokemon instances and game state to determine damage
   */
  private async calculateRoundsToKnockoutForPokemon(
    pokemon: CardInstance,
    pokemonCard: Card,
    targetPokemon: CardInstance,
    targetCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    const maxDamage = await this.getMaxDamage(
      pokemon,
      pokemonCard,
      targetPokemon,
      targetCard,
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    if (maxDamage <= 0) {
      return Infinity;
    }

    return Math.ceil(targetPokemon.currentHp / maxDamage);
  }

  /**
   * Check if bench Pokemon will survive opponent's next attack
   */
  private async willBenchPokemonSurvive(
    benchPokemon: CardInstance,
    benchCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<boolean> {
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const opponentActive = opponentState.activePokemon;

    if (!opponentActive) {
      return true; // No opponent to attack
    }

    const opponentCard = await getCardEntity(opponentActive.cardId);

    // Calculate opponent's max damage against bench Pokemon
    // Get opponent's identifier
    const opponentIdentifier =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? PlayerIdentifier.PLAYER2
        : PlayerIdentifier.PLAYER1;

    // Calculate opponent's max damage
    const opponentMaxDamage = await this.getMaxDamage(
      opponentActive,
      opponentCard,
      benchPokemon,
      benchCard,
      gameState,
      opponentIdentifier,
      cardsMap,
      getCardEntity,
    );

    return opponentMaxDamage < benchPokemon.currentHp;
  }

  /**
   * Find switch trainer card in hand
   */
  private async findSwitchTrainerCard(
    hand: string[],
    cardsMap: Map<string, Card>,
  ): Promise<{ cardId: string; card: Card } | null> {
    for (const cardId of hand) {
      const card = cardsMap.get(cardId);
      if (!card || !card.isTrainerCard()) {
        continue;
      }

      // Check if card has SWITCH_ACTIVE effect
      if (
        card.trainerEffects?.some(
          (effect) => effect.effectType === TrainerEffectType.SWITCH_ACTIVE,
        )
      ) {
        return { cardId, card };
      }
    }

    return null;
  }

  /**
   * Evaluate retreat cost
   */
  private async evaluateRetreatCost(
    activePokemon: CardInstance,
    activeCard: Card,
    switchTrainerCard: { cardId: string; card: Card } | null,
  ): Promise<{ cost: number; canAfford: boolean }> {
    // If trainer card available, retreat is free
    if (switchTrainerCard) {
      return { cost: 0, canAfford: true };
    }

    // Check for free retreat rule
    if (activeCard.hasRuleType(CardRuleType.FREE_RETREAT)) {
      return { cost: 0, canAfford: true };
    }

    // Get retreat cost from card
    const retreatCost = activeCard.retreatCost || 0;
    const attachedEnergyCount = activePokemon.attachedEnergy?.length || 0;
    const canAfford = attachedEnergyCount >= retreatCost;

    return { cost: retreatCost, canAfford };
  }

  /**
   * Determine priority
   */
  private determinePriority(
    retreatCostInfo: { cost: number; canAfford: boolean },
    isGameLosingScenario?: boolean,
    hasTrainerCard?: boolean,
  ): SwitchRetreatPriority {
    // High priority: free retreat or game-losing scenario
    if (retreatCostInfo.cost === 0 || isGameLosingScenario) {
      return SwitchRetreatPriority.HIGH;
    }

    // Medium priority: trainer card available or affordable energy retreat
    if (hasTrainerCard || retreatCostInfo.canAfford) {
      return SwitchRetreatPriority.MEDIUM;
    }

    // Low priority: energy retreat with cost
    return SwitchRetreatPriority.LOW;
  }

  /**
   * Get energy card data from energy card IDs
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
}
