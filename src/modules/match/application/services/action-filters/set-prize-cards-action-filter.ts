import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Set Prize Cards Action Filter
 * Handles action filtering during SET_PRIZE_CARDS state
 */
@Injectable()
export class SetPrizeCardsActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.SET_PRIZE_CARDS;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // Check if player already has set prize cards
    const playerHasSetPrizeCards = this.getPlayerFlag(
      match,
      playerIdentifier,
      'hasSetPrizeCards',
    );

    if (playerHasSetPrizeCards) {
      // Player already has set prize cards, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // Player can set prize cards
    return this.filterToActions(actions, [
      PlayerActionType.SET_PRIZE_CARDS,
      PlayerActionType.CONCEDE,
    ]);
  }
}

