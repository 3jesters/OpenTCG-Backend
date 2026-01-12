import { MatchState, TurnPhase, PlayerActionType } from '../../../enums';
import {
  AvailableActionsProvider,
  GameStateContext,
} from './available-actions-provider.interface';

/**
 * Match State Action Provider
 * Handles available actions for non-PLAYER_TURN states
 */
export class MatchStateActionProvider implements AvailableActionsProvider {
  canHandle(state: MatchState, phase: TurnPhase | null): boolean {
    return state !== MatchState.PLAYER_TURN;
  }

  getActions(
    state: MatchState,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: any,
  ): PlayerActionType[] {
    // MATCH_APPROVAL
    if (state === MatchState.MATCH_APPROVAL) {
      return [PlayerActionType.APPROVE_MATCH, PlayerActionType.CONCEDE];
    }

    // DRAWING_CARDS
    if (state === MatchState.DRAWING_CARDS) {
      return [PlayerActionType.DRAW_INITIAL_CARDS, PlayerActionType.CONCEDE];
    }

    // SET_PRIZE_CARDS
    if (state === MatchState.SET_PRIZE_CARDS) {
      return [PlayerActionType.SET_PRIZE_CARDS, PlayerActionType.CONCEDE];
    }

    // SELECT_ACTIVE_POKEMON
    if (state === MatchState.SELECT_ACTIVE_POKEMON) {
      return [PlayerActionType.SET_ACTIVE_POKEMON, PlayerActionType.CONCEDE];
    }

    // SELECT_BENCH_POKEMON
    if (state === MatchState.SELECT_BENCH_POKEMON) {
      return [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    // FIRST_PLAYER_SELECTION
    if (state === MatchState.FIRST_PLAYER_SELECTION) {
      return [PlayerActionType.CONFIRM_FIRST_PLAYER, PlayerActionType.CONCEDE];
    }

    // INITIAL_SETUP
    if (state === MatchState.INITIAL_SETUP) {
      return [
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    // Terminal states should not allow CONCEDE
    if (state === MatchState.CANCELLED || state === MatchState.MATCH_ENDED) {
      return [];
    }

    // Other states: return CONCEDE only
    return [PlayerActionType.CONCEDE];
  }
}
