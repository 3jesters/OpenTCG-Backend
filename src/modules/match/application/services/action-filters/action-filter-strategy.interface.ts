import { Match, MatchState, PlayerIdentifier, PlayerActionType } from '../../../domain';

/**
 * Action Filter Strategy Interface
 * Defines the contract for filtering available actions based on match state
 */
export interface ActionFilterStrategy {
  /**
   * Check if this filter can handle the given match state
   */
  canHandle(matchState: MatchState): boolean;

  /**
   * Filter available actions based on match state and player context
   */
  filter(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[];
}

