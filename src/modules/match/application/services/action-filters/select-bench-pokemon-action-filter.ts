import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Select Bench Pokemon Action Filter
 * Handles action filtering during SELECT_BENCH_POKEMON state
 */
@Injectable()
export class SelectBenchPokemonActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.SELECT_BENCH_POKEMON;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    const playerReady = this.getPlayerFlag(
      match,
      playerIdentifier,
      'readyToStart',
    );

    if (playerReady) {
      // Player is ready, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // Player can play Pokemon or complete setup
    return actions;
  }
}

