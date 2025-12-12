import { Injectable, BadRequestException } from '@nestjs/common';
import { Ability } from '../../../card/domain/value-objects/ability.value-object';
import { AbilityEffectType } from '../../../card/domain/enums/ability-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { GameState } from '../value-objects/game-state.value-object';
import { PlayerGameState } from '../value-objects/player-game-state.value-object';
import { PlayerIdentifier } from '../enums/player-identifier.enum';
import { CardInstance } from '../value-objects/card-instance.value-object';
import { AbilityActionData } from '../types/ability-action-data.types';
import { StatusEffect } from '../enums/status-effect.enum';
import { PokemonPosition } from '../enums/pokemon-position.enum';
import type { AnyAbilityEffect } from '../../../card/domain/value-objects/ability-effect.value-object';
import { GetCardByIdUseCase } from '../../../card/application/use-cases/get-card-by-id.use-case';
import { EnergySource } from '../../../card/domain/enums/energy-source.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { Destination } from '../../../card/domain/enums/destination.enum';

/**
 * Result of executing ability effects
 */
export interface ExecuteAbilityEffectsResult {
  playerState: PlayerGameState;
  opponentState: PlayerGameState;
}

/**
 * Ability Effect Executor Service
 * Processes ability effects based on AbilityEffectType enum
 * Uses strategy pattern: each effect type has a handler method
 */
@Injectable()
export class AbilityEffectExecutorService {
  constructor(
    private readonly getCardByIdUseCase: GetCardByIdUseCase,
  ) {}

  /**
   * Execute ability effects
   */
  async executeEffects(
    ability: Ability,
    actionData: AbilityActionData,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<ExecuteAbilityEffectsResult> {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    let updatedPlayerState = playerState;
    let updatedOpponentState = opponentState;

    // Execute effects in order
    // Sort effects by priority (similar to trainer effects)
    const sortedEffects = this.sortEffectsByPriority(ability.effects as AnyAbilityEffect[]);

    for (const effect of sortedEffects) {
      const result = await this.executeEffect(
        effect,
        actionData,
        gameState,
        playerIdentifier,
        updatedPlayerState,
        updatedOpponentState,
      );

      updatedPlayerState = result.playerState;
      updatedOpponentState = result.opponentState;
    }

    return {
      playerState: updatedPlayerState,
      opponentState: updatedOpponentState,
    };
  }

  /**
   * Sort effects by execution priority
   */
  private sortEffectsByPriority(effects: AnyAbilityEffect[]): AnyAbilityEffect[] {
    const priorityOrder: Record<AbilityEffectType, number> = {
      // Effects that modify hand/deck first
      [AbilityEffectType.DISCARD_FROM_HAND]: 1,
      [AbilityEffectType.SEARCH_DECK]: 2,
      [AbilityEffectType.RETRIEVE_FROM_DISCARD]: 3,
      [AbilityEffectType.DRAW_CARDS]: 4,

      // Effects that retrieve/attach
      [AbilityEffectType.ATTACH_FROM_DISCARD]: 5,
      [AbilityEffectType.ENERGY_ACCELERATION]: 6,

      // Effects that modify Pokémon state
      [AbilityEffectType.HEAL]: 7,
      [AbilityEffectType.STATUS_CONDITION]: 8,
      [AbilityEffectType.PREVENT_DAMAGE]: 9,
      [AbilityEffectType.REDUCE_DAMAGE]: 10,

      // Effects that modify board state
      [AbilityEffectType.SWITCH_POKEMON]: 11,

      // Passive-like effects (tracking only, no immediate state change)
      [AbilityEffectType.BOOST_ATTACK]: 12,
      [AbilityEffectType.BOOST_HP]: 13,
    };

    return [...effects].sort((a, b) => {
      const priorityA = priorityOrder[a.effectType] || 99;
      const priorityB = priorityOrder[b.effectType] || 99;
      return priorityA - priorityB;
    });
  }

  /**
   * Execute a single effect
   */
  private async executeEffect(
    effect: AnyAbilityEffect,
    actionData: AbilityActionData,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    currentPlayerState: PlayerGameState,
    currentOpponentState: PlayerGameState,
  ): Promise<ExecuteAbilityEffectsResult> {
    switch (effect.effectType) {
      case AbilityEffectType.HEAL:
        return this.handleHeal(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.DRAW_CARDS:
        return this.handleDrawCards(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.SEARCH_DECK:
        return this.handleSearchDeck(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.RETRIEVE_FROM_DISCARD:
        return this.handleRetrieveFromDiscard(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.ENERGY_ACCELERATION:
        return await this.handleEnergyAcceleration(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.SWITCH_POKEMON:
        return this.handleSwitchPokemon(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.DISCARD_FROM_HAND:
        return this.handleDiscardFromHand(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.ATTACH_FROM_DISCARD:
        return this.handleAttachFromDiscard(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.STATUS_CONDITION:
        return this.handleStatusCondition(
          effect,
          actionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case AbilityEffectType.PREVENT_DAMAGE:
      case AbilityEffectType.BOOST_ATTACK:
      case AbilityEffectType.BOOST_HP:
      case AbilityEffectType.REDUCE_DAMAGE:
        // These are passive-like effects that need state tracking (not yet implemented)
        // For now, return unchanged state
        return {
          playerState: currentPlayerState,
          opponentState: currentOpponentState,
        };

      default:
        throw new BadRequestException(
          `Effect type ${(effect as any).effectType} is not yet implemented`,
        );
    }
  }

  /**
   * Handle HEAL effect - Remove damage from Pokémon
   */
  private handleHeal(
    effect: any, // HealAbilityEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const healAmount = effect.amount || 20; // Default to 20 HP

    // Determine target Pokemon
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;
    let isOpponent = false;
    let targetPosition = (actionData as any).targetPokemon || actionData.target;

    if (effect.target === TargetType.SELF) {
      // Target the Pokemon using the ability
      if (actionData.target === PokemonPosition.ACTIVE) {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to heal');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(`Invalid bench position: ${actionData.target}`);
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    } else if (
      effect.target === TargetType.ALL_YOURS ||
      effect.target === TargetType.ACTIVE_YOURS ||
      effect.target === TargetType.BENCHED_YOURS
    ) {
      // Target own Pokémon
      targetPosition = (actionData as any).targetPokemon || actionData.target;
      if (targetPosition === PokemonPosition.ACTIVE) {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to heal');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(targetPosition);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(`Invalid bench position: ${targetPosition}`);
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    } else {
      throw new BadRequestException(`Invalid target type ${effect.target} for HEAL effect`);
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Calculate new HP
    const currentDamageFromHp = targetPokemon.maxHp - targetPokemon.currentHp;
    const newDamageFromHp = Math.max(0, currentDamageFromHp - healAmount);
    const newHp = Math.min(targetPokemon.maxHp, targetPokemon.maxHp - newDamageFromHp);

    const finalPokemon = targetPokemon.withDamageCounters(newDamageFromHp).withHp(newHp);

    // Update state
    if (isOpponent) {
      if (targetPosition === PokemonPosition.ACTIVE) {
        return {
          playerState,
          opponentState: opponentState.withActivePokemon(finalPokemon),
        };
      } else {
        if (benchIndex === null) {
          throw new BadRequestException('Bench index is required');
        }
        const updatedBench = [...opponentState.bench];
        updatedBench[benchIndex] = finalPokemon;
        return {
          playerState,
          opponentState: opponentState.withBench(updatedBench),
        };
      }
    } else {
      if (targetPosition === PokemonPosition.ACTIVE) {
        return {
          playerState: playerState.withActivePokemon(finalPokemon),
          opponentState,
        };
      } else {
        if (benchIndex === null) {
          throw new BadRequestException('Bench index is required');
        }
        const updatedBench = [...playerState.bench];
        updatedBench[benchIndex] = finalPokemon;
        return {
          playerState: playerState.withBench(updatedBench),
          opponentState,
        };
      }
    }
  }

  /**
   * Handle DRAW_CARDS effect - Draw cards from deck
   */
  private handleDrawCards(
    effect: any, // DrawCardsEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const drawCount = effect.count || 1;

    if (playerState.deck.length < drawCount) {
      // Draw as many as possible
      const drawnCards = [...playerState.deck];
      const updatedHand = [...playerState.hand, ...drawnCards];
      const updatedDeck: string[] = [];

      return {
        playerState: playerState.withDeck(updatedDeck).withHand(updatedHand),
        opponentState,
      };
    }

    // Draw cards from top of deck
    const deckCopy = [...playerState.deck];
    const drawnCards = deckCopy.splice(0, drawCount);
    const updatedHand = [...playerState.hand, ...drawnCards];

    return {
      playerState: playerState.withDeck(deckCopy).withHand(updatedHand),
      opponentState,
    };
  }

  /**
   * Handle SEARCH_DECK effect - Search deck for cards
   */
  private handleSearchDeck(
    effect: any, // SearchDeckEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const searchActionData = actionData as any; // SearchDeckAbilityActionData
    if (!searchActionData.selectedCardIds || !Array.isArray(searchActionData.selectedCardIds)) {
      throw new BadRequestException('selectedCardIds is required for SEARCH_DECK effect');
    }

    const maxSearch = effect.count || 1;
    if (searchActionData.selectedCardIds.length > maxSearch) {
      throw new BadRequestException(`SEARCH_DECK can select at most ${maxSearch} card(s)`);
    }

    // Validate all selected cards are in deck
    for (const cardId of searchActionData.selectedCardIds) {
      if (!playerState.deck.includes(cardId)) {
        throw new BadRequestException(`Selected card ${cardId} is not in deck`);
      }
    }

    // Remove selected cards from deck
    let updatedDeck = [...playerState.deck];
    for (const cardId of searchActionData.selectedCardIds) {
      const index = updatedDeck.indexOf(cardId);
      if (index !== -1) {
        updatedDeck.splice(index, 1);
      }
    }

    // Add selected cards to hand or bench based on destination
    if (effect.destination === Destination.HAND) {
      const updatedHand = [...playerState.hand, ...searchActionData.selectedCardIds];
      return {
        playerState: playerState.withDeck(updatedDeck).withHand(updatedHand),
        opponentState,
      };
    } else {
      // destination === Destination.BENCH
      // This would require additional actionData to specify which Pokemon to put on bench
      // For now, default to hand
      const updatedHand = [...playerState.hand, ...searchActionData.selectedCardIds];
      return {
        playerState: playerState.withDeck(updatedDeck).withHand(updatedHand),
        opponentState,
      };
    }
  }

  /**
   * Handle RETRIEVE_FROM_DISCARD effect - Put cards from discard to hand
   */
  private handleRetrieveFromDiscard(
    effect: any, // RetrieveFromDiscardEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const retrieveActionData = actionData as any; // RetrieveFromDiscardAbilityActionData
    if (
      !retrieveActionData.selectedCardIds ||
      !Array.isArray(retrieveActionData.selectedCardIds)
    ) {
      throw new BadRequestException('selectedCardIds is required for RETRIEVE_FROM_DISCARD effect');
    }

    const maxRetrieve = effect.count || 1;
    if (retrieveActionData.selectedCardIds.length > maxRetrieve) {
      throw new BadRequestException(
        `RETRIEVE_FROM_DISCARD can retrieve at most ${maxRetrieve} card(s)`,
      );
    }

    // Validate all selected cards are in discard pile
    for (const cardId of retrieveActionData.selectedCardIds) {
      if (!playerState.discardPile.includes(cardId)) {
        throw new BadRequestException(`Selected card ${cardId} is not in discard pile`);
      }
    }

    // Remove selected cards from discard pile
    let updatedDiscardPile = [...playerState.discardPile];
    for (const cardId of retrieveActionData.selectedCardIds) {
      const index = updatedDiscardPile.indexOf(cardId);
      if (index !== -1) {
        updatedDiscardPile.splice(index, 1);
      }
    }

    // Add retrieved cards to hand
    const updatedHand = [...playerState.hand, ...retrieveActionData.selectedCardIds];

    return {
      playerState: playerState.withHand(updatedHand).withDiscardPile(updatedDiscardPile),
      opponentState,
    };
  }

  /**
   * Handle ENERGY_ACCELERATION effect - Attach energy from deck/discard/hand/self
   */
  private async handleEnergyAcceleration(
    effect: any, // EnergyAccelerationAbilityEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<ExecuteAbilityEffectsResult> {
    const energyActionData = actionData as any; // EnergyAccelerationAbilityActionData
    const count = effect.count || 1;
    const source = effect.source || EnergySource.DECK;

    // Determine target Pokemon
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;
    const targetPosition = energyActionData.targetPokemon || actionData.target;

    if (effect.target === TargetType.SELF) {
      // Target the Pokemon using the ability
      if (actionData.target === PokemonPosition.ACTIVE) {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to attach energy to');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(`Invalid bench position: ${actionData.target}`);
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    } else {
      // Target other Pokemon
      if (targetPosition === PokemonPosition.ACTIVE) {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to attach energy to');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(targetPosition);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(`Invalid bench position: ${targetPosition}`);
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Validate target Pokemon type restriction
    if (effect.targetPokemonType) {
      const targetCard = await this.getCardByIdUseCase.getCardEntity(
        targetPokemon.cardId,
      );
      if (targetCard.cardType !== CardType.POKEMON) {
        throw new BadRequestException(`Target ${targetPosition} is not a Pokemon`);
      }
      if (targetCard.pokemonType !== effect.targetPokemonType) {
        throw new BadRequestException(
          `Target Pokemon must be ${effect.targetPokemonType} type, but is ${targetCard.pokemonType || 'unknown type'}`,
        );
      }
    }

    // Get energy cards based on source
    let energyCards: string[] = [];
    let updatedDeck = [...playerState.deck];
    let updatedHand = [...playerState.hand];
    let updatedDiscardPile = [...playerState.discardPile];
    let sourcePokemon: CardInstance | null = null;

    if (source === EnergySource.DECK) {
      // Draw energy cards from deck (top of deck)
      const deckCopy = [...playerState.deck];
      energyCards = deckCopy.splice(0, count);
      updatedDeck = deckCopy;
    } else if (source === EnergySource.HAND) {
      // Select energy cards from hand
      if (!energyActionData.selectedCardIds || energyActionData.selectedCardIds.length === 0) {
        throw new BadRequestException('selectedCardIds is required when source is hand');
      }
      
      // Validate that we have the correct number of selected cards
      if (energyActionData.selectedCardIds.length !== count) {
        throw new BadRequestException(
          `Expected ${count} energy card(s) to be selected, but got ${energyActionData.selectedCardIds.length}`,
        );
      }
      
      energyCards = energyActionData.selectedCardIds;
      
      // First, validate that all selected cards are in hand
      for (const cardId of energyCards) {
        if (!playerState.hand.includes(cardId)) {
          throw new BadRequestException(`Selected card ${cardId} is not in hand`);
        }
      }
      
      // Validate energy type restrictions
      if (effect.energyType) {
        // Validate all selected cards match the energy type
        for (const cardId of energyCards) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType !== CardType.ENERGY) {
            throw new BadRequestException(`Selected card ${cardId} is not an Energy card`);
          }
          if (card.energyType !== effect.energyType) {
            throw new BadRequestException(
              `Selected energy card ${cardId} must be ${effect.energyType} Energy, but is ${card.energyType || 'unknown type'}`,
            );
          }
        }
        
        // Count how many matching energy cards are in hand (for error message if needed)
        let matchingCount = 0;
        for (const cardId of playerState.hand) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType === CardType.ENERGY && card.energyType === effect.energyType) {
            matchingCount++;
          }
        }
        
        // Validate we have enough matching cards in hand
        if (matchingCount < count) {
          throw new BadRequestException(
            `Not enough ${effect.energyType} Energy cards in hand. Need ${count}, but only ${matchingCount} available.`,
          );
        }
      } else {
        // No energy type restriction - just validate they're energy cards
        for (const cardId of energyCards) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType !== CardType.ENERGY) {
            throw new BadRequestException(`Selected card ${cardId} is not an Energy card`);
          }
        }
      }
      
      // Remove exactly the selected cards (one by one to handle duplicates correctly)
      // This removes the first occurrence of each selected card ID
      updatedHand = [...playerState.hand];
      for (const cardId of energyCards) {
        const index = updatedHand.indexOf(cardId);
        if (index === -1) {
          throw new BadRequestException(`Selected card ${cardId} is not in hand`);
        }
        updatedHand.splice(index, 1);
      }
    } else if (source === EnergySource.DISCARD) {
      // Select energy cards from discard
      if (!energyActionData.selectedCardIds || energyActionData.selectedCardIds.length === 0) {
        throw new BadRequestException('selectedCardIds is required when source is discard');
      }
      
      // Validate that we have the correct number of selected cards
      if (energyActionData.selectedCardIds.length !== count) {
        throw new BadRequestException(
          `Expected ${count} energy card(s) to be selected, but got ${energyActionData.selectedCardIds.length}`,
        );
      }
      
      energyCards = energyActionData.selectedCardIds;
      
      // First, validate that all selected cards are in discard pile
      for (const cardId of energyCards) {
        if (!playerState.discardPile.includes(cardId)) {
          throw new BadRequestException(`Selected card ${cardId} is not in discard pile`);
        }
      }
      
      // Validate energy type restrictions
      if (effect.energyType) {
        // Validate all selected cards match the energy type
        for (const cardId of energyCards) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType !== CardType.ENERGY) {
            throw new BadRequestException(`Selected card ${cardId} is not an Energy card`);
          }
          if (card.energyType !== effect.energyType) {
            throw new BadRequestException(
              `Selected energy card ${cardId} must be ${effect.energyType} Energy, but is ${card.energyType || 'unknown type'}`,
            );
          }
        }
        
        // Count how many matching energy cards are in discard pile (for error message if needed)
        let matchingCount = 0;
        for (const cardId of playerState.discardPile) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType === CardType.ENERGY && card.energyType === effect.energyType) {
            matchingCount++;
          }
        }
        
        // Validate we have enough matching cards in discard pile
        if (matchingCount < count) {
          throw new BadRequestException(
            `Not enough ${effect.energyType} Energy cards in discard pile. Need ${count}, but only ${matchingCount} available.`,
          );
        }
      } else {
        // No energy type restriction - just validate they're energy cards
        for (const cardId of energyCards) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType !== CardType.ENERGY) {
            throw new BadRequestException(`Selected card ${cardId} is not an Energy card`);
          }
        }
      }
      
      // Remove exactly the selected cards (one by one to handle duplicates correctly)
      // This removes the first occurrence of each selected card ID
      updatedDiscardPile = [...playerState.discardPile];
      for (const cardId of energyCards) {
        const index = updatedDiscardPile.indexOf(cardId);
        if (index === -1) {
          throw new BadRequestException(`Selected card ${cardId} is not in discard pile`);
        }
        updatedDiscardPile.splice(index, 1);
      }
    } else if (source === EnergySource.SELF) {
      // Move energy from the Pokemon using the ability
      // Find the source Pokemon (the one using the ability)
      if (actionData.target === PokemonPosition.ACTIVE) {
        sourcePokemon = playerState.activePokemon;
      } else {
        const sourceBenchIndex = this.parseBenchIndex(actionData.target);
        if (sourceBenchIndex >= 0 && sourceBenchIndex < playerState.bench.length) {
          sourcePokemon = playerState.bench[sourceBenchIndex];
        }
      }

      if (!sourcePokemon) {
        throw new BadRequestException('Source Pokemon not found');
      }

      // Validate source Pokemon type restriction
      if (effect.sourcePokemonType) {
        const sourceCard = await this.getCardByIdUseCase.getCardEntity(
          sourcePokemon.cardId,
        );
        if (sourceCard.cardType !== CardType.POKEMON) {
          throw new BadRequestException('Source is not a Pokemon');
        }
        if (sourceCard.pokemonType !== effect.sourcePokemonType) {
          throw new BadRequestException(
            `Source Pokemon must be ${effect.sourcePokemonType} type, but is ${sourceCard.pokemonType || 'unknown type'}`,
          );
        }
      }

      // Get selected energy cards from source Pokemon
      if (!energyActionData.selectedCardIds || energyActionData.selectedCardIds.length === 0) {
        throw new BadRequestException('selectedCardIds is required when source is self');
      }
      energyCards = energyActionData.selectedCardIds.slice(0, count);

      // Validate energy cards are attached to source Pokemon
      for (const cardId of energyCards) {
        if (!sourcePokemon.attachedEnergy.includes(cardId)) {
          throw new BadRequestException(
            `Selected energy card ${cardId} is not attached to source Pokemon`,
          );
        }
      }

      // Validate energy type restrictions
      if (effect.energyType) {
        for (const cardId of energyCards) {
          const card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (card.cardType !== CardType.ENERGY) {
            throw new BadRequestException(`Selected card ${cardId} is not an Energy card`);
          }
          if (card.energyType !== effect.energyType) {
            throw new BadRequestException(
              `Selected energy card ${cardId} must be ${effect.energyType} Energy, but is ${card.energyType || 'unknown type'}`,
            );
          }
        }
      }

      // Remove energy from source Pokemon
      const updatedSourceEnergy = sourcePokemon.attachedEnergy.filter(
        (id) => !energyCards.includes(id),
      );
      const updatedSourcePokemon = sourcePokemon.withAttachedEnergy(updatedSourceEnergy);

      // Update source Pokemon in state
      if (actionData.target === PokemonPosition.ACTIVE) {
        playerState = playerState.withActivePokemon(updatedSourcePokemon);
      } else {
        const sourceBenchIndex = this.parseBenchIndex(actionData.target);
        const updatedBench = [...playerState.bench];
        updatedBench[sourceBenchIndex] = updatedSourcePokemon;
        playerState = playerState.withBench(updatedBench);
      }
    }

    // Attach energy to target Pokemon
    const updatedEnergy = [...targetPokemon.attachedEnergy, ...energyCards];
    const finalPokemon = targetPokemon.withAttachedEnergy(updatedEnergy);

    // Update state
    let finalPlayerState = playerState
      .withDeck(updatedDeck)
      .withHand(updatedHand)
      .withDiscardPile(updatedDiscardPile);

    if (targetPosition === PokemonPosition.ACTIVE) {
      finalPlayerState = finalPlayerState.withActivePokemon(finalPokemon);
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = [...finalPlayerState.bench];
      updatedBench[benchIndex] = finalPokemon;
      finalPlayerState = finalPlayerState.withBench(updatedBench);
    }

    return {
      playerState: finalPlayerState,
      opponentState,
    };
  }

  /**
   * Handle SWITCH_POKEMON effect - Switch active or benched Pokémon
   */
  private handleSwitchPokemon(
    effect: any, // SwitchPokemonAbilityEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const switchActionData = actionData as any; // SwitchPokemonAbilityActionData
    if (!switchActionData.benchPosition) {
      throw new BadRequestException('benchPosition is required for SWITCH_POKEMON effect');
    }

    const benchIndex = this.parseBenchIndex(switchActionData.benchPosition);
    if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
      throw new BadRequestException(`Invalid bench position: ${switchActionData.benchPosition}`);
    }

    if (!playerState.activePokemon) {
      throw new BadRequestException('No active Pokemon to switch');
    }

    const activePokemon = playerState.activePokemon;
    const benchPokemon = playerState.bench[benchIndex];

    // Swap positions
    const newActive = new CardInstance(
      benchPokemon.instanceId,
      benchPokemon.cardId,
      PokemonPosition.ACTIVE,
      benchPokemon.currentHp,
      benchPokemon.maxHp,
      benchPokemon.attachedEnergy,
      benchPokemon.statusEffect,
      benchPokemon.damageCounters,
      benchPokemon.evolutionChain,
    );

    // Map bench index to PokemonPosition enum
    const benchPositionMap: Record<number, PokemonPosition> = {
      0: PokemonPosition.BENCH_0,
      1: PokemonPosition.BENCH_1,
      2: PokemonPosition.BENCH_2,
      3: PokemonPosition.BENCH_3,
      4: PokemonPosition.BENCH_4,
    };
    const benchPosition = benchPositionMap[benchIndex] || PokemonPosition.BENCH_0;

    const newBench = new CardInstance(
      activePokemon.instanceId,
      activePokemon.cardId,
      benchPosition,
      activePokemon.currentHp,
      activePokemon.maxHp,
      activePokemon.attachedEnergy,
      activePokemon.statusEffect,
      activePokemon.damageCounters,
      activePokemon.evolutionChain,
    );

    const updatedBench = [...playerState.bench];
    updatedBench[benchIndex] = newBench;

    return {
      playerState: playerState.withActivePokemon(newActive).withBench(updatedBench),
      opponentState,
    };
  }

  /**
   * Handle DISCARD_FROM_HAND effect - Discard cards from hand
   */
  private handleDiscardFromHand(
    effect: any, // DiscardFromHandEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const discardActionData = actionData as any; // DiscardFromHandAbilityActionData
    if (
      !discardActionData.handCardIds ||
      !Array.isArray(discardActionData.handCardIds) ||
      discardActionData.handCardIds.length === 0
    ) {
      throw new BadRequestException('handCardIds is required for DISCARD_FROM_HAND effect');
    }

    const maxDiscard = effect.count === 'all' ? Infinity : effect.count || 1;
    if (effect.count !== 'all' && discardActionData.handCardIds.length > maxDiscard) {
      throw new BadRequestException(`DISCARD_FROM_HAND can discard at most ${maxDiscard} card(s)`);
    }

    // Validate all cards are in hand
    for (const cardId of discardActionData.handCardIds) {
      if (!playerState.hand.includes(cardId)) {
        throw new BadRequestException(`Card ${cardId} is not in hand`);
      }
    }

    // Remove exactly the selected cards (one by one to handle duplicates correctly)
    const updatedHand = [...playerState.hand];
    for (const cardId of discardActionData.handCardIds) {
      const index = updatedHand.indexOf(cardId);
      if (index === -1) {
        throw new BadRequestException(`Card ${cardId} is not in hand`);
      }
      updatedHand.splice(index, 1);
    }

    // Add cards to discard pile
    const updatedDiscardPile = [...playerState.discardPile, ...discardActionData.handCardIds];

    return {
      playerState: playerState.withHand(updatedHand).withDiscardPile(updatedDiscardPile),
      opponentState,
    };
  }

  /**
   * Handle ATTACH_FROM_DISCARD effect - Attach energy from discard pile
   */
  private handleAttachFromDiscard(
    effect: any, // AttachFromDiscardEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const attachActionData = actionData as any; // AttachFromDiscardAbilityActionData
    if (
      !attachActionData.selectedCardIds ||
      !Array.isArray(attachActionData.selectedCardIds) ||
      attachActionData.selectedCardIds.length === 0
    ) {
      throw new BadRequestException('selectedCardIds is required for ATTACH_FROM_DISCARD effect');
    }

    const count = effect.count || 1;
    
    // Validate that we have the correct number of selected cards
    if (attachActionData.selectedCardIds.length !== count) {
      throw new BadRequestException(
        `Expected ${count} energy card(s) to be selected, but got ${attachActionData.selectedCardIds.length}`,
      );
    }

    // Validate all cards are in discard pile
    for (const cardId of attachActionData.selectedCardIds) {
      if (!playerState.discardPile.includes(cardId)) {
        throw new BadRequestException(`Selected card ${cardId} is not in discard pile`);
      }
    }

    // Determine target Pokemon
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;
    const targetPosition = attachActionData.targetPokemon || actionData.target;

    if (effect.target === TargetType.SELF) {
      // Target the Pokemon using the ability
      if (actionData.target === PokemonPosition.ACTIVE) {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to attach energy to');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(`Invalid bench position: ${actionData.target}`);
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    } else {
      // Target other Pokemon
      if (targetPosition === PokemonPosition.ACTIVE) {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to attach energy to');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(targetPosition);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(`Invalid bench position: ${targetPosition}`);
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Remove only the selected cards (one by one to handle duplicates correctly)
    const updatedDiscardPile = [...playerState.discardPile];
    for (const cardId of attachActionData.selectedCardIds) {
      const index = updatedDiscardPile.indexOf(cardId);
      if (index === -1) {
        throw new BadRequestException(`Selected card ${cardId} is not in discard pile`);
      }
      updatedDiscardPile.splice(index, 1);
    }

    // Attach energy to target Pokemon
    const updatedEnergy = [...targetPokemon.attachedEnergy, ...attachActionData.selectedCardIds];
    const finalPokemon = targetPokemon.withAttachedEnergy(updatedEnergy);

    // Update state
    let finalPlayerState = playerState.withDiscardPile(updatedDiscardPile);

    if (targetPosition === PokemonPosition.ACTIVE) {
      finalPlayerState = finalPlayerState.withActivePokemon(finalPokemon);
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = [...finalPlayerState.bench];
      updatedBench[benchIndex] = finalPokemon;
      finalPlayerState = finalPlayerState.withBench(updatedBench);
    }

    return {
      playerState: finalPlayerState,
      opponentState,
    };
  }

  /**
   * Handle STATUS_CONDITION effect - Apply status condition to opponent's Pokemon
   */
  private handleStatusCondition(
    effect: any, // StatusConditionAbilityEffect
    actionData: AbilityActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteAbilityEffectsResult {
    const statusActionData = actionData as any; // StatusConditionAbilityActionData
    if (!statusActionData.targetPokemon) {
      throw new BadRequestException('targetPokemon is required for STATUS_CONDITION effect');
    }

    const statusCondition = effect.statusCondition;
    if (!statusCondition) {
      throw new BadRequestException('statusCondition is required in effect');
    }

    // Determine target Pokemon (opponent's Pokemon)
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (statusActionData.targetPokemon === PokemonPosition.ACTIVE) {
      if (!opponentState.activePokemon) {
        throw new BadRequestException('Opponent has no active Pokemon');
      }
      targetPokemon = opponentState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(statusActionData.targetPokemon);
      if (benchIndex < 0 || benchIndex >= opponentState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${statusActionData.targetPokemon}`,
        );
      }
      targetPokemon = opponentState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Apply status condition
    const finalPokemon = targetPokemon.withStatusEffect(statusCondition as StatusEffect);

    // Update opponent state
    if (statusActionData.targetPokemon === PokemonPosition.ACTIVE) {
      return {
        playerState,
        opponentState: opponentState.withActivePokemon(finalPokemon),
      };
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = [...opponentState.bench];
      updatedBench[benchIndex] = finalPokemon;
      return {
        playerState,
        opponentState: opponentState.withBench(updatedBench),
      };
    }
  }

  /**
   * Parse bench index from PokemonPosition enum (e.g., PokemonPosition.BENCH_0 -> 0)
   */
  private parseBenchIndex(position: PokemonPosition): number {
    if (position === PokemonPosition.ACTIVE) {
      return -1; // ACTIVE is not a bench position
    }
    if (
      position === PokemonPosition.BENCH_0 ||
      position === PokemonPosition.BENCH_1 ||
      position === PokemonPosition.BENCH_2 ||
      position === PokemonPosition.BENCH_3 ||
      position === PokemonPosition.BENCH_4
    ) {
      // Extract index from enum value (e.g., "BENCH_0" -> 0)
      const index = parseInt(position.replace('BENCH_', ''), 10);
      return isNaN(index) ? -1 : index;
    }
    return -1;
  }
}
