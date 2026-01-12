import {
  MatchState,
  TurnPhase,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../enums';
import {
  AvailableActionsProvider,
  GameStateContext,
} from './available-actions-provider.interface';
import { MatchStateActionProvider } from './match-state-action-provider';
import { PlayerTurnPhaseActionProvider } from './player-turn-phase-action-provider';

/**
 * Available Actions Registry
 * Manages and selects the appropriate provider based on match state and phase
 */
export class AvailableActionsRegistry {
  private readonly providers: AvailableActionsProvider[];

  constructor() {
    this.providers = [
      new MatchStateActionProvider(),
      new PlayerTurnPhaseActionProvider(),
    ];
  }

  /**
   * Get available actions for the given state, phase, and game context
   */
  getAvailableActions(
    state: MatchState,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    // Find the first provider that can handle this state/phase combination
    const provider = this.providers.find((p) => p.canHandle(state, phase));

    if (provider) {
      return provider.getActions(state, phase, gameState, currentPlayer);
    }

    // Fallback: return CONCEDE only
    return [PlayerActionType.CONCEDE];
  }
}
