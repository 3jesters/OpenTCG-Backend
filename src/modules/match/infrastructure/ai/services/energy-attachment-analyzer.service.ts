import { Injectable, Inject } from '@nestjs/common';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../../domain/value-objects';
import { PlayerIdentifier, PokemonPosition } from '../../../domain/enums';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { EnergyType, CardType } from '../../../../card/domain/enums';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import { ActionPrioritizationService } from './action-prioritization.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import { OpponentAnalysisService } from './opponent-analysis.service';
import {
  EnergyAttachmentOption,
  SortedEnergyAttachmentOptionList,
} from '../types/action-analysis.types';
import { sortEnergyAttachmentOptions } from '../utils/sorting.utils';
import { ILogger } from '../../../../../shared/application/ports/logger.interface';

/**
 * Energy Attachment Analyzer Service
 * Analyzes energy attachment options and determines optimal attachments
 */
@Injectable()
export class EnergyAttachmentAnalyzerService {
  constructor(
    private readonly actionPrioritizationService: ActionPrioritizationService,
    private readonly attackEnergyValidatorService: AttackEnergyValidatorService,
    private readonly attackDamageCalculationService: AttackDamageCalculationService,
    private readonly pokemonScoringService: PokemonScoringService,
    private readonly opponentAnalysisService: OpponentAnalysisService,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  /**
   * Find unique energy types in hand
   * Returns array of unique energy types (one per type, not per card)
   */
  async findUniqueEnergyTypes(
    handCardIds: string[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<EnergyType[]> {
    const uniqueTypes = new Set<EnergyType>();

    for (const cardId of handCardIds) {
      let card = cardsMap.get(cardId);
      if (!card) {
        card = await getCardEntity(cardId);
      }
      if (card && card.cardType === CardType.ENERGY) {
        if (card.energyType) {
          uniqueTypes.add(card.energyType);
        }
        // For special energy cards (like Double Colorless), also add COLORLESS
        if (card.energyProvision) {
          card.energyProvision.energyTypes.forEach((type) => {
            uniqueTypes.add(type);
          });
        }
      }
    }

    return Array.from(uniqueTypes);
  }

  /**
   * Evaluate all energy attachment options
   * Returns sorted list of attachment options with priority scores
   */
  async evaluateAttachmentOptions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<SortedEnergyAttachmentOptionList> {
    this.logger.debug(
      'evaluateAttachmentOptions called',
      'EnergyAttachmentAnalyzerService',
      {
        playerIdentifier,
        handSize: gameState.getPlayerState(playerIdentifier).hand.length,
      },
    );

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Get unique energy types from hand
    const uniqueEnergyTypes = await this.findUniqueEnergyTypes(
      playerState.hand,
      cardsMap,
      getCardEntity,
    );

    this.logger.debug(
      'Unique energy types found',
      'EnergyAttachmentAnalyzerService',
      {
        uniqueEnergyTypes,
        count: uniqueEnergyTypes.length,
      },
    );

    if (uniqueEnergyTypes.length === 0) {
      this.logger.debug(
        'No energy types in hand, returning empty array',
        'EnergyAttachmentAnalyzerService',
      );
      return [];
    }

    // Get all energy cards from hand
    const energyCardsInHand: Array<{ cardId: string; card: Card }> = [];
    for (const cardId of playerState.hand) {
      let card = cardsMap.get(cardId);
      if (!card) {
        card = await getCardEntity(cardId);
      }
      if (card.cardType === CardType.ENERGY) {
        energyCardsInHand.push({ cardId, card });
      }
    }

    if (energyCardsInHand.length === 0) {
      this.logger.debug(
        'No energy cards in hand, returning empty array',
        'EnergyAttachmentAnalyzerService',
      );
      return [];
    }

    // Assess opponent threat
    const opponentThreat =
      await this.opponentAnalysisService.analyzeOpponentThreat(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

    const options: EnergyAttachmentOption[] = [];

    // Collect all Pokemon (active + bench) with their scores
    const pokemonWithScores: Array<{
      pokemon: CardInstance;
      card: Card;
      position: PokemonPosition;
      score: number;
    }> = [];

    // Add active Pokemon
    if (playerState.activePokemon) {
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      if (activeCard.cardType === CardType.POKEMON) {
        const score = this.pokemonScoringService.calculateScore(
          activeCard,
          playerState.activePokemon,
        );
        pokemonWithScores.push({
          pokemon: playerState.activePokemon,
          card: activeCard,
          position: PokemonPosition.ACTIVE,
          score,
        });
      }
    }

    // Add bench Pokemon
    for (let i = 0; i < playerState.bench.length; i++) {
      const benchInstance = playerState.bench[i];
      const benchCard = await getCardEntity(benchInstance.cardId);
      if (benchCard.cardType === CardType.POKEMON) {
        const position = this.getBenchPosition(i);
        const score = this.pokemonScoringService.calculateScore(
          benchCard,
          benchInstance,
        );
        pokemonWithScores.push({
          pokemon: benchInstance,
          card: benchCard,
          position,
          score,
        });
      }
    }

    // Sort Pokemon by score (highest first) - priority order for evaluation
    pokemonWithScores.sort((a, b) => b.score - a.score);

    // Evaluate each energy card against each Pokemon
    for (const {
      cardId: energyCardId,
      card: energyCard,
    } of energyCardsInHand) {
      for (const {
        pokemon,
        card: pokemonCard,
        position,
      } of pokemonWithScores) {
        // Check if Pokemon can receive energy (no ability preventing it)
        if (this.canReceiveEnergy(pokemonCard)) {
          const option = await this.evaluateAttachmentOption(
            energyCardId,
            energyCard,
            pokemon,
            pokemonCard,
            position,
            gameState,
            playerIdentifier,
            cardsMap,
            getCardEntity,
            opponentThreat,
          );

          // Only include options that improve attacks (knockout, damage increase, or general attachment)
          // Include if it enables knockout, increases damage, or is a general attachment (priority >= 100)
          // Note: Options with priority <= 0 are overflow/not beneficial and should be excluded
          if (
            option &&
            (option.enablesKnockout ||
              option.increasesDamage ||
              option.priority >= 100)
          ) {
            options.push(option);
          }
        }
      }
    }

    // Sort options by priority
    const sorted = sortEnergyAttachmentOptions(options);
    this.logger.info(
      'Energy attachment options evaluated',
      'EnergyAttachmentAnalyzerService',
      {
        optionsCount: sorted.length,
        topPriority: sorted[0]?.priority,
        enablesKnockout: sorted[0]?.enablesKnockout,
      },
    );
    return sorted;
  }

  /**
   * Evaluate a single energy attachment option
   */
  private async evaluateAttachmentOption(
    energyCardId: string,
    energyCard: Card,
    pokemon: CardInstance,
    pokemonCard: Card,
    position: PokemonPosition,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
    opponentThreat: any,
  ): Promise<EnergyAttachmentOption | null> {
    // Simulate attaching energy
    const simulatedAttachedEnergy = [
      ...(pokemon.attachedEnergy || []),
      energyCardId,
    ];

    // Get energy card data for validation
    const energyCardData = this.getEnergyCardData(
      simulatedAttachedEnergy,
      cardsMap,
    );

    // Get Pokemon attacks
    const attacks = pokemonCard.attacks || [];
    if (attacks.length === 0) {
      return null; // No attacks, no benefit
    }

    // Find the best attack (highest damage) that can be performed with current energy
    let bestAttackWithoutEnergy: { attack: any; damage: number } | null = null;
    let bestAttackWithEnergy: { attack: any; damage: number } | null = null;

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Get opponent active Pokemon for damage calculation
    const opponentActivePokemon = opponentState.activePokemon;
    if (!opponentActivePokemon) {
      return null; // No opponent active Pokemon
    }
    const opponentCard = await getCardEntity(opponentActivePokemon.cardId);

    for (const attack of attacks) {
      // Check attack without new energy
      const currentEnergyData = this.getEnergyCardData(
        pokemon.attachedEnergy || [],
        cardsMap,
      );
      const canPerformWithout =
        this.attackEnergyValidatorService.validateEnergyRequirements(
          attack,
          currentEnergyData,
        ).isValid;

      // Check attack with new energy
      const canPerformWith =
        this.attackEnergyValidatorService.validateEnergyRequirements(
          attack,
          energyCardData,
        ).isValid;

      if (canPerformWith) {
        // Calculate damage with new energy
        const damage = await this.calculateDamage(
          attack,
          pokemonCard,
          opponentActivePokemon,
          opponentCard,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );

        if (!bestAttackWithEnergy || damage > bestAttackWithEnergy.damage) {
          bestAttackWithEnergy = { attack, damage };
        }
      }

      if (canPerformWithout) {
        // Calculate damage without new energy
        const damage = await this.calculateDamage(
          attack,
          pokemonCard,
          opponentActivePokemon,
          opponentCard,
          gameState,
          playerIdentifier,
          cardsMap,
          getCardEntity,
        );

        if (
          !bestAttackWithoutEnergy ||
          damage > bestAttackWithoutEnergy.damage
        ) {
          bestAttackWithoutEnergy = { attack, damage };
        }
      }
    }

    if (!bestAttackWithEnergy) {
      return null; // Energy doesn't enable any attack
    }

    // Check if energy enables knockout
    // Only consider it a knockout if damage > 0 (damage prevention/reduction can make it 0)
    const enablesKnockout =
      bestAttackWithEnergy.damage > 0 &&
      bestAttackWithEnergy.damage >= opponentActivePokemon.currentHp &&
      (!bestAttackWithoutEnergy ||
        bestAttackWithoutEnergy.damage < opponentActivePokemon.currentHp);

    // Check if energy increases damage
    // If no attack was possible without energy, then energy enables an attack (increases damage from 0)
    // If an attack was possible, check if the new best attack does more damage
    const increasesDamage =
      !bestAttackWithoutEnergy ||
      bestAttackWithEnergy.damage > bestAttackWithoutEnergy.damage;

    // If damage is 0 (prevented), don't prioritize active Pokemon if we'll be knocked out
    if (
      bestAttackWithEnergy.damage === 0 &&
      position === PokemonPosition.ACTIVE &&
      opponentThreat.canKnockoutActive
    ) {
      // Don't attach to active if damage is prevented and we'll be knocked out
      return null;
    }

    // Check if energy is exact match (no overflow)
    // For exact match, we check if the energy card provides exactly what's needed
    // without providing more than necessary
    const isExactMatch = this.isExactEnergyMatch(
      bestAttackWithEnergy.attack,
      pokemon.attachedEnergy || [],
      energyCard,
      cardsMap,
    );

    // If energy doesn't increase damage and is not an exact match, it's likely overflow
    // Set priority to 0 or negative to indicate it's not beneficial
    if (!increasesDamage && !enablesKnockout && !isExactMatch) {
      // This is overflow - energy doesn't help and is not an exact match
      // Return null to exclude this option
      return null;
    }

    // Calculate how many turns it would take to enable the attack
    // This helps prioritize energy that enables attacks faster
    const turnsToEnable = this.calculateTurnsToEnable(
      bestAttackWithEnergy.attack,
      pokemon.attachedEnergy || [],
      energyCard,
      cardsMap,
    );

    // Check if this energy is the same type as already attached (prefer same type)
    const isSameTypeAsAttached = this.isSameTypeAsAttached(
      energyCard,
      pokemon.attachedEnergy || [],
      cardsMap,
    );

    // Calculate priority
    // If damage is 0 (prevented), set priority to 0 or negative
    let priority = 0;
    if (bestAttackWithEnergy.damage === 0) {
      // Damage is prevented - no benefit, set low/negative priority
      priority = -100;
    } else if (enablesKnockout) {
      priority = 10000;
    } else if (increasesDamage) {
      priority = 1000;
    } else {
      priority = 100; // General attachment
    }

    // If damage is 0 (prevented), don't add any bonuses - keep priority low/negative
    if (bestAttackWithEnergy.damage === 0) {
      // Priority already set to -100, don't add bonuses
    } else {
      // Adjust priority based on exact match
      if (isExactMatch) {
        priority += 100;
      }

      // Adjust priority based on turns to enable (fewer turns = higher priority)
      // If it enables in 1 turn, add bonus. If it requires 2+ turns, reduce priority
      // Note: turnsToEnable = 1 means this energy alone enables the attack
      // turnsToEnable > 1 means more energy is still needed after this attachment
      if (turnsToEnable === 1) {
        priority += 200; // Significant bonus for enabling in 1 turn
      } else if (turnsToEnable === 2) {
        // Requires 1 more turn after this - small penalty
        priority -= 50;
      } else if (turnsToEnable > 2) {
        // Requires 2+ more turns - larger penalty
        priority -= 50 + (turnsToEnable - 2) * 25;
      }

      // Adjust priority based on same type preference (prefer matching existing energy)
      if (isSameTypeAsAttached) {
        priority += 50;
      }

      // Adjust priority based on position (active > bench)
      if (position === PokemonPosition.ACTIVE) {
        priority += 50;
      }
    }

    return {
      energyCardId,
      energyType: energyCard.energyType
        ? String(energyCard.energyType)
        : 'UNKNOWN',
      targetPokemon: pokemon,
      targetCard: pokemonCard,
      enablesKnockout,
      increasesDamage,
      isExactMatch,
      priority,
    };
  }

  /**
   * Check if Pokemon can receive energy (no ability preventing it)
   */
  private canReceiveEnergy(card: Card): boolean {
    // Check if card has an ability that prevents energy attachment
    // For now, we'll assume all Pokemon can receive energy unless explicitly prevented
    // This would need to be enhanced based on actual ability checking logic
    // TODO: Implement ability checking for energy attachment prevention
    return true;
  }

  /**
   * Calculate damage for an attack
   */
  private async calculateDamage(
    attack: Attack,
    attackerCard: Card,
    defenderInstance: CardInstance,
    defenderCard: Card,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    const baseDamage = this.parseBaseDamage(attack.damage || '');

    // Use AttackDamageCalculationService to get accurate damage with weakness/resistance/prevention
    const finalDamage =
      await this.attackDamageCalculationService.calculateFinalDamage({
        baseDamage,
        attack,
        attackerCard,
        defenderCard,
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
      });

    return finalDamage;
  }

  /**
   * Check if energy attachment is exact match (no overflow)
   * An exact match means the energy card provides exactly what's needed without overflow
   */
  private isExactEnergyMatch(
    attack: Attack,
    currentAttachedEnergy: string[],
    newEnergyCard: Card,
    cardsMap: Map<string, Card>,
  ): boolean {
    const requiredEnergy = attack.energyCost || [];
    if (requiredEnergy.length === 0) {
      return false; // No energy required
    }

    // Get current energy card data
    const currentEnergyData = this.getEnergyCardData(
      currentAttachedEnergy,
      cardsMap,
    );

    // Check what energy types are still needed
    const currentEnergyTypes: EnergyType[] = [];
    for (const cardData of currentEnergyData) {
      if (cardData.energyProvision) {
        // Special energy (like DCE)
        for (let i = 0; i < (cardData.energyProvision.amount || 1); i++) {
          cardData.energyProvision.energyTypes.forEach((type) => {
            currentEnergyTypes.push(type);
          });
        }
      } else if (cardData.energyType) {
        currentEnergyTypes.push(cardData.energyType);
      }
    }

    // Count required energy by type
    const requiredCounts = new Map<EnergyType, number>();
    for (const type of requiredEnergy) {
      requiredCounts.set(type, (requiredCounts.get(type) || 0) + 1);
    }

    // Count current energy by type
    // Note: Any energy type can satisfy COLORLESS requirements
    const currentCounts = new Map<EnergyType, number>();
    const totalEnergyCount = currentEnergyTypes.length; // Total energy cards (any type can satisfy COLORLESS)

    for (const type of currentEnergyTypes) {
      if (type !== EnergyType.COLORLESS) {
        currentCounts.set(type, (currentCounts.get(type) || 0) + 1);
      }
    }

    // Calculate what's still needed
    // Strategy: First satisfy specific type requirements, then use remaining energy for COLORLESS
    const stillNeeded: Array<{ type: EnergyType; count: number }> = [];
    let energyUsedForSpecificTypes = 0;

    // First, satisfy non-COLORLESS requirements with exact type matches
    for (const [type, count] of requiredCounts.entries()) {
      if (type === EnergyType.COLORLESS) {
        continue; // Handle COLORLESS separately
      }
      const current = currentCounts.get(type) || 0;
      const needed = count - current;
      if (needed > 0) {
        stillNeeded.push({ type, count: needed });
      }
      // Track how much energy we used for this specific type requirement
      energyUsedForSpecificTypes += Math.min(current, count);
    }

    // Now handle COLORLESS requirements
    // Any energy (including specific types) can satisfy COLORLESS
    // After using energy for specific type requirements, remaining energy can satisfy COLORLESS
    const colorlessRequired = requiredCounts.get(EnergyType.COLORLESS) || 0;
    if (colorlessRequired > 0) {
      // Energy available for COLORLESS = total energy - energy used for specific types
      const energyAvailableForColorless =
        totalEnergyCount - energyUsedForSpecificTypes;
      const colorlessNeeded = Math.max(
        0,
        colorlessRequired - energyAvailableForColorless,
      );
      if (colorlessNeeded > 0) {
        stillNeeded.push({
          type: EnergyType.COLORLESS,
          count: colorlessNeeded,
        });
      }
    }

    // If no energy is still needed, the new energy would be overflow
    if (stillNeeded.length === 0) {
      return false;
    }

    // Check if new energy card provides exactly what's needed
    if (newEnergyCard.energyProvision) {
      // Special energy (like DCE)
      const providedAmount = newEnergyCard.energyProvision.amount || 1;
      const providedTypes = newEnergyCard.energyProvision.energyTypes || [];

      // Check if it provides exactly what's needed
      if (stillNeeded.length === 1) {
        const needed = stillNeeded[0];
        if (needed.type === EnergyType.COLORLESS) {
          // COLORLESS can be satisfied by any energy type
          return providedAmount === needed.count;
        } else {
          // Check if provided types match needed type
          return (
            providedTypes.includes(needed.type) &&
            providedAmount === needed.count
          );
        }
      } else {
        // Multiple types needed - special energy can't match exactly
        return false;
      }
    } else if (newEnergyCard.energyType) {
      // Basic energy card
      const providedType = newEnergyCard.energyType;

      // Check if it provides exactly what's needed (1 energy)
      if (stillNeeded.length === 1) {
        const needed = stillNeeded[0];
        if (needed.count === 1) {
          // COLORLESS requirement can be satisfied by any energy type
          if (needed.type === EnergyType.COLORLESS) {
            return true; // Any energy type can satisfy COLORLESS requirement
          }
          // Exact type match
          return providedType === needed.type;
        }
      } else if (stillNeeded.length > 1) {
        // Multiple types still needed - check if this energy can satisfy one of them
        // This handles cases where we need [Water, Colorless] and have [Water]
        // Attaching Water gives [Water, Water] which satisfies both (Water satisfies Water, Water satisfies Colorless)
        // But we already calculated stillNeeded, so if we have Water and need [Water, Colorless],
        // stillNeeded should be [Colorless: 1], not [Water: 1, Colorless: 1]
        // So this branch might not be needed, but let's keep it for safety
        const canSatisfyOne = stillNeeded.some((needed) => {
          if (needed.type === EnergyType.COLORLESS) {
            return true; // Any energy can satisfy COLORLESS
          }
          return providedType === needed.type && needed.count === 1;
        });
        // For exact match with multiple types needed, we'd need to check if this single energy
        // can satisfy exactly one requirement without overflow
        // But since we're checking exact match, and we only have 1 energy card,
        // it can only satisfy 1 requirement, so if stillNeeded.length > 1, it's not exact match
        return false;
      }
    }
    return false;
  }

  /**
   * Calculate how many turns it would take to enable the attack with this energy
   * Returns 1 if this energy alone enables the attack, 2+ if more energy is needed
   */
  private calculateTurnsToEnable(
    attack: Attack,
    currentAttachedEnergy: string[],
    newEnergyCard: Card,
    cardsMap: Map<string, Card>,
  ): number {
    const requiredEnergy = attack.energyCost || [];
    if (requiredEnergy.length === 0) {
      return 1; // No energy required, can use immediately
    }

    // Get current energy types
    const currentEnergyData = this.getEnergyCardData(
      currentAttachedEnergy,
      cardsMap,
    );
    const currentEnergyTypes: EnergyType[] = [];
    for (const cardData of currentEnergyData) {
      if (cardData.energyProvision) {
        for (let i = 0; i < (cardData.energyProvision.amount || 1); i++) {
          cardData.energyProvision.energyTypes.forEach((type) => {
            currentEnergyTypes.push(type);
          });
        }
      } else if (cardData.energyType) {
        currentEnergyTypes.push(cardData.energyType);
      }
    }

    // Add new energy to the count
    if (newEnergyCard.energyProvision) {
      for (let i = 0; i < (newEnergyCard.energyProvision.amount || 1); i++) {
        newEnergyCard.energyProvision.energyTypes.forEach((type) => {
          currentEnergyTypes.push(type);
        });
      }
    } else if (newEnergyCard.energyType) {
      currentEnergyTypes.push(newEnergyCard.energyType);
    }

    // Create energy card data array for validation
    // Need to include both current energy and new energy
    const energyCardDataArray: Array<{
      cardType: CardType;
      energyType?: any;
      energyProvision?: any;
    }> = [];

    // Add current energy cards
    for (const cardData of currentEnergyData) {
      energyCardDataArray.push(cardData);
    }

    // Add new energy card data
    if (newEnergyCard.energyProvision) {
      energyCardDataArray.push({
        cardType: CardType.ENERGY,
        energyType: newEnergyCard.energyType, // DCE has energyType = COLORLESS
        energyProvision: newEnergyCard.energyProvision,
      });
    } else if (newEnergyCard.energyType) {
      energyCardDataArray.push({
        cardType: CardType.ENERGY,
        energyType: newEnergyCard.energyType,
      });
    }

    // Check if attack can be performed with this energy
    const validation =
      this.attackEnergyValidatorService.validateEnergyRequirements(
        attack,
        energyCardDataArray,
      );

    if (validation.isValid) {
      return 1; // This energy enables the attack in 1 turn
    }

    // Calculate what's still needed after attaching this energy
    const requiredCounts = new Map<EnergyType, number>();
    for (const type of requiredEnergy) {
      requiredCounts.set(type, (requiredCounts.get(type) || 0) + 1);
    }

    // Count current energy (including new energy)
    const currentCounts = new Map<EnergyType, number>();
    const totalEnergyCount = currentEnergyTypes.length;

    for (const type of currentEnergyTypes) {
      if (type !== EnergyType.COLORLESS) {
        currentCounts.set(type, (currentCounts.get(type) || 0) + 1);
      }
    }

    // Calculate what's still needed
    let energyUsedForSpecificTypes = 0;
    let stillNeededCount = 0;

    for (const [type, count] of requiredCounts.entries()) {
      if (type === EnergyType.COLORLESS) {
        continue;
      }
      const current = currentCounts.get(type) || 0;
      const needed = count - current;
      if (needed > 0) {
        stillNeededCount += needed;
      }
      energyUsedForSpecificTypes += Math.min(current, count);
    }

    const colorlessRequired = requiredCounts.get(EnergyType.COLORLESS) || 0;
    if (colorlessRequired > 0) {
      const energyAvailableForColorless =
        totalEnergyCount - energyUsedForSpecificTypes;
      const colorlessNeeded = Math.max(
        0,
        colorlessRequired - energyAvailableForColorless,
      );
      stillNeededCount += colorlessNeeded;
    }

    // Each turn can attach 1 energy card, so turns needed = stillNeededCount
    // +1 for the current turn (attaching this energy)
    return stillNeededCount + 1;
  }

  /**
   * Check if the new energy card is the same type as already attached energy
   */
  private isSameTypeAsAttached(
    newEnergyCard: Card,
    currentAttachedEnergy: string[],
    cardsMap: Map<string, Card>,
  ): boolean {
    if (currentAttachedEnergy.length === 0) {
      return false; // No energy attached, can't be same type
    }

    // Get the type of the new energy card
    let newEnergyType: EnergyType | null = null;
    if (newEnergyCard.energyProvision) {
      // For special energy, check if it provides the same types as attached
      const providedTypes = newEnergyCard.energyProvision.energyTypes || [];
      if (providedTypes.length > 0) {
        newEnergyType = providedTypes[0]; // Use first type for comparison
      }
    } else if (newEnergyCard.energyType) {
      newEnergyType = newEnergyCard.energyType;
    }

    if (!newEnergyType) {
      return false;
    }

    // Check if any attached energy has the same type
    const currentEnergyData = this.getEnergyCardData(
      currentAttachedEnergy,
      cardsMap,
    );
    for (const cardData of currentEnergyData) {
      if (cardData.energyProvision) {
        const providedTypes = cardData.energyProvision.energyTypes || [];
        if (providedTypes.includes(newEnergyType)) {
          return true;
        }
      } else if (cardData.energyType === newEnergyType) {
        return true;
      }
    }

    return false;
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
}
