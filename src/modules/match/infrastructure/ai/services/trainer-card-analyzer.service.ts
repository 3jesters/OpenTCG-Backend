import { Injectable } from '@nestjs/common';
import { GameState, PlayerGameState, CardInstance } from '../../../domain/value-objects';
import { PlayerIdentifier, PokemonPosition } from '../../../domain/enums';
import { Card } from '../../../../card/domain/entities';
import { TrainerEffect } from '../../../../card/domain/value-objects';
import { TrainerEffectType } from '../../../../card/domain/enums';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { ActionPrioritizationService } from './action-prioritization.service';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import {
  TrainerCardCategory,
  TrainerCardOption,
  TrainerCardImpact,
  SortedTrainerCardOptionList,
} from '../types/action-analysis.types';
import { sortTrainerCardOptions } from '../utils/sorting.utils';

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
  private mapEffectTypeToCategory(effectType: TrainerEffectType): TrainerCardCategory {
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

    return sortTrainerCardOptions(options);
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
    const primaryEffectType = this.getPrimaryEffectType(card.trainerEffects, nonIgnoredEffects);
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
    const healEffect = effects.find((e) => e.effectType === TrainerEffectType.HEAL);
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
    const opponentSureDamage = await this.opponentAnalysisService.calculateSureAttackDamage(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Check active Pokemon first
    if (playerState.activePokemon && healEffect.target === TargetType.ACTIVE_YOURS) {
      const damage = playerState.activePokemon.maxHp - playerState.activePokemon.currentHp;

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
        const activeCard = await getCardEntity(playerState.activePokemon.cardId);
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
    const benchScores: Array<{ instance: CardInstance; card: Card; score: number }> = [];

    for (const benchInstance of playerState.bench) {
      const benchCard = await getCardEntity(benchInstance.cardId);
      const damage = benchInstance.maxHp - benchInstance.currentHp;

      // Don't heal if healing amount exceeds damage
      if (healAmount > damage) {
        continue;
      }

      const score = this.pokemonScoringService.calculateScore(benchCard, benchInstance);
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
    const increaseEffect = effects.find((e) => e.effectType === TrainerEffectType.INCREASE_DAMAGE);
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
    const availableAttacks = await this.actionPrioritizationService.findAvailableAttacks(
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

    // Get best attack (highest damage)
    const bestAttack = availableAttacks[0];
    const baseDamage = bestAttack.baseDamage;
    const totalDamage = baseDamage + increaseAmount;

    // Check if it enables knockout
    const opponentHp = opponentState.activePokemon.currentHp;
    if (totalDamage >= opponentHp && baseDamage < opponentHp) {
      impact.enablesKnockout = true;
      // Enabling knockout also reduces rounds (from multiple rounds to 1)
      const roundsWithoutIncrease = this.calculateRoundsToKnockout(opponentHp, baseDamage);
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
    const roundsWithoutIncrease = this.calculateRoundsToKnockout(opponentHp, baseDamage);
    const roundsWithIncrease = this.calculateRoundsToKnockoutWithFirstAttackBonus(
      opponentHp,
      baseDamage,
      increaseAmount,
    );

    if (roundsWithIncrease < roundsWithoutIncrease) {
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
    const reduceEffect = effects.find((e) => e.effectType === TrainerEffectType.REDUCE_DAMAGE);
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
    const opponentSureDamage = await this.opponentAnalysisService.calculateSureAttackDamage(
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
    const roundsWithoutReduction = this.calculateRoundsToKnockout(playerHp, opponentSureDamage);
    const roundsWithReduction = damageAfterReduction > 0 
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
    const removeEffect = effects.find((e) => e.effectType === TrainerEffectType.REMOVE_ENERGY);
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
      const activeCard = await getCardEntity(opponentState.activePokemon.cardId);
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
  private calculateRoundsToKnockout(hp: number, damagePerRound: number): number {
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
    remainingHp -= (baseDamage + bonusDamage);
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
}
