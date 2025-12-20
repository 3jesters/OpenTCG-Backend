import { Injectable, BadRequestException } from '@nestjs/common';
import { TrainerEffectDto } from '../../../../../card/presentation/dto/trainer-effect.dto';
import { TrainerEffectType } from '../../../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../../../card/domain/enums/target-type.enum';
import { GameState } from '../../../value-objects/game-state.value-object';
import { PlayerGameState } from '../../../value-objects/player-game-state.value-object';
import { PlayerIdentifier } from '../../../enums/player-identifier.enum';
import { PlayerActionType } from '../../../enums/player-action-type.enum';
import { CardInstance } from '../../../value-objects/card-instance.value-object';
import { Card } from '../../../../../card/domain/entities';
import {
  TrainerActionData,
  HealActionData,
  RemoveEnergyActionData,
  RetrieveEnergyActionData,
  DiscardHandActionData,
  DiscardEnergyActionData,
  SwitchActiveActionData,
  ForceSwitchActionData,
  SearchDeckActionData,
  RetrieveFromDiscardActionData,
  DrawCardsActionData,
  ShuffleDeckActionData,
  CureStatusActionData,
  EvolvePokemonActionData,
  DevolvePokemonActionData,
  ReturnToHandActionData,
  ReturnToDeckActionData,
  PutIntoPlayActionData,
  AttachToPokemonActionData,
  TradeCardsActionData,
} from '../../../types/trainer-action-data.types';
import { StatusEffect } from '../../../enums/status-effect.enum';
import { PokemonPosition } from '../../../enums/pokemon-position.enum';

/**
 * Result of executing trainer effects
 */
export interface ExecuteEffectsResult {
  playerState: PlayerGameState;
  opponentState: PlayerGameState;
}

/**
 * Trainer Effect Executor Service
 * Processes trainer effects based on TrainerEffectType enum
 * Uses strategy pattern: each effect type has a handler method
 */
@Injectable()
export class TrainerEffectExecutorService {
  /**
   * Execute trainer effects based on metadata
   */
  async executeEffects(
    trainerEffects: TrainerEffectDto[],
    actionData: TrainerActionData,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap?: Map<string, Card>,
  ): Promise<ExecuteEffectsResult> {
    if (!trainerEffects || trainerEffects.length === 0) {
      throw new BadRequestException('Trainer card must have trainerEffects');
    }

    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    let updatedPlayerState = playerState;
    let updatedOpponentState = opponentState;

    // Execute effects in order
    // 1. Effects that modify hand/deck first (DISCARD_HAND, DISCARD_ENERGY)
    // 2. Effects that retrieve/search (RETRIEVE_ENERGY, SEARCH_DECK, RETRIEVE_FROM_DISCARD)
    // 3. Effects that modify Pokémon state (HEAL, REMOVE_ENERGY, CURE_STATUS)
    // 4. Effects that modify board state (SWITCH_ACTIVE, FORCE_SWITCH)
    // 5. Effects that draw/shuffle (DRAW_CARDS, SHUFFLE_DECK)

    // Sort effects by priority
    const sortedEffects = this.sortEffectsByPriority(trainerEffects);

    for (const effect of sortedEffects) {
      const result = await this.executeEffect(
        effect,
        actionData,
        gameState,
        playerIdentifier,
        updatedPlayerState,
        updatedOpponentState,
        cardsMap,
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
  private sortEffectsByPriority(
    effects: TrainerEffectDto[],
  ): TrainerEffectDto[] {
    const priorityOrder: Record<TrainerEffectType, number> = {
      [TrainerEffectType.DISCARD_HAND]: 1,
      [TrainerEffectType.DISCARD_ENERGY]: 1,
      [TrainerEffectType.RETRIEVE_ENERGY]: 2,
      [TrainerEffectType.SEARCH_DECK]: 2,
      [TrainerEffectType.RETRIEVE_FROM_DISCARD]: 2,
      [TrainerEffectType.HEAL]: 3,
      [TrainerEffectType.REMOVE_ENERGY]: 3,
      [TrainerEffectType.CURE_STATUS]: 3,
      [TrainerEffectType.SWITCH_ACTIVE]: 4,
      [TrainerEffectType.FORCE_SWITCH]: 4,
      [TrainerEffectType.DRAW_CARDS]: 5,
      [TrainerEffectType.SHUFFLE_DECK]: 5,
      // Other effects default to priority 3
      [TrainerEffectType.EVOLVE_POKEMON]: 3,
      [TrainerEffectType.DEVOLVE_POKEMON]: 3,
      [TrainerEffectType.RETURN_TO_HAND]: 3,
      [TrainerEffectType.RETURN_TO_DECK]: 3,
      [TrainerEffectType.PUT_INTO_PLAY]: 3,
      [TrainerEffectType.ATTACH_TO_POKEMON]: 3,
      [TrainerEffectType.LOOK_AT_DECK]: 2,
      [TrainerEffectType.TRADE_CARDS]: 2,
      [TrainerEffectType.OPPONENT_DRAWS]: 5,
      [TrainerEffectType.OPPONENT_SHUFFLES_HAND]: 1,
      [TrainerEffectType.OPPONENT_DISCARDS]: 1,
      [TrainerEffectType.INCREASE_DAMAGE]: 3,
      [TrainerEffectType.REDUCE_DAMAGE]: 3,
    };

    return [...effects].sort((a, b) => {
      const priorityA = priorityOrder[a.effectType] || 3;
      const priorityB = priorityOrder[b.effectType] || 3;
      return priorityA - priorityB;
    });
  }

  /**
   * Execute a single effect
   */
  private async executeEffect(
    effect: TrainerEffectDto,
    actionData: TrainerActionData,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    currentPlayerState: PlayerGameState,
    currentOpponentState: PlayerGameState,
    cardsMap?: Map<string, Card>,
  ): Promise<ExecuteEffectsResult> {
    switch (effect.effectType) {
      case TrainerEffectType.HEAL:
        return this.handleHeal(
          effect,
          actionData as HealActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.REMOVE_ENERGY:
        return this.handleRemoveEnergy(
          effect,
          actionData as RemoveEnergyActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.RETRIEVE_ENERGY:
        return this.handleRetrieveEnergy(
          effect,
          actionData as RetrieveEnergyActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.DISCARD_HAND:
        // handCardId might be in DiscardHandActionData or RetrieveEnergyActionData
        if (!('handCardId' in actionData) || !actionData.handCardId) {
          throw new BadRequestException(
            'handCardId is required for DISCARD_HAND effect',
          );
        }
        return this.handleDiscardHand(
          effect,
          actionData as DiscardHandActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
          actionData.cardId,
        );

      case TrainerEffectType.DRAW_CARDS:
        return this.handleDrawCards(
          effect,
          actionData as DrawCardsActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.SHUFFLE_DECK:
        return this.handleShuffleDeck(
          effect,
          actionData as ShuffleDeckActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.SEARCH_DECK:
        return this.handleSearchDeck(
          effect,
          actionData as SearchDeckActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.SWITCH_ACTIVE:
        return this.handleSwitchActive(
          effect,
          actionData as SwitchActiveActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.FORCE_SWITCH:
        return this.handleForceSwitch(
          effect,
          actionData as ForceSwitchActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.CURE_STATUS:
        return this.handleCureStatus(
          effect,
          actionData as CureStatusActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.DISCARD_ENERGY:
        return this.handleDiscardEnergy(
          effect,
          actionData as DiscardEnergyActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.RETURN_TO_HAND:
        return this.handleReturnToHand(
          effect,
          actionData as ReturnToHandActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.RETURN_TO_DECK:
        return this.handleReturnToDeck(
          effect,
          actionData as ReturnToDeckActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.EVOLVE_POKEMON:
        return this.handleEvolvePokemon(
          effect,
          actionData as EvolvePokemonActionData,
          gameState,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.DEVOLVE_POKEMON:
        return this.handleDevolvePokemon(
          effect,
          actionData as DevolvePokemonActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.PUT_INTO_PLAY:
        return this.handlePutIntoPlay(
          effect,
          actionData as PutIntoPlayActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.ATTACH_TO_POKEMON:
        return this.handleAttachToPokemon(
          effect,
          actionData as AttachToPokemonActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.RETRIEVE_FROM_DISCARD:
        return this.handleRetrieveFromDiscard(
          effect,
          actionData as RetrieveFromDiscardActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.TRADE_CARDS:
        return this.handleTradeCards(
          effect,
          actionData as TradeCardsActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.OPPONENT_DRAWS:
        return this.handleOpponentDraws(
          effect,
          actionData as DrawCardsActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.OPPONENT_SHUFFLES_HAND:
        return this.handleOpponentShufflesHand(
          effect,
          actionData as ShuffleDeckActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.OPPONENT_DISCARDS:
        return this.handleOpponentDiscards(
          effect,
          actionData as DiscardHandActionData,
          currentPlayerState,
          currentOpponentState,
          playerIdentifier,
        );

      case TrainerEffectType.LOOK_AT_DECK:
        // LOOK_AT_DECK is informational only - no state changes needed
        // Client can request deck state separately if needed
        return {
          playerState: currentPlayerState,
          opponentState: currentOpponentState,
        };

      case TrainerEffectType.INCREASE_DAMAGE:
      case TrainerEffectType.REDUCE_DAMAGE:
        // Damage modifiers require state tracking - not yet implemented
        // These would need to be tracked in game state or card instances
        throw new BadRequestException(
          `Effect type ${effect.effectType} requires damage modifier tracking which is not yet implemented`,
        );

      default:
        throw new BadRequestException(
          `Effect type ${effect.effectType} is not yet implemented`,
        );
    }
  }

  /**
   * Handle HEAL effect - Remove damage counters from Pokémon
   */
  private handleHeal(
    effect: TrainerEffectDto,
    actionData: HealActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException('target is required for HEAL effect');
    }

    const healAmount = typeof effect.value === 'number' ? effect.value : 20; // Default to 20 HP (2 damage counters)

    // Determine target based on effect.target
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;
    let isOpponent = false;

    if (
      effect.target === TargetType.ALL_YOURS ||
      effect.target === TargetType.ACTIVE_YOURS
    ) {
      // Target own Pokémon
      if (actionData.target === 'ACTIVE') {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to heal');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        // BENCH_0, BENCH_1, etc.
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(
            `Invalid bench position: ${actionData.target}`,
          );
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    } else if (
      effect.target === TargetType.ALL_OPPONENTS ||
      effect.target === TargetType.ACTIVE_OPPONENT
    ) {
      // Target opponent's Pokémon
      isOpponent = true;
      if (actionData.target === 'ACTIVE') {
        if (!opponentState.activePokemon) {
          throw new BadRequestException('Opponent has no active Pokemon');
        }
        targetPokemon = opponentState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= opponentState.bench.length) {
          throw new BadRequestException(
            `Invalid bench position: ${actionData.target}`,
          );
        }
        targetPokemon = opponentState.bench[benchIndex];
      }
    } else {
      throw new BadRequestException(
        `Invalid target type ${effect.target} for HEAL effect`,
      );
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Calculate new HP after healing
    // Heal removes damage, so new HP = current HP + heal amount (capped at maxHp)
    const newHp = Math.min(
      targetPokemon.maxHp,
      targetPokemon.currentHp + healAmount,
    );

    // Update HP (damageCounters is calculated automatically)
    const finalPokemon = targetPokemon.withHp(newHp);

    // Update state
    if (isOpponent) {
      if (actionData.target === 'ACTIVE') {
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
      if (actionData.target === 'ACTIVE') {
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
   * Handle REMOVE_ENERGY effect - Remove energy from opponent's Pokémon
   */
  private handleRemoveEnergy(
    effect: TrainerEffectDto,
    actionData: RemoveEnergyActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for REMOVE_ENERGY effect',
      );
    }
    if (!actionData.energyCardId) {
      throw new BadRequestException(
        'energyCardId is required for REMOVE_ENERGY effect',
      );
    }

    // REMOVE_ENERGY typically targets opponent's Pokémon
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (actionData.target === 'ACTIVE') {
      if (!opponentState.activePokemon) {
        throw new BadRequestException('Opponent has no active Pokemon');
      }
      targetPokemon = opponentState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(actionData.target);
      if (benchIndex < 0 || benchIndex >= opponentState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      targetPokemon = opponentState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Check if energy card is attached and find first occurrence
    const energyIndex = targetPokemon.attachedEnergy.indexOf(
      actionData.energyCardId,
    );
    if (energyIndex === -1) {
      throw new BadRequestException(
        'Energy card is not attached to target Pokemon',
      );
    }

    // Remove energy card from attached energy (only the first occurrence)
    const updatedAttachedEnergy = targetPokemon.attachedEnergy.filter(
      (_, index) => index !== energyIndex,
    );
    const updatedPokemon = targetPokemon.withAttachedEnergy(
      updatedAttachedEnergy,
    );

    // Update opponent's state
    if (actionData.target === 'ACTIVE') {
      return {
        playerState,
        opponentState: opponentState.withActivePokemon(updatedPokemon),
      };
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = [...opponentState.bench];
      updatedBench[benchIndex] = updatedPokemon;
      return {
        playerState,
        opponentState: opponentState.withBench(updatedBench),
      };
    }
  }

  /**
   * Handle RETRIEVE_ENERGY effect - Get energy from discard pile
   * Note: DISCARD_HAND effect should be executed first if both effects exist
   */
  private handleRetrieveEnergy(
    effect: TrainerEffectDto,
    actionData: RetrieveEnergyActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (
      !actionData.selectedCardIds ||
      !Array.isArray(actionData.selectedCardIds)
    ) {
      throw new BadRequestException(
        'selectedCardIds is required for RETRIEVE_ENERGY (array of energy card IDs to retrieve, can be empty)',
      );
    }

    const maxRetrieve = typeof effect.value === 'number' ? effect.value : 2; // Default to 2
    if (actionData.selectedCardIds.length > maxRetrieve) {
      throw new BadRequestException(
        `RETRIEVE_ENERGY can retrieve at most ${maxRetrieve} energy cards`,
      );
    }

    let updatedHand = [...playerState.hand];
    let updatedDiscardPile = [...playerState.discardPile];

    // Handle energy retrieval if cards are selected
    if (actionData.selectedCardIds.length > 0) {
      // Validate that all selected cards are in discard pile
      for (const selectedCardId of actionData.selectedCardIds) {
        if (!updatedDiscardPile.includes(selectedCardId)) {
          throw new BadRequestException(
            `Selected card ${selectedCardId} is not in discard pile`,
          );
        }
      }

      // Remove selected energy cards from discard pile (one occurrence per entry)
      for (const selectedCardId of actionData.selectedCardIds) {
        const indexToRemove = updatedDiscardPile.indexOf(selectedCardId);
        if (indexToRemove === -1) {
          throw new BadRequestException(
            `Selected card ${selectedCardId} is not in discard pile`,
          );
        }
        updatedDiscardPile = updatedDiscardPile.filter(
          (_, index) => index !== indexToRemove,
        );
      }

      // Add retrieved energy cards to hand
      updatedHand = [...updatedHand, ...actionData.selectedCardIds];
    }

    return {
      playerState: playerState
        .withHand(updatedHand)
        .withDiscardPile(updatedDiscardPile),
      opponentState,
    };
  }

  /**
   * Handle DISCARD_HAND effect - Discard cards from hand
   */
  private handleDiscardHand(
    effect: TrainerEffectDto,
    actionData: DiscardHandActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
    playedCardId: string, // The trainer card being played
  ): ExecuteEffectsResult {
    if (!actionData.handCardId) {
      throw new BadRequestException(
        'handCardId is required for DISCARD_HAND effect',
      );
    }

    // Validate that the selected card is in hand
    if (!playerState.hand.includes(actionData.handCardId)) {
      throw new BadRequestException('Selected card must be in hand');
    }

    // Find the index of the card to discard
    const handCardIndexToRemove =
      actionData.handCardIndex !== undefined
        ? actionData.handCardIndex
        : playerState.hand.indexOf(actionData.handCardId);

    if (
      handCardIndexToRemove === -1 ||
      handCardIndexToRemove >= playerState.hand.length
    ) {
      throw new BadRequestException('Selected card is not in hand');
    }

    if (playerState.hand[handCardIndexToRemove] !== actionData.handCardId) {
      throw new BadRequestException(
        'handCardId does not match card at handCardIndex',
      );
    }

    // Prevent discarding the trainer card that was just played
    const playedCardIndex = playerState.hand.indexOf(playedCardId);
    if (
      handCardIndexToRemove === playedCardIndex &&
      actionData.handCardId === playedCardId
    ) {
      throw new BadRequestException(
        'Cannot select the same trainer card that was just played',
      );
    }

    // Remove card from hand and add to discard pile
    const updatedHand = playerState.hand.filter(
      (_, index) => index !== handCardIndexToRemove,
    );
    const updatedDiscardPile = [
      ...playerState.discardPile,
      actionData.handCardId,
    ];

    return {
      playerState: playerState
        .withHand(updatedHand)
        .withDiscardPile(updatedDiscardPile),
      opponentState,
    };
  }

  /**
   * Handle DRAW_CARDS effect - Draw cards from deck
   */
  private handleDrawCards(
    effect: TrainerEffectDto,
    actionData: DrawCardsActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    const drawCount = typeof effect.value === 'number' ? effect.value : 1;

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
   * Handle SHUFFLE_DECK effect - Shuffle deck
   */
  private handleShuffleDeck(
    effect: TrainerEffectDto,
    actionData: ShuffleDeckActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    const shuffledDeck = this.shuffleDeck([...playerState.deck]);
    return {
      playerState: playerState.withDeck(shuffledDeck),
      opponentState,
    };
  }

  /**
   * Shuffle deck using Fisher-Yates algorithm
   */
  private shuffleDeck(deck: string[]): string[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Handle SEARCH_DECK effect - Search deck for cards and add to hand
   */
  private handleSearchDeck(
    effect: TrainerEffectDto,
    actionData: SearchDeckActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (
      !actionData.selectedCardIds ||
      !Array.isArray(actionData.selectedCardIds)
    ) {
      throw new BadRequestException(
        'selectedCardIds is required for SEARCH_DECK effect',
      );
    }

    const maxSearch = typeof effect.value === 'number' ? effect.value : 1;
    if (actionData.selectedCardIds.length > maxSearch) {
      throw new BadRequestException(
        `SEARCH_DECK can select at most ${maxSearch} cards`,
      );
    }

    // Validate all selected cards are in deck
    for (const cardId of actionData.selectedCardIds) {
      if (!playerState.deck.includes(cardId)) {
        throw new BadRequestException(`Selected card ${cardId} is not in deck`);
      }
    }

    // Remove selected cards from deck
    const updatedDeck = [...playerState.deck];
    for (const cardId of actionData.selectedCardIds) {
      const index = updatedDeck.indexOf(cardId);
      if (index !== -1) {
        updatedDeck.splice(index, 1);
      }
    }

    // Add selected cards to hand
    const updatedHand = [...playerState.hand, ...actionData.selectedCardIds];

    return {
      playerState: playerState.withDeck(updatedDeck).withHand(updatedHand),
      opponentState,
    };
  }

  /**
   * Handle SWITCH_ACTIVE effect - Switch active Pokémon with bench
   */
  private handleSwitchActive(
    effect: TrainerEffectDto,
    actionData: SwitchActiveActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.benchPosition) {
      throw new BadRequestException(
        'benchPosition is required for SWITCH_ACTIVE effect',
      );
    }

    const benchIndex = this.parseBenchIndex(actionData.benchPosition);
    if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
      throw new BadRequestException(
        `Invalid bench position: ${actionData.benchPosition}`,
      );
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
      'ACTIVE' as PokemonPosition,
      benchPokemon.currentHp,
      benchPokemon.maxHp,
      benchPokemon.attachedEnergy,
      benchPokemon.statusEffects,
      benchPokemon.evolutionChain,
      benchPokemon.poisonDamageAmount,
      benchPokemon.evolvedAt,
    );

    const newBench = new CardInstance(
      activePokemon.instanceId,
      activePokemon.cardId,
      `BENCH_${benchIndex}` as PokemonPosition,
      activePokemon.currentHp,
      activePokemon.maxHp,
      activePokemon.attachedEnergy,
      activePokemon.statusEffects,
      activePokemon.evolutionChain,
      activePokemon.poisonDamageAmount,
      activePokemon.evolvedAt,
    );

    const updatedBench = [...playerState.bench];
    updatedBench[benchIndex] = newBench;

    return {
      playerState: playerState
        .withActivePokemon(newActive)
        .withBench(updatedBench),
      opponentState,
    };
  }

  /**
   * Handle FORCE_SWITCH effect - Force opponent to switch active Pokémon
   */
  private handleForceSwitch(
    effect: TrainerEffectDto,
    actionData: ForceSwitchActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.benchPosition) {
      throw new BadRequestException(
        'benchPosition is required for FORCE_SWITCH effect',
      );
    }

    const benchIndex = this.parseBenchIndex(actionData.benchPosition);
    if (benchIndex < 0 || benchIndex >= opponentState.bench.length) {
      throw new BadRequestException(
        `Invalid bench position: ${actionData.benchPosition}`,
      );
    }

    if (!opponentState.activePokemon) {
      throw new BadRequestException('Opponent has no active Pokemon');
    }

    const activePokemon = opponentState.activePokemon;
    const benchPokemon = opponentState.bench[benchIndex];

    // Swap positions
    const newActive = new CardInstance(
      benchPokemon.instanceId,
      benchPokemon.cardId,
      'ACTIVE' as PokemonPosition,
      benchPokemon.currentHp,
      benchPokemon.maxHp,
      benchPokemon.attachedEnergy,
      benchPokemon.statusEffects,
      benchPokemon.evolutionChain,
      benchPokemon.poisonDamageAmount,
      benchPokemon.evolvedAt,
    );

    const newBench = new CardInstance(
      activePokemon.instanceId,
      activePokemon.cardId,
      `BENCH_${benchIndex}` as PokemonPosition,
      activePokemon.currentHp,
      activePokemon.maxHp,
      activePokemon.attachedEnergy,
      activePokemon.statusEffects,
      activePokemon.evolutionChain,
      activePokemon.poisonDamageAmount,
      activePokemon.evolvedAt,
    );

    const updatedBench = [...opponentState.bench];
    updatedBench[benchIndex] = newBench;

    return {
      playerState,
      opponentState: opponentState
        .withActivePokemon(newActive)
        .withBench(updatedBench),
    };
  }

  /**
   * Handle CURE_STATUS effect - Remove status conditions
   */
  private handleCureStatus(
    effect: TrainerEffectDto,
    actionData: CureStatusActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for CURE_STATUS effect',
      );
    }

    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;
    let isOpponent = false;

    if (
      effect.target === TargetType.ALL_YOURS ||
      effect.target === TargetType.ACTIVE_YOURS
    ) {
      if (actionData.target === 'ACTIVE') {
        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to cure');
        }
        targetPokemon = playerState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
          throw new BadRequestException(
            `Invalid bench position: ${actionData.target}`,
          );
        }
        targetPokemon = playerState.bench[benchIndex];
      }
    } else if (
      effect.target === TargetType.ALL_OPPONENTS ||
      effect.target === TargetType.ACTIVE_OPPONENT
    ) {
      isOpponent = true;
      if (actionData.target === 'ACTIVE') {
        if (!opponentState.activePokemon) {
          throw new BadRequestException('Opponent has no active Pokemon');
        }
        targetPokemon = opponentState.activePokemon;
      } else {
        benchIndex = this.parseBenchIndex(actionData.target);
        if (benchIndex < 0 || benchIndex >= opponentState.bench.length) {
          throw new BadRequestException(
            `Invalid bench position: ${actionData.target}`,
          );
        }
        targetPokemon = opponentState.bench[benchIndex];
      }
    } else {
      throw new BadRequestException(
        `Invalid target type ${effect.target} for CURE_STATUS effect`,
      );
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Remove status effect (also clear poison damage amount if was poisoned)
    const curedPokemon = new CardInstance(
      targetPokemon.instanceId,
      targetPokemon.cardId,
      targetPokemon.position,
      targetPokemon.currentHp,
      targetPokemon.maxHp,
      targetPokemon.attachedEnergy,
      [], // Clear all status effects
      targetPokemon.evolutionChain,
      undefined, // Clear poison damage amount when status is cured
      targetPokemon.evolvedAt, // Preserve evolvedAt
    );

    if (isOpponent) {
      if (actionData.target === 'ACTIVE') {
        return {
          playerState,
          opponentState: opponentState.withActivePokemon(curedPokemon),
        };
      } else {
        if (benchIndex === null) {
          throw new BadRequestException('Bench index is required');
        }
        const updatedBench = [...opponentState.bench];
        updatedBench[benchIndex] = curedPokemon;
        return {
          playerState,
          opponentState: opponentState.withBench(updatedBench),
        };
      }
    } else {
      if (actionData.target === 'ACTIVE') {
        return {
          playerState: playerState.withActivePokemon(curedPokemon),
          opponentState,
        };
      } else {
        if (benchIndex === null) {
          throw new BadRequestException('Bench index is required');
        }
        const updatedBench = [...playerState.bench];
        updatedBench[benchIndex] = curedPokemon;
        return {
          playerState: playerState.withBench(updatedBench),
          opponentState,
        };
      }
    }
  }

  /**
   * Handle DISCARD_ENERGY effect - Discard energy from own Pokémon
   */
  private handleDiscardEnergy(
    effect: TrainerEffectDto,
    actionData: DiscardEnergyActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for DISCARD_ENERGY effect',
      );
    }
    if (!actionData.energyCardId) {
      throw new BadRequestException(
        'energyCardId is required for DISCARD_ENERGY effect',
      );
    }

    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (actionData.target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(actionData.target);
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Check if energy card is attached and find first occurrence
    const energyIndex = targetPokemon.attachedEnergy.indexOf(
      actionData.energyCardId,
    );
    if (energyIndex === -1) {
      throw new BadRequestException(
        'Energy card is not attached to target Pokemon',
      );
    }

    // Remove energy card from attached energy
    const updatedAttachedEnergy = targetPokemon.attachedEnergy.filter(
      (_, index) => index !== energyIndex,
    );
    const updatedPokemon = targetPokemon.withAttachedEnergy(
      updatedAttachedEnergy,
    );

    // Add energy to discard pile
    const updatedDiscardPile = [
      ...playerState.discardPile,
      actionData.energyCardId,
    ];

    // Update state
    if (actionData.target === 'ACTIVE') {
      return {
        playerState: playerState
          .withActivePokemon(updatedPokemon)
          .withDiscardPile(updatedDiscardPile),
        opponentState,
      };
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = [...playerState.bench];
      updatedBench[benchIndex] = updatedPokemon;
      return {
        playerState: playerState
          .withBench(updatedBench)
          .withDiscardPile(updatedDiscardPile),
        opponentState,
      };
    }
  }

  /**
   * Handle RETURN_TO_HAND effect - Return Pokémon to hand
   */
  private handleReturnToHand(
    effect: TrainerEffectDto,
    actionData: ReturnToHandActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for RETURN_TO_HAND effect',
      );
    }

    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (actionData.target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon to return');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(actionData.target);
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Add Pokémon card to hand
    const updatedHand = [...playerState.hand, targetPokemon.cardId];

    // Remove from play
    if (actionData.target === 'ACTIVE') {
      // If active is returned, must have bench Pokémon to replace (game rule)
      if (playerState.bench.length === 0) {
        throw new BadRequestException(
          'Cannot return active Pokemon: no bench Pokemon available',
        );
      }
      // Move first bench to active
      const newActive = playerState.bench[0];
      const updatedBench = playerState.bench.slice(1).map((pokemon, index) => {
        return new CardInstance(
          pokemon.instanceId,
          pokemon.cardId,
          `BENCH_${index}` as PokemonPosition,
          pokemon.currentHp,
          pokemon.maxHp,
          pokemon.attachedEnergy,
          pokemon.statusEffects,
          pokemon.evolutionChain,
          pokemon.poisonDamageAmount,
        );
      });
      const newActiveInstance = new CardInstance(
        newActive.instanceId,
        newActive.cardId,
        'ACTIVE' as PokemonPosition,
        newActive.currentHp,
        newActive.maxHp,
        newActive.attachedEnergy,
        newActive.statusEffects,
        newActive.evolutionChain,
        newActive.poisonDamageAmount,
        newActive.evolvedAt,
      );
      return {
        playerState: playerState
          .withActivePokemon(newActiveInstance)
          .withBench(updatedBench)
          .withHand(updatedHand),
        opponentState,
      };
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = playerState.bench.filter(
        (_, index) => index !== benchIndex,
      );
      // Reindex bench positions
      const reindexedBench = updatedBench.map((pokemon, index) => {
        return new CardInstance(
          pokemon.instanceId,
          pokemon.cardId,
          `BENCH_${index}` as PokemonPosition,
          pokemon.currentHp,
          pokemon.maxHp,
          pokemon.attachedEnergy,
          pokemon.statusEffects,
          pokemon.evolutionChain,
          pokemon.poisonDamageAmount,
        );
      });
      return {
        playerState: playerState
          .withBench(reindexedBench)
          .withHand(updatedHand),
        opponentState,
      };
    }
  }

  /**
   * Handle RETURN_TO_DECK effect - Return Pokémon and attached cards to deck
   */
  private handleReturnToDeck(
    effect: TrainerEffectDto,
    actionData: ReturnToDeckActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for RETURN_TO_DECK effect',
      );
    }

    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (actionData.target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon to return');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(actionData.target);
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Collect all cards to add to deck: Pokemon card + attached energy cards
    const cardsToAddToDeck: string[] = [
      targetPokemon.cardId,
      ...targetPokemon.attachedEnergy,
    ];

    // Add all cards to deck
    const updatedDeck = [...playerState.deck, ...cardsToAddToDeck];

    // Remove from play
    if (actionData.target === 'ACTIVE') {
      // If active is returned, must have bench Pokémon to replace (game rule)
      if (playerState.bench.length === 0) {
        throw new BadRequestException(
          'Cannot return active Pokemon: no bench Pokemon available',
        );
      }
      // Move first bench to active
      const newActive = playerState.bench[0];
      const updatedBench = playerState.bench.slice(1).map((pokemon, index) => {
        return new CardInstance(
          pokemon.instanceId,
          pokemon.cardId,
          `BENCH_${index}` as PokemonPosition,
          pokemon.currentHp,
          pokemon.maxHp,
          pokemon.attachedEnergy,
          pokemon.statusEffects,
          pokemon.evolutionChain,
          pokemon.poisonDamageAmount,
          pokemon.evolvedAt,
        );
      });
      const newActiveInstance = new CardInstance(
        newActive.instanceId,
        newActive.cardId,
        'ACTIVE' as PokemonPosition,
        newActive.currentHp,
        newActive.maxHp,
        newActive.attachedEnergy,
        newActive.statusEffects,
        newActive.evolutionChain,
        newActive.poisonDamageAmount,
        newActive.evolvedAt,
      );
      return {
        playerState: playerState
          .withActivePokemon(newActiveInstance)
          .withBench(updatedBench)
          .withDeck(updatedDeck),
        opponentState,
      };
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = playerState.bench.filter(
        (_, index) => index !== benchIndex,
      );
      // Reindex bench positions
      const reindexedBench = updatedBench.map((pokemon, index) => {
        return new CardInstance(
          pokemon.instanceId,
          pokemon.cardId,
          `BENCH_${index}` as PokemonPosition,
          pokemon.currentHp,
          pokemon.maxHp,
          pokemon.attachedEnergy,
          pokemon.statusEffects,
          pokemon.evolutionChain,
          pokemon.poisonDamageAmount,
          pokemon.evolvedAt,
        );
      });
      return {
        playerState: playerState
          .withBench(reindexedBench)
          .withDeck(updatedDeck),
        opponentState,
      };
    }
  }

  /**
   * Handle EVOLVE_POKEMON effect - Force evolution
   */
  private handleEvolvePokemon(
    effect: TrainerEffectDto,
    actionData: EvolvePokemonActionData,
    gameState: GameState,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for EVOLVE_POKEMON effect',
      );
    }
    if (!actionData.evolutionCardId) {
      throw new BadRequestException(
        'evolutionCardId is required for EVOLVE_POKEMON effect',
      );
    }

    // Validate evolution card is in hand
    if (!playerState.hand.includes(actionData.evolutionCardId)) {
      throw new BadRequestException('Evolution card must be in hand');
    }

    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (actionData.target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon to evolve');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(actionData.target);
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Validate that this Pokemon hasn't been evolved this turn
    this.validatePokemonNotEvolvedThisTurn(
      gameState,
      playerIdentifier,
      targetPokemon.instanceId,
    );

    // Remove evolution card from hand
    const updatedHand = playerState.hand.filter(
      (id) => id !== actionData.evolutionCardId,
    );

    // Build evolution chain: add current card to existing chain
    const evolutionChain = [
      targetPokemon.cardId,
      ...targetPokemon.evolutionChain,
    ];

    // Create evolved Pokémon (keep same instance ID, position, HP, energy, but clear status effects)
    // Evolution cures all status effects (sleep, confused, poison, paralyzed, burned)
    const evolvedPokemon = new CardInstance(
      targetPokemon.instanceId,
      actionData.evolutionCardId,
      targetPokemon.position,
      targetPokemon.currentHp,
      targetPokemon.maxHp, // Will need to update maxHp from card data, but keeping for now
      targetPokemon.attachedEnergy,
      [], // Clear all status effects on evolution (empty array)
      evolutionChain, // Add evolution chain
      undefined, // Clear poison damage amount (status effect is cleared)
    );

    // Update state
    if (actionData.target === 'ACTIVE') {
      return {
        playerState: playerState
          .withActivePokemon(evolvedPokemon)
          .withHand(updatedHand),
        opponentState,
      };
    } else {
      if (benchIndex === null) {
        throw new BadRequestException('Bench index is required');
      }
      const updatedBench = [...playerState.bench];
      updatedBench[benchIndex] = evolvedPokemon;
      return {
        playerState: playerState.withBench(updatedBench).withHand(updatedHand),
        opponentState,
      };
    }
  }

  /**
   * Handle DEVOLVE_POKEMON effect - Devolve Pokémon
   */
  private handleDevolvePokemon(
    effect: TrainerEffectDto,
    actionData: DevolvePokemonActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for DEVOLVE_POKEMON effect',
      );
    }

    // Note: Devolving requires knowing the pre-evolution card ID
    // This would need to be tracked in CardInstance or looked up from card data
    // For now, we'll throw an error indicating this needs card data lookup
    throw new BadRequestException(
      'DEVOLVE_POKEMON effect requires card evolution chain data which is not yet fully implemented',
    );
  }

  /**
   * Handle PUT_INTO_PLAY effect - Put Pokémon from source location to bench
   * Supports putting from player's or opponent's discard pile to player's or opponent's bench
   */
  private handlePutIntoPlay(
    effect: TrainerEffectDto,
    actionData: PutIntoPlayActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for PUT_INTO_PLAY effect',
      );
    }
    if (!actionData.pokemonCardId) {
      throw new BadRequestException(
        'pokemonCardId is required for PUT_INTO_PLAY effect',
      );
    }

    // Determine source location (default to player's discard for backward compatibility)
    const source = effect.source || 'DISCARD';
    const isFromOpponentDiscard = source === 'OPPONENT_DISCARD';

    // Determine target bench based on effect.target
    const isTargetOpponentBench =
      effect.target === TargetType.BENCHED_OPPONENTS ||
      effect.target === TargetType.ALL_OPPONENTS;

    // Get the correct discard pile based on source
    const sourceDiscardPile = isFromOpponentDiscard
      ? opponentState.discardPile
      : playerState.discardPile;

    // Validate Pokémon is in the correct discard pile
    if (!sourceDiscardPile.includes(actionData.pokemonCardId)) {
      const sourceName = isFromOpponentDiscard
        ? "opponent's discard pile"
        : "player's discard pile";
      throw new BadRequestException(`Pokemon card is not in ${sourceName}`);
    }

    // Get the target bench
    const targetBench = isTargetOpponentBench
      ? opponentState.bench
      : playerState.bench;

    // Check bench space
    if (targetBench.length >= 5) {
      const benchOwner = isTargetOpponentBench ? "opponent's" : "player's";
      throw new BadRequestException(
        `${benchOwner} bench is full (max 5 Pokemon)`,
      );
    }

    // Remove from source discard pile
    const updatedSourceDiscardPile = sourceDiscardPile.filter(
      (id) => id !== actionData.pokemonCardId,
    );

    // Create new Pokémon instance
    // Note: In production, maxHp should be fetched from card data
    // Using default HP of 50 for now (typical Basic Pokémon HP)
    const defaultHp = 50;
    const benchIndex = targetBench.length;
    const newPokemon = new CardInstance(
      `instance-${Date.now()}-${Math.random()}`, // Generate unique instance ID
      actionData.pokemonCardId,
      `BENCH_${benchIndex}` as PokemonPosition,
      defaultHp,
      defaultHp,
      [],
      [], // Clear all status effects
      [], // evolutionChain
      undefined, // poisonDamageAmount
      undefined, // evolvedAt (new Pokemon, not evolved)
    );

    const updatedTargetBench = [...targetBench, newPokemon];

    // Update states based on source and target
    if (isFromOpponentDiscard && isTargetOpponentBench) {
      // From opponent's discard to opponent's bench
      return {
        playerState,
        opponentState: opponentState
          .withBench(updatedTargetBench)
          .withDiscardPile(updatedSourceDiscardPile),
      };
    } else if (isFromOpponentDiscard && !isTargetOpponentBench) {
      // From opponent's discard to player's bench
      return {
        playerState: playerState.withBench(updatedTargetBench),
        opponentState: opponentState.withDiscardPile(updatedSourceDiscardPile),
      };
    } else if (!isFromOpponentDiscard && isTargetOpponentBench) {
      // From player's discard to opponent's bench
      return {
        playerState: playerState.withDiscardPile(updatedSourceDiscardPile),
        opponentState: opponentState.withBench(updatedTargetBench),
      };
    } else {
      // From player's discard to player's bench (default case)
      return {
        playerState: playerState
          .withBench(updatedTargetBench)
          .withDiscardPile(updatedSourceDiscardPile),
        opponentState,
      };
    }
  }

  /**
   * Handle ATTACH_TO_POKEMON effect - Attach tool card
   */
  private handleAttachToPokemon(
    effect: TrainerEffectDto,
    actionData: AttachToPokemonActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (!actionData.target) {
      throw new BadRequestException(
        'target is required for ATTACH_TO_POKEMON effect',
      );
    }

    // Tool cards are attached to Pokémon - this would require tracking attached tools
    // For now, we'll just validate the target exists
    // Full implementation would need to add tool tracking to CardInstance
    let targetPokemon: CardInstance | null = null;
    let benchIndex: number | null = null;

    if (actionData.target === 'ACTIVE') {
      if (!playerState.activePokemon) {
        throw new BadRequestException('No active Pokemon');
      }
      targetPokemon = playerState.activePokemon;
    } else {
      benchIndex = this.parseBenchIndex(actionData.target);
      if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
        throw new BadRequestException(
          `Invalid bench position: ${actionData.target}`,
        );
      }
      targetPokemon = playerState.bench[benchIndex];
    }

    if (!targetPokemon) {
      throw new BadRequestException('Target Pokemon not found');
    }

    // Tool attachment would be tracked here when CardInstance supports it
    // For now, just return unchanged state (tool card will be discarded by default trainer removal)
    return {
      playerState,
      opponentState,
    };
  }

  /**
   * Handle RETRIEVE_FROM_DISCARD effect - Generic retrieve from discard
   */
  private handleRetrieveFromDiscard(
    effect: TrainerEffectDto,
    actionData: RetrieveFromDiscardActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (
      !actionData.selectedCardIds ||
      !Array.isArray(actionData.selectedCardIds)
    ) {
      throw new BadRequestException(
        'selectedCardIds is required for RETRIEVE_FROM_DISCARD effect',
      );
    }

    const maxRetrieve =
      typeof effect.value === 'number' ? effect.value : undefined;
    if (
      maxRetrieve !== undefined &&
      actionData.selectedCardIds.length > maxRetrieve
    ) {
      throw new BadRequestException(
        `RETRIEVE_FROM_DISCARD can retrieve at most ${maxRetrieve} cards`,
      );
    }

    // Validate all selected cards are in discard pile
    for (const cardId of actionData.selectedCardIds) {
      if (!playerState.discardPile.includes(cardId)) {
        throw new BadRequestException(
          `Selected card ${cardId} is not in discard pile`,
        );
      }
    }

    // Remove selected cards from discard pile (one occurrence per entry)
    const updatedDiscardPile = [...playerState.discardPile];
    for (const cardId of actionData.selectedCardIds) {
      const index = updatedDiscardPile.indexOf(cardId);
      if (index !== -1) {
        updatedDiscardPile.splice(index, 1);
      }
    }

    // Add retrieved cards to hand
    const updatedHand = [...playerState.hand, ...actionData.selectedCardIds];

    return {
      playerState: playerState
        .withHand(updatedHand)
        .withDiscardPile(updatedDiscardPile),
      opponentState,
    };
  }

  /**
   * Handle TRADE_CARDS effect - Trade cards from hand
   */
  private handleTradeCards(
    effect: TrainerEffectDto,
    actionData: TradeCardsActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    if (
      !actionData.discardCardIds ||
      !Array.isArray(actionData.discardCardIds)
    ) {
      throw new BadRequestException(
        'discardCardIds is required for TRADE_CARDS effect',
      );
    }
    if (
      !actionData.selectedCardIds ||
      !Array.isArray(actionData.selectedCardIds)
    ) {
      throw new BadRequestException(
        'selectedCardIds is required for TRADE_CARDS effect',
      );
    }

    // Validate discarded cards are in hand
    for (const cardId of actionData.discardCardIds) {
      if (!playerState.hand.includes(cardId)) {
        throw new BadRequestException(`Discard card ${cardId} is not in hand`);
      }
    }

    // Validate selected cards are in deck
    for (const cardId of actionData.selectedCardIds) {
      if (!playerState.deck.includes(cardId)) {
        throw new BadRequestException(`Selected card ${cardId} is not in deck`);
      }
    }

    // Remove discarded cards from hand
    let updatedHand = playerState.hand.filter(
      (id) => !actionData.discardCardIds.includes(id),
    );

    // Remove selected cards from deck
    const updatedDeck = [...playerState.deck];
    for (const cardId of actionData.selectedCardIds) {
      const index = updatedDeck.indexOf(cardId);
      if (index !== -1) {
        updatedDeck.splice(index, 1);
      }
    }

    // Add selected cards to hand
    updatedHand = [...updatedHand, ...actionData.selectedCardIds];

    // Add discarded cards to discard pile
    const updatedDiscardPile = [
      ...playerState.discardPile,
      ...actionData.discardCardIds,
    ];

    return {
      playerState: playerState
        .withHand(updatedHand)
        .withDeck(updatedDeck)
        .withDiscardPile(updatedDiscardPile),
      opponentState,
    };
  }

  /**
   * Handle OPPONENT_DRAWS effect - Opponent draws cards
   */
  private handleOpponentDraws(
    effect: TrainerEffectDto,
    actionData: DrawCardsActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    const drawCount = typeof effect.value === 'number' ? effect.value : 1;

    if (opponentState.deck.length < drawCount) {
      // Draw as many as possible
      const drawnCards = [...opponentState.deck];
      const updatedHand = [...opponentState.hand, ...drawnCards];
      const updatedDeck: string[] = [];

      return {
        playerState,
        opponentState: opponentState
          .withDeck(updatedDeck)
          .withHand(updatedHand),
      };
    }

    // Draw cards from top of opponent's deck
    const deckCopy = [...opponentState.deck];
    const drawnCards = deckCopy.splice(0, drawCount);
    const updatedHand = [...opponentState.hand, ...drawnCards];

    return {
      playerState,
      opponentState: opponentState.withDeck(deckCopy).withHand(updatedHand),
    };
  }

  /**
   * Handle OPPONENT_SHUFFLES_HAND effect - Opponent shuffles hand into deck
   */
  private handleOpponentShufflesHand(
    effect: TrainerEffectDto,
    actionData: ShuffleDeckActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    // Shuffle hand back into deck
    const combinedDeck = [...opponentState.deck, ...opponentState.hand];
    const shuffledDeck = this.shuffleDeck(combinedDeck);

    return {
      playerState,
      opponentState: opponentState.withDeck(shuffledDeck).withHand([]),
    };
  }

  /**
   * Handle OPPONENT_DISCARDS effect - Opponent discards cards
   */
  private handleOpponentDiscards(
    effect: TrainerEffectDto,
    actionData: DiscardHandActionData,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    playerIdentifier: PlayerIdentifier,
  ): ExecuteEffectsResult {
    // Note: This would typically require opponent to select cards
    // For now, we'll require handCardId to be provided
    if (!actionData.handCardId) {
      throw new BadRequestException(
        'handCardId is required for OPPONENT_DISCARDS effect',
      );
    }

    // Validate card is in opponent's hand
    if (!opponentState.hand.includes(actionData.handCardId)) {
      throw new BadRequestException('Selected card is not in opponent hand');
    }

    // Remove from opponent's hand and add to discard pile
    const updatedHand = opponentState.hand.filter(
      (id) => id !== actionData.handCardId,
    );
    const updatedDiscardPile = [
      ...opponentState.discardPile,
      actionData.handCardId,
    ];

    return {
      playerState,
      opponentState: opponentState
        .withHand(updatedHand)
        .withDiscardPile(updatedDiscardPile),
    };
  }

  /**
   * Parse bench index from target string (e.g., "BENCH_0" -> 0)
   */
  private parseBenchIndex(target: string): number {
    if (!target.startsWith('BENCH_')) {
      throw new BadRequestException(`Invalid bench target format: ${target}`);
    }
    return parseInt(target.replace('BENCH_', ''), 10);
  }

  /**
   * Validate that a Pokemon hasn't been evolved this turn
   * @param gameState The current game state
   * @param playerIdentifier The player attempting to evolve
   * @param instanceId The instance ID of the Pokemon to evolve
   * @throws BadRequestException if the Pokemon has already been evolved this turn
   */
  private validatePokemonNotEvolvedThisTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    instanceId: string,
  ): void {
    // Get all actions from the current turn by this player
    const currentTurnActions = gameState.actionHistory.filter(
      (action) => action.playerId === playerIdentifier,
    );

    // Also check lastAction if it's from the current turn
    if (
      gameState.lastAction &&
      gameState.lastAction.playerId === playerIdentifier
    ) {
      currentTurnActions.push(gameState.lastAction);
    }

    // Check EVOLVE_POKEMON actions
    const evolveActions = currentTurnActions.filter(
      (action) => action.actionType === PlayerActionType.EVOLVE_POKEMON,
    );
    for (const action of evolveActions) {
      const actionInstanceId = (action.actionData as any)?.instanceId;
      if (actionInstanceId === instanceId) {
        throw new BadRequestException(
          `Cannot evolve this Pokemon. This Pokemon has already been evolved this turn.`,
        );
      }
    }

    // Check PLAY_TRAINER actions that might have evolved this Pokemon
    const trainerActions = currentTurnActions.filter(
      (action) => action.actionType === PlayerActionType.PLAY_TRAINER,
    );
    for (const action of trainerActions) {
      const actionData = action.actionData as any;
      // Check if this trainer action had an EVOLVE_POKEMON effect
      if (actionData.evolutionCardId && actionData.target) {
        // Determine instanceId from target by checking current game state
        // Note: This checks the current state, which should be accurate since
        // we're checking actions from the same turn
        const playerState = gameState.getPlayerState(playerIdentifier);
        let targetInstanceId: string | null = null;

        if (actionData.target === 'ACTIVE') {
          targetInstanceId = playerState.activePokemon?.instanceId || null;
        } else if (actionData.target.startsWith('BENCH_')) {
          const benchIndex = parseInt(
            actionData.target.replace('BENCH_', ''),
            10,
          );
          if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
            targetInstanceId =
              playerState.bench[benchIndex]?.instanceId || null;
          }
        }

        if (targetInstanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon. This Pokemon has already been evolved this turn.`,
          );
        }
      }
    }
  }
}
