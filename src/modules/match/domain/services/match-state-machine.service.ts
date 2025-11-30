import {
  MatchState,
  PlayerIdentifier,
  TurnPhase,
  PlayerActionType,
  ActionValidationError,
} from '../enums';
import { GameState } from '../value-objects';

/**
 * Match State Machine Service
 * Handles state transitions and validation for match state machine
 * Domain service - contains business logic for state transitions
 */
export class MatchStateMachineService {
  /**
   * Check if a state transition is valid
   */
  canTransition(
    fromState: MatchState,
    toState: MatchState,
  ): boolean {
    // Terminal states cannot transition
    if (
      fromState === MatchState.MATCH_ENDED ||
      fromState === MatchState.CANCELLED
    ) {
      return false;
    }

    // Valid transitions
    const validTransitions: Record<MatchState, MatchState[]> = {
      [MatchState.CREATED]: [MatchState.WAITING_FOR_PLAYERS],
      [MatchState.WAITING_FOR_PLAYERS]: [
        MatchState.DECK_VALIDATION,
        MatchState.CANCELLED,
      ],
      [MatchState.DECK_VALIDATION]: [
        MatchState.MATCH_APPROVAL,
        MatchState.CANCELLED,
      ],
      [MatchState.MATCH_APPROVAL]: [
        MatchState.PRE_GAME_SETUP,
        MatchState.CANCELLED,
      ],
      [MatchState.PRE_GAME_SETUP]: [
        MatchState.DRAWING_CARDS,
        MatchState.CANCELLED,
      ],
      [MatchState.DRAWING_CARDS]: [
        MatchState.DRAWING_CARDS,
        MatchState.SELECT_ACTIVE_POKEMON,
        MatchState.CANCELLED,
      ],
      [MatchState.SELECT_ACTIVE_POKEMON]: [
        MatchState.SELECT_BENCH_POKEMON,
        MatchState.CANCELLED,
      ],
      [MatchState.SELECT_BENCH_POKEMON]: [
        MatchState.PLAYER_TURN,
        MatchState.CANCELLED,
      ],
      [MatchState.INITIAL_SETUP]: [
        MatchState.PLAYER_TURN,
        MatchState.CANCELLED,
      ],
      [MatchState.PLAYER_TURN]: [
        MatchState.BETWEEN_TURNS,
        MatchState.MATCH_ENDED,
        MatchState.CANCELLED,
      ],
      [MatchState.BETWEEN_TURNS]: [
        MatchState.PLAYER_TURN,
        MatchState.MATCH_ENDED,
        MatchState.CANCELLED,
      ],
      [MatchState.MATCH_ENDED]: [],
      [MatchState.CANCELLED]: [],
    };

    return validTransitions[fromState]?.includes(toState) ?? false;
  }

  /**
   * Validate if an action can be performed in the current state and phase
   */
  validateAction(
    state: MatchState,
    phase: TurnPhase | null,
    actionType: PlayerActionType,
    currentPlayer: PlayerIdentifier | null,
    playerId: PlayerIdentifier,
  ): { isValid: boolean; error?: ActionValidationError } {
    // Check if match is in a playable state
    const playableStates = [
      MatchState.PLAYER_TURN,
      MatchState.INITIAL_SETUP,
      MatchState.DRAWING_CARDS,
      MatchState.SELECT_ACTIVE_POKEMON,
      MatchState.SELECT_BENCH_POKEMON,
      MatchState.MATCH_APPROVAL,
    ];
    
    if (!playableStates.includes(state)) {
      if (actionType === PlayerActionType.CONCEDE) {
        return { isValid: true }; // Can always concede
      }
      return {
        isValid: false,
        error: ActionValidationError.INVALID_STATE,
      };
    }

    // Check if it's the player's turn
    if (state === MatchState.PLAYER_TURN && currentPlayer !== playerId) {
      if (actionType === PlayerActionType.CONCEDE) {
        return { isValid: true }; // Can always concede
      }
      return {
        isValid: false,
        error: ActionValidationError.NOT_PLAYER_TURN,
      };
    }

    // Actions valid during MATCH_APPROVAL
    if (state === MatchState.MATCH_APPROVAL) {
      if (
        actionType === PlayerActionType.APPROVE_MATCH ||
        actionType === PlayerActionType.CONCEDE
      ) {
        return { isValid: true };
      }
    }

    // Actions valid during DRAWING_CARDS
    if (state === MatchState.DRAWING_CARDS) {
      if (actionType === PlayerActionType.DRAW_INITIAL_CARDS) {
        return { isValid: true };
      }
    }

    // Actions valid during SELECT_ACTIVE_POKEMON
    if (state === MatchState.SELECT_ACTIVE_POKEMON) {
      if (
        actionType === PlayerActionType.SET_ACTIVE_POKEMON ||
        actionType === PlayerActionType.CONCEDE
      ) {
        return { isValid: true };
      }
    }

    // Actions valid during SELECT_BENCH_POKEMON
    if (state === MatchState.SELECT_BENCH_POKEMON) {
      if (
        actionType === PlayerActionType.PLAY_POKEMON ||
        actionType === PlayerActionType.COMPLETE_INITIAL_SETUP ||
        actionType === PlayerActionType.CONCEDE
      ) {
        return { isValid: true };
      }
    }

    // Actions valid during INITIAL_SETUP regardless of phase
    if (state === MatchState.INITIAL_SETUP) {
      if (
        actionType === PlayerActionType.SET_ACTIVE_POKEMON ||
        actionType === PlayerActionType.PLAY_POKEMON ||
        actionType === PlayerActionType.COMPLETE_INITIAL_SETUP
      ) {
        return { isValid: true };
      }
    }

    // Validate action against phase
    if (phase !== null) {
      const phaseValidation = this.validateActionForPhase(phase, actionType);
      if (!phaseValidation.isValid) {
        return phaseValidation;
      }
    }

    return { isValid: true };
  }

  /**
   * Validate if an action is valid for a specific phase
   */
  private validateActionForPhase(
    phase: TurnPhase,
    actionType: PlayerActionType,
  ): { isValid: boolean; error?: ActionValidationError } {
    const phaseActions: Record<TurnPhase, PlayerActionType[]> = {
      [TurnPhase.DRAW]: [PlayerActionType.DRAW_CARD, PlayerActionType.END_TURN],
      [TurnPhase.SETUP]: [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.ATTACH_ENERGY,
        PlayerActionType.PLAY_TRAINER,
        PlayerActionType.EVOLVE_POKEMON,
        PlayerActionType.RETREAT,
        PlayerActionType.USE_ABILITY,
        PlayerActionType.END_TURN,
        PlayerActionType.CONCEDE,
      ],
      [TurnPhase.ATTACK]: [
        PlayerActionType.ATTACK,
        PlayerActionType.END_TURN,
        PlayerActionType.CONCEDE,
      ],
      [TurnPhase.END]: [PlayerActionType.END_TURN, PlayerActionType.CONCEDE],
    };

    const allowedActions = phaseActions[phase] || [];
    if (!allowedActions.includes(actionType)) {
      return {
        isValid: false,
        error: ActionValidationError.INVALID_PHASE,
      };
    }

    return { isValid: true };
  }

  /**
   * Get the next phase after an action
   */
  getNextPhase(
    currentPhase: TurnPhase,
    actionType: PlayerActionType,
  ): TurnPhase | null {
    // If ending turn, return null (will transition to BETWEEN_TURNS)
    if (actionType === PlayerActionType.END_TURN) {
      return null;
    }

    // Phase progression
    if (currentPhase === TurnPhase.DRAW) {
      if (actionType === PlayerActionType.DRAW_CARD) {
        return TurnPhase.SETUP;
      }
    }

    if (currentPhase === TurnPhase.SETUP) {
      // Setup phase can continue until END_TURN
      return TurnPhase.SETUP;
    }

    if (currentPhase === TurnPhase.ATTACK) {
      if (actionType === PlayerActionType.ATTACK) {
        return TurnPhase.END;
      }
    }

    if (currentPhase === TurnPhase.END) {
      return null; // Will transition to BETWEEN_TURNS
    }

    return currentPhase;
  }

  /**
   * Check win conditions
   */
  checkWinConditions(
    player1State: GameState['player1State'],
    player2State: GameState['player2State'],
  ): {
    hasWinner: boolean;
    winner?: PlayerIdentifier;
    winCondition?: string;
  } {
    // Check prize cards
    if (player1State.getPrizeCardsRemaining() === 0) {
      return {
        hasWinner: true,
        winner: PlayerIdentifier.PLAYER1,
        winCondition: 'PRIZE_CARDS',
      };
    }
    if (player2State.getPrizeCardsRemaining() === 0) {
      return {
        hasWinner: true,
        winner: PlayerIdentifier.PLAYER2,
        winCondition: 'PRIZE_CARDS',
      };
    }

    // Check if opponent has no Pokemon
    if (!player2State.hasPokemonInPlay()) {
      return {
        hasWinner: true,
        winner: PlayerIdentifier.PLAYER1,
        winCondition: 'NO_POKEMON',
      };
    }
    if (!player1State.hasPokemonInPlay()) {
      return {
        hasWinner: true,
        winner: PlayerIdentifier.PLAYER2,
        winCondition: 'NO_POKEMON',
      };
    }

    // Check deck out (cannot draw)
    if (player2State.getDeckCount() === 0) {
      return {
        hasWinner: true,
        winner: PlayerIdentifier.PLAYER1,
        winCondition: 'DECK_OUT',
      };
    }
    if (player1State.getDeckCount() === 0) {
      return {
        hasWinner: true,
        winner: PlayerIdentifier.PLAYER2,
        winCondition: 'DECK_OUT',
      };
    }

    return { hasWinner: false };
  }

  /**
   * Get available actions for current state and phase
   */
  getAvailableActions(
    state: MatchState,
    phase: TurnPhase | null,
  ): PlayerActionType[] {
    if (state === MatchState.MATCH_APPROVAL) {
      return [
        PlayerActionType.APPROVE_MATCH,
        PlayerActionType.CONCEDE,
      ];
    }

    if (state === MatchState.DRAWING_CARDS) {
      return [
        PlayerActionType.DRAW_INITIAL_CARDS,
        PlayerActionType.CONCEDE,
      ];
    }

    if (state === MatchState.SELECT_ACTIVE_POKEMON) {
      return [
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.CONCEDE,
      ];
    }

    if (state === MatchState.SELECT_BENCH_POKEMON) {
      return [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    if (state === MatchState.INITIAL_SETUP) {
      return [
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    if (state !== MatchState.PLAYER_TURN || phase === null) {
      return [PlayerActionType.CONCEDE];
    }

    const phaseActions: Record<TurnPhase, PlayerActionType[]> = {
      [TurnPhase.DRAW]: [PlayerActionType.DRAW_CARD, PlayerActionType.END_TURN],
      [TurnPhase.SETUP]: [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.ATTACH_ENERGY,
        PlayerActionType.PLAY_TRAINER,
        PlayerActionType.EVOLVE_POKEMON,
        PlayerActionType.RETREAT,
        PlayerActionType.USE_ABILITY,
        PlayerActionType.END_TURN,
      ],
      [TurnPhase.ATTACK]: [
        PlayerActionType.ATTACK,
        PlayerActionType.END_TURN,
      ],
      [TurnPhase.END]: [PlayerActionType.END_TURN],
    };

    const actions = phaseActions[phase] || [];
    // Always allow concede
    if (!actions.includes(PlayerActionType.CONCEDE)) {
      actions.push(PlayerActionType.CONCEDE);
    }

    return actions;
  }
}

