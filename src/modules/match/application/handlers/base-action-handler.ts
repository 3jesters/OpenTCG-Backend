import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  ActionSummary,
} from '../../domain';
import { ExecuteActionDto } from '../dto';
import { IActionHandler } from './action-handler.interface';

/**
 * Base Action Handler
 * Abstract base class providing common operations for all action handlers
 */
@Injectable()
export abstract class BaseActionHandler implements IActionHandler {
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
  ) {}

  /**
   * Execute an action (must be implemented by subclasses)
   */
  abstract execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match>;

  /**
   * Get card entity from the cards map or fetch if not present
   * @param cardId - The card ID to retrieve
   * @param cardsMap - Map of pre-loaded cards
   * @returns Card entity
   * @throws NotFoundException if card is not found
   */
  protected async getCardEntity(
    cardId: string,
    cardsMap: Map<string, Card>,
  ): Promise<Card> {
    // First check if card is in the pre-loaded map
    const card = cardsMap.get(cardId);
    if (card) {
      return card;
    }

    // If not in map, fetch it
    try {
      return await this.getCardByIdUseCase.getCardEntity(cardId);
    } catch (error) {
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }
  }

  /**
   * Get card HP from card entity
   * @param card - The card entity
   * @returns HP value or 0 if not a Pokemon
   */
  protected getCardHp(card: Card): number {
    if (card.cardType === CardType.POKEMON && card.hp) {
      return card.hp;
    }
    return 0;
  }

  /**
   * Check win conditions using state machine
   * @param gameState - The game state to check
   * @returns Win condition result from state machine
   */
  protected checkWinConditions(gameState: GameState) {
    return this.stateMachineService.checkWinConditions(
      gameState.player1State,
      gameState.player2State,
    );
  }

  /**
   * Update game state helper (can be extended by subclasses)
   * This is a placeholder for common state update patterns
   */
  protected updateGameState(
    match: Match,
    updater: (gameState: GameState) => GameState,
  ): Match {
    if (!match.gameState) {
      throw new BadRequestException('Match has no game state');
    }

    const updatedGameState = updater(match.gameState);
    // Note: Match entity should have a method to update game state
    // This is a placeholder - actual implementation depends on Match entity API
    return match;
  }

  /**
   * Collect card IDs from action DTO and game state
   * This is a helper method that can be used by handlers to determine
   * which cards need to be batch-loaded
   * @param dto - The action DTO
   * @param gameState - The current game state
   * @param playerIdentifier - The player executing the action
   * @returns Set of card IDs that should be loaded
   */
  protected collectCardIds(
    dto: ExecuteActionDto,
    gameState: GameState | null,
    playerIdentifier: PlayerIdentifier,
  ): Set<string> {
    const cardIds = new Set<string>();

    // Collect cardIds from actionData
    const actionData = dto.actionData as any;
    if (actionData?.cardId) {
      cardIds.add(actionData.cardId);
    }
    if (actionData?.attackerCardId) {
      cardIds.add(actionData.attackerCardId);
    }
    if (actionData?.defenderCardId) {
      cardIds.add(actionData.defenderCardId);
    }
    if (actionData?.evolutionCardId) {
      cardIds.add(actionData.evolutionCardId);
    }
    if (actionData?.currentPokemonCardId) {
      cardIds.add(actionData.currentPokemonCardId);
    }
    if (actionData?.energyId) {
      cardIds.add(actionData.energyId);
    }
    if (Array.isArray(actionData?.energyIds)) {
      actionData.energyIds.forEach((id: string) => cardIds.add(id));
    }
    if (Array.isArray(actionData?.cardIds)) {
      actionData.cardIds.forEach((id: string) => cardIds.add(id));
    }

    // Collect cardIds from gameState (all Pokemon in play, attached energy, hand, deck, discard)
    if (gameState) {
      const playerState = gameState.getPlayerState(playerIdentifier);
      const opponentState = gameState.getOpponentState(playerIdentifier);

      // Player's Pokemon
      if (playerState.activePokemon) {
        cardIds.add(playerState.activePokemon.cardId);
        // Attached energy
        if (playerState.activePokemon.attachedEnergy) {
          playerState.activePokemon.attachedEnergy.forEach((id) =>
            cardIds.add(id),
          );
        }
      }
      playerState.bench.forEach((pokemon) => {
        cardIds.add(pokemon.cardId);
        if (pokemon.attachedEnergy) {
          pokemon.attachedEnergy.forEach((id) => cardIds.add(id));
        }
      });

      // Opponent's Pokemon
      if (opponentState.activePokemon) {
        cardIds.add(opponentState.activePokemon.cardId);
        if (opponentState.activePokemon.attachedEnergy) {
          opponentState.activePokemon.attachedEnergy.forEach((id) =>
            cardIds.add(id),
          );
        }
      }
      opponentState.bench.forEach((pokemon) => {
        cardIds.add(pokemon.cardId);
        if (pokemon.attachedEnergy) {
          pokemon.attachedEnergy.forEach((id) => cardIds.add(id));
        }
      });

      // Hand, deck, discard (optional - only if needed)
      // These are typically not needed unless action specifically requires them
    }

    return cardIds;
  }

  /**
   * Get actions from the current turn for a specific player
   */
  protected getCurrentTurnActions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): ActionSummary[] {
    // Find the last END_TURN action to determine where current turn started
    let turnStartIndex = 0;
    for (let i = gameState.actionHistory.length - 1; i >= 0; i--) {
      const action = gameState.actionHistory[i];
      if (action.actionType === PlayerActionType.END_TURN) {
        turnStartIndex = i + 1;
        break;
      }
    }

    // Get all actions from current turn for this player
    return gameState.actionHistory
      .slice(turnStartIndex)
      .filter((action) => action.playerId === playerIdentifier);
  }

  /**
   * Check if ATTACK action exists in current turn
   */
  protected hasAttackInCurrentTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const currentTurnActions = this.getCurrentTurnActions(
      gameState,
      playerIdentifier,
    );
    return currentTurnActions.some(
      (action) => action.actionType === PlayerActionType.ATTACK,
    );
  }

  /**
   * Check if RETREAT action exists in current turn
   */
  protected hasRetreatInCurrentTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const currentTurnActions = this.getCurrentTurnActions(
      gameState,
      playerIdentifier,
    );
    return currentTurnActions.some(
      (action) => action.actionType === PlayerActionType.RETREAT,
    );
  }
}

