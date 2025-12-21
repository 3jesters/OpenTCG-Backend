import { Injectable } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../domain';
import { BaseActionFilter } from './base-action-filter';

/**
 * Default Action Filter
 * Handles action filtering for states without specific filters
 * Returns actions as-is (typically just CONCEDE)
 */
@Injectable()
export class DefaultActionFilter extends BaseActionFilter {
  canHandle(matchState: MatchState): boolean {
    // Default filter handles all states (used as fallback)
    return true;
  }

  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // Other states: return as-is (typically just CONCEDE)
    return actions;
  }
}

