import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Select Active Pokemon Action Filter
 * Handles action filtering during SELECT_ACTIVE_POKEMON state
 */
@Injectable()
export class SelectActivePokemonActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.SELECT_ACTIVE_POKEMON;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    const playerState = match.gameState?.getPlayerState(playerIdentifier);

    if (playerState?.activePokemon === null) {
      // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON
      return this.filterToActions(actions, [
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.CONCEDE,
      ]);
    }

    // Has set active Pokemon, wait for opponent
    return [PlayerActionType.CONCEDE];
  }
}
