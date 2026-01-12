import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities';
import { ExecuteActionDto } from '../dto';
import { GameState, PlayerGameState } from '../../domain/value-objects';
import { PlayerIdentifier } from '../../domain/enums';

/**
 * Card Helper Service
 * Provides helper methods for card entity operations and card ID collection
 */
@Injectable()
export class CardHelperService {
  constructor(
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  /**
   * Get card entity from batch-loaded map or fetch individually
   */
  async getCardEntity(
    cardId: string,
    cardsMap: Map<string, Card>,
  ): Promise<Card> {
    const card = cardsMap.get(cardId);
    if (card) {
      return card;
    }
    // Fallback to individual query if not in map
    return await this.getCardByIdUseCase.getCardEntity(cardId);
  }

  /**
   * Collect all cardIds that might be needed from actionData and gameState
   */
  collectCardIds(
    dto: ExecuteActionDto,
    gameState: GameState | null,
    playerIdentifier: PlayerIdentifier,
  ): Set<string> {
    const cardIds = new Set<string>();

    // Collect from action data
    this.collectCardIdsFromActionData(dto, cardIds);

    // Collect from game state if available
    if (gameState) {
      this.collectCardIdsFromGameState(gameState, playerIdentifier, cardIds);
    }

    return cardIds;
  }

  /**
   * Collect card IDs from action data payload
   */
  private collectCardIdsFromActionData(
    dto: ExecuteActionDto,
    cardIds: Set<string>,
  ): void {
    const actionData = dto.actionData as any;
    if (!actionData) {
      return;
    }

    // Single card references
    const singleCardFields = [
      'cardId',
      'attackerCardId',
      'defenderCardId',
      'evolutionCardId',
      'currentPokemonCardId',
      'energyId',
    ];

    singleCardFields.forEach((field) => {
      if (actionData[field]) {
        cardIds.add(actionData[field]);
      }
    });

    // Array fields
    if (Array.isArray(actionData.energyIds)) {
      actionData.energyIds.forEach((id: string) => cardIds.add(id));
    }
    if (Array.isArray(actionData.cardIds)) {
      actionData.cardIds.forEach((id: string) => cardIds.add(id));
    }
  }

  /**
   * Collect card IDs from game state (both players)
   */
  private collectCardIdsFromGameState(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardIds: Set<string>,
  ): void {
    const playerState = gameState.getPlayerState(playerIdentifier);
    const opponentState = gameState.getOpponentState(playerIdentifier);

    // Collect from both player and opponent states
    this.collectCardIdsFromPlayerState(playerState, cardIds);
    this.collectCardIdsFromPlayerState(opponentState, cardIds);
  }

  /**
   * Collect card IDs from a single player's state
   */
  private collectCardIdsFromPlayerState(
    playerState: PlayerGameState,
    cardIds: Set<string>,
  ): void {
    // Active Pokemon and its attached energy
    if (playerState.activePokemon) {
      cardIds.add(playerState.activePokemon.cardId);
      this.addEnergyCardIds(playerState.activePokemon.attachedEnergy, cardIds);
    }

    // Bench Pokemon and their attached energy
    playerState.bench.forEach((pokemon) => {
      cardIds.add(pokemon.cardId);
      this.addEnergyCardIds(pokemon.attachedEnergy, cardIds);
    });

    // Card collections (hand, deck, discard, prizes)
    this.addCardIdsFromArray(playerState.hand, cardIds);
    this.addCardIdsFromArray(playerState.deck, cardIds);
    this.addCardIdsFromArray(playerState.discardPile, cardIds);
    this.addCardIdsFromArray(playerState.prizeCards, cardIds);
  }

  /**
   * Add energy card IDs to the set
   */
  private addEnergyCardIds(
    attachedEnergy: string[] | undefined,
    cardIds: Set<string>,
  ): void {
    if (attachedEnergy) {
      attachedEnergy.forEach((id) => cardIds.add(id));
    }
  }

  /**
   * Add card IDs from an array to the set
   */
  private addCardIdsFromArray(
    cardArray: string[] | undefined,
    cardIds: Set<string>,
  ): void {
    if (cardArray) {
      cardArray.forEach((id) => cardIds.add(id));
    }
  }

  /**
   * Get card HP from card data
   * Throws NotFoundException if card HP cannot be determined
   */
  async getCardHp(
    cardId: string,
    cardsMap: Map<string, Card>,
  ): Promise<number> {
    // Try to get from batch-loaded cardsMap first
    const card = cardsMap.get(cardId);
    if (card && card.hp !== undefined) {
      return card.hp;
    }

    // Fallback to individual query if not in map
    const cardDetail = await this.getCardByIdUseCase.execute(cardId);

    if (cardDetail.hp === undefined || cardDetail.hp === null) {
      throw new NotFoundException(`Card HP not found for card ID: ${cardId}`);
    }

    return cardDetail.hp;
  }
}
