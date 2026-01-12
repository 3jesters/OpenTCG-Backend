import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Drawing Cards Action Filter
 * Handles action filtering during DRAWING_CARDS state
 */
@Injectable()
export class DrawingCardsActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    return matchState === MatchState.DRAWING_CARDS;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // Check if player already has drawn valid initial hand
    const playerHasDrawnValidHand = this.getPlayerFlag(
      match,
      playerIdentifier,
      'hasDrawnValidHand',
    );

    if (playerHasDrawnValidHand) {
      // Player already has valid initial hand, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // Player can draw
    return actions;
  }
}
