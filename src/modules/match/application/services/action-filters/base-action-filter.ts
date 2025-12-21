import { Injectable } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  PlayerActionType,
  TurnPhase,
} from '../../../domain';
import { CoinFlipContext } from '../../../domain/enums/coin-flip-context.enum';
import { CoinFlipStatus } from '../../../domain/enums/coin-flip-status.enum';
import { ActionFilterStrategy } from './action-filter-strategy.interface';

/**
 * Base Action Filter
 * Provides common helper methods for all action filters
 */
@Injectable()
export abstract class BaseActionFilter implements ActionFilterStrategy {
  abstract canHandle(matchState: any): boolean;
  abstract filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[];

  /**
   * Get player-specific flag value
   */
  protected getPlayerFlag(
    match: Match,
    playerIdentifier: PlayerIdentifier,
    flagName:
      | 'hasDrawnValidHand'
      | 'hasSetPrizeCards'
      | 'readyToStart'
      | 'hasConfirmedFirstPlayer',
  ): boolean {
    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      switch (flagName) {
        case 'hasDrawnValidHand':
          return match.player1HasDrawnValidHand;
        case 'hasSetPrizeCards':
          return match.player1HasSetPrizeCards;
        case 'readyToStart':
          return match.player1ReadyToStart;
        case 'hasConfirmedFirstPlayer':
          return match.player1HasConfirmedFirstPlayer;
      }
    } else {
      switch (flagName) {
        case 'hasDrawnValidHand':
          return match.player2HasDrawnValidHand;
        case 'hasSetPrizeCards':
          return match.player2HasSetPrizeCards;
        case 'readyToStart':
          return match.player2ReadyToStart;
        case 'hasConfirmedFirstPlayer':
          return match.player2HasConfirmedFirstPlayer;
      }
    }
  }

  /**
   * Check if player can select active Pokemon
   */
  protected canSelectActivePokemon(
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const playerState = match.gameState?.getPlayerState(playerIdentifier);
    return (
      playerState !== undefined &&
      playerState.activePokemon === null &&
      playerState.bench.length > 0
    );
  }

  /**
   * Check if GENERATE_COIN_FLIP action should be added
   */
  protected shouldAddCoinFlipAction(match: Match): boolean {
    const coinFlipState = match.gameState?.coinFlipState;
    return (
      coinFlipState !== null &&
      coinFlipState !== undefined &&
      coinFlipState.status === CoinFlipStatus.READY_TO_FLIP &&
      coinFlipState.context === CoinFlipContext.ATTACK
    );
  }

  /**
   * Check if ATTACH_ENERGY should be filtered out
   */
  protected shouldFilterAttachEnergy(
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const playerState = match.gameState?.getPlayerState(playerIdentifier);
    return (
      playerState?.hasAttachedEnergyThisTurn === true &&
      match.gameState?.phase === TurnPhase.MAIN_PHASE
    );
  }

  /**
   * Get actions allowed for opponent (when not player's turn)
   */
  protected getAllowedActionsForOpponent(
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    const allowedActions: PlayerActionType[] = [];
    const gameState = match.gameState;

    // Check if coin flip is ready for ATTACK context (both players can approve)
    if (this.shouldAddCoinFlipAction(match)) {
      allowedActions.push(PlayerActionType.GENERATE_COIN_FLIP);
    }

    // Check if phase is SELECT_ACTIVE_POKEMON - both players may need to select
    if (gameState?.phase === TurnPhase.SELECT_ACTIVE_POKEMON) {
      if (this.canSelectActivePokemon(match, playerIdentifier)) {
        allowedActions.push(PlayerActionType.SET_ACTIVE_POKEMON);
      }
    } else if (this.canSelectActivePokemon(match, playerIdentifier) && gameState) {
      // Legacy check for backward compatibility (when phase is not SELECT_ACTIVE_POKEMON yet)
      // Check if knockout occurred and prize was selected
      const knockoutAttack = gameState.actionHistory
        .slice()
        .reverse()
        .find(
          (action) =>
            action.actionType === PlayerActionType.ATTACK &&
            action.actionData?.isKnockedOut === true &&
            action.playerId !== playerIdentifier, // Attack was by opponent (not this player)
        );

      if (knockoutAttack) {
        // Find the index of this attack in history
        const attackIndex = gameState.actionHistory.findIndex(
          (action) => action.actionId === knockoutAttack.actionId,
        );

        // Check if there's a SELECT_PRIZE after this attack
        const prizeSelected =
          attackIndex >= 0
            ? gameState.actionHistory.some(
                (action, index) =>
                  index > attackIndex &&
                  (action.actionType === PlayerActionType.SELECT_PRIZE ||
                    action.actionType === PlayerActionType.DRAW_PRIZE) &&
                  action.playerId === knockoutAttack.playerId,
              )
            : false;

        if (prizeSelected) {
          // Prize was selected, opponent can select active Pokemon
          allowedActions.push(PlayerActionType.SET_ACTIVE_POKEMON);
        }
      }
    }

    // Always allow CONCEDE
    allowedActions.push(PlayerActionType.CONCEDE);

    return allowedActions;
  }

  /**
   * Ensure action is in the array (add if not present)
   */
  protected ensureActionIncluded(
    actions: PlayerActionType[],
    action: PlayerActionType,
  ): PlayerActionType[] {
    if (!actions.includes(action)) {
      return [...actions, action];
    }
    return actions;
  }

  /**
   * Filter actions to only include specified ones
   */
  protected filterToActions(
    actions: PlayerActionType[],
    allowedActions: PlayerActionType[],
  ): PlayerActionType[] {
    return actions.filter((action) => allowedActions.includes(action));
  }
}

