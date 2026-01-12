import { Injectable } from '@nestjs/common';
import { Match, PlayerIdentifier, PlayerActionType } from '../../domain';
import { MatchStateMachineService } from '../../domain/services';
import { ActionFilterRegistry } from './action-filters';

/**
 * Available Actions Service
 * Centralizes logic for computing and filtering available actions based on match state and player context
 */
@Injectable()
export class AvailableActionsService {
  constructor(
    private readonly stateMachineService: MatchStateMachineService,
    private readonly actionFilterRegistry: ActionFilterRegistry,
  ) {}

  /**
   * Get filtered available actions for a player
   * Combines getAvailableActions and filterActionsForPlayer logic
   */
  getFilteredAvailableActions(
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // Get available actions from state machine
    const availableActions = this.stateMachineService.getAvailableActions(
      match.state,
      match.gameState?.phase || null,
      match.gameState
        ? {
            lastAction: match.gameState.lastAction
              ? {
                  actionType: match.gameState.lastAction.actionType,
                  playerId: match.gameState.lastAction.playerId,
                  actionData: match.gameState.lastAction.actionData,
                  actionId: match.gameState.lastAction.actionId,
                }
              : null,
            actionHistory: [
              ...match.gameState.actionHistory.map((action) => ({
                actionType: action.actionType,
                playerId: action.playerId,
                actionId: action.actionId,
              })),
              // Include lastAction in history if it exists and isn't already the last item
              ...(match.gameState.lastAction &&
              (match.gameState.actionHistory.length === 0 ||
                match.gameState.actionHistory[
                  match.gameState.actionHistory.length - 1
                ].actionId !== match.gameState.lastAction.actionId)
                ? [
                    {
                      actionType: match.gameState.lastAction.actionType,
                      playerId: match.gameState.lastAction.playerId,
                      actionId: match.gameState.lastAction.actionId,
                    },
                  ]
                : []),
            ],
            player1State: match.gameState.player1State,
            player2State: match.gameState.player2State,
          }
        : undefined,
      match.currentPlayer || undefined,
    );

    // Filter actions based on player context using strategy pattern
    const filter = this.actionFilterRegistry.getFilter(match.state);
    return filter.filter(availableActions, match, playerIdentifier);
  }
}
