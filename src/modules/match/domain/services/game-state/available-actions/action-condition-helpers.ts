import { PlayerActionType, PlayerIdentifier } from '../../../enums';
import { GameStateContext } from './available-actions-provider.interface';

/**
 * Action Condition Helpers
 * Utility methods for complex condition checks in available actions calculation
 */
export class ActionConditionHelpers {
  /**
   * Check if prize selection is pending after a knockout
   */
  static hasPendingPrizeSelection(
    gameState: GameStateContext,
    currentPlayer: PlayerIdentifier,
  ): boolean {
    if (!gameState?.lastAction) return false;

    const lastAction = gameState.lastAction;

    // Must be an ATTACK that caused a knockout by the current player
    if (
      lastAction.actionType !== PlayerActionType.ATTACK ||
      !lastAction.actionData?.isKnockedOut ||
      lastAction.playerId !== currentPlayer
    ) {
      return false;
    }

    const attackIndex = this.findAttackActionIndex(
      gameState,
      lastAction.actionId,
    );

    // If not found, assume prize not selected
    if (attackIndex < 0) return true;

    // Check if there's a SELECT_PRIZE or DRAW_PRIZE after this attack
    const prizeSelected = gameState.actionHistory.some(
      (action, index) =>
        index > attackIndex &&
        (action.actionType === PlayerActionType.SELECT_PRIZE ||
          action.actionType === PlayerActionType.DRAW_PRIZE) &&
        action.playerId === currentPlayer,
    );

    return !prizeSelected;
  }

  /**
   * Check if player needs to select active Pokemon (double knockout scenario)
   */
  static needsActivePokemonSelection(
    gameState: GameStateContext,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    if (!gameState?.player1State || !gameState?.player2State) {
      return false;
    }

    const playerState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.player1State
        : gameState.player2State;

    return playerState.activePokemon === null && playerState.bench.length > 0;
  }

  /**
   * Find the index of an attack action in action history
   */
  static findAttackActionIndex(
    gameState: GameStateContext,
    actionId?: string,
  ): number {
    if (!gameState?.lastAction) return -1;

    const lastAction = gameState.lastAction;

    // Try to find by actionId first
    if (actionId) {
      const index = gameState.actionHistory.findIndex(
        (action) => action.actionId === actionId,
      );
      if (index >= 0) return index;
    }

    // Fallback: check if last item matches
    if (gameState.actionHistory.length > 0) {
      const lastHistoryItem =
        gameState.actionHistory[gameState.actionHistory.length - 1];
      if (
        lastHistoryItem.actionType === lastAction.actionType &&
        lastHistoryItem.playerId === lastAction.playerId
      ) {
        return gameState.actionHistory.length - 1;
      }
    }

    return -1;
  }

  /**
   * Check if both players need to select active Pokemon (double knockout)
   */
  static bothPlayersNeedActiveSelection(gameState: GameStateContext): boolean {
    if (!gameState?.player1State || !gameState?.player2State) {
      return false;
    }

    const player1NeedsActive =
      gameState.player1State.activePokemon === null &&
      gameState.player1State.bench.length > 0;
    const player2NeedsActive =
      gameState.player2State.activePokemon === null &&
      gameState.player2State.bench.length > 0;

    return player1NeedsActive || player2NeedsActive;
  }
}
