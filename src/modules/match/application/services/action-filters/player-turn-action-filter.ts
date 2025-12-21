import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
  TurnPhase,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Player Turn Action Filter
 * Handles action filtering during PLAYER_TURN state
 */
@Injectable()
export class PlayerTurnActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.PLAYER_TURN;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // If not player's turn, return allowed actions for opponent
    if (match.currentPlayer !== playerIdentifier) {
      return this.getAllowedActionsForOpponent(match, playerIdentifier);
    }

    // Player's turn - apply filters and additions
    let filteredActions = [...actions];

    // Check if phase is SELECT_ACTIVE_POKEMON - current player may also need to select (double knockout)
    if (match.gameState?.phase === TurnPhase.SELECT_ACTIVE_POKEMON) {
      if (this.canSelectActivePokemon(match, playerIdentifier)) {
        filteredActions = this.ensureActionIncluded(
          filteredActions,
          PlayerActionType.SET_ACTIVE_POKEMON,
        );
      }
    }

    // Filter out ATTACH_ENERGY if energy was already attached this turn
    if (this.shouldFilterAttachEnergy(match, playerIdentifier)) {
      filteredActions = filteredActions.filter(
        (action) => action !== PlayerActionType.ATTACH_ENERGY,
      );
    }

    // Add GENERATE_COIN_FLIP if coin flip is ready for ATTACK context
    if (this.shouldAddCoinFlipAction(match)) {
      filteredActions = this.ensureActionIncluded(
        filteredActions,
        PlayerActionType.GENERATE_COIN_FLIP,
      );
    }

    return filteredActions;
  }
}

