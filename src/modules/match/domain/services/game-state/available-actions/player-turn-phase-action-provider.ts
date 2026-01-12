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
import {
  DrawPhaseActionProvider,
  MainPhaseActionProvider,
  AttackPhaseActionProvider,
  EndPhaseActionProvider,
  SelectActivePokemonPhaseActionProvider,
} from './phase-action-providers';

/**
 * Player Turn Phase Action Provider
 * Orchestrates phase-specific providers for PLAYER_TURN state
 */
export class PlayerTurnPhaseActionProvider implements AvailableActionsProvider {
  private readonly phaseProviders: AvailableActionsProvider[];

  constructor() {
    this.phaseProviders = [
      new DrawPhaseActionProvider(),
      new MainPhaseActionProvider(),
      new AttackPhaseActionProvider(),
      new EndPhaseActionProvider(),
      new SelectActivePokemonPhaseActionProvider(),
    ];
  }

  canHandle(state: MatchState, phase: TurnPhase | null): boolean {
    return state === MatchState.PLAYER_TURN;
  }

  getActions(
    state: MatchState,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    // If phase is null, return CONCEDE only
    if (phase === null) {
      return [PlayerActionType.CONCEDE];
    }

    // Find the appropriate phase provider
    const phaseProvider = this.phaseProviders.find((provider) =>
      provider.canHandle(state, phase),
    );

    if (phaseProvider) {
      return phaseProvider.getActions(state, phase, gameState, currentPlayer);
    }

    // Fallback: return CONCEDE only
    return [PlayerActionType.CONCEDE];
  }
}
