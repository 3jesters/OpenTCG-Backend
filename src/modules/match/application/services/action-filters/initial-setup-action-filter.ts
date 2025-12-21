import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Initial Setup Action Filter
 * Handles action filtering during INITIAL_SETUP state (legacy)
 */
@Injectable()
export class InitialSetupActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.INITIAL_SETUP;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    const playerState = match.gameState?.getPlayerState(playerIdentifier);

    if (playerState?.activePokemon === null) {
      // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON and PLAY_POKEMON
      return this.filterToActions(actions, [
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.CONCEDE,
      ]);
    }

    // Has set active Pokemon, allow PLAY_POKEMON and COMPLETE_INITIAL_SETUP
    return [
      PlayerActionType.PLAY_POKEMON,
      PlayerActionType.COMPLETE_INITIAL_SETUP,
      PlayerActionType.CONCEDE,
    ];
  }
}

