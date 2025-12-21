import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * First Player Selection Action Filter
 * Handles action filtering during FIRST_PLAYER_SELECTION state
 */
@Injectable()
export class FirstPlayerSelectionActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.FIRST_PLAYER_SELECTION;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    const playerHasConfirmed = this.getPlayerFlag(
      match,
      playerIdentifier,
      'hasConfirmedFirstPlayer',
    );

    if (playerHasConfirmed) {
      // Player has confirmed, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // Player can confirm first player
    return this.filterToActions(actions, [
      PlayerActionType.CONFIRM_FIRST_PLAYER,
      PlayerActionType.CONCEDE,
    ]);
  }
}

