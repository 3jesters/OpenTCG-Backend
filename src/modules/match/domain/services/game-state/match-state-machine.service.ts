import {
  MatchState,
  PlayerIdentifier,
  TurnPhase,
  PlayerActionType,
  ActionValidationError,
} from '../../enums';
import { GameState } from '../../value-objects';
import { AvailableActionsRegistry } from './available-actions';

/**
 * Match State Machine Service
 * Handles state transitions and validation for match state machine
 * Domain service - contains business logic for state transitions
 */
export class MatchStateMachineService {
  private readonly availableActionsRegistry: AvailableActionsRegistry;

  constructor() {
    this.availableActionsRegistry = new AvailableActionsRegistry();
  }
  /**
   * Check if a state transition is valid
   */
  canTransition(fromState: MatchState, toState: MatchState): boolean {
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
        MatchState.SET_PRIZE_CARDS,
        MatchState.CANCELLED,
      ],
      [MatchState.SET_PRIZE_CARDS]: [
        MatchState.SELECT_ACTIVE_POKEMON,
        MatchState.CANCELLED,
      ],
      [MatchState.SELECT_ACTIVE_POKEMON]: [
        MatchState.SELECT_BENCH_POKEMON,
        MatchState.CANCELLED,
      ],
      [MatchState.SELECT_BENCH_POKEMON]: [
        MatchState.FIRST_PLAYER_SELECTION,
        MatchState.CANCELLED,
      ],
      [MatchState.FIRST_PLAYER_SELECTION]: [
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
      MatchState.SET_PRIZE_CARDS,
      MatchState.SELECT_ACTIVE_POKEMON,
      MatchState.SELECT_BENCH_POKEMON,
      MatchState.FIRST_PLAYER_SELECTION,
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
      // Allow SET_ACTIVE_POKEMON for opponent when their active Pokemon is null (after knockout)
      if (actionType === PlayerActionType.SET_ACTIVE_POKEMON) {
        return { isValid: true }; // Will be validated in use case that opponent's active is null
      }
      // Allow GENERATE_COIN_FLIP for both players when coin flip is in progress (for ATTACK context)
      // Will be validated in use case that coin flip state exists and is ready
      if (actionType === PlayerActionType.GENERATE_COIN_FLIP) {
        return { isValid: true };
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

    // Actions valid during SET_PRIZE_CARDS
    if (state === MatchState.SET_PRIZE_CARDS) {
      if (
        actionType === PlayerActionType.SET_PRIZE_CARDS ||
        actionType === PlayerActionType.CONCEDE
      ) {
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

    // Actions valid during FIRST_PLAYER_SELECTION
    if (state === MatchState.FIRST_PLAYER_SELECTION) {
      if (
        actionType === PlayerActionType.CONFIRM_FIRST_PLAYER ||
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
      [TurnPhase.DRAW]: [PlayerActionType.DRAW_CARD],
      [TurnPhase.MAIN_PHASE]: [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.ATTACH_ENERGY,
        PlayerActionType.PLAY_TRAINER,
        PlayerActionType.EVOLVE_POKEMON,
        PlayerActionType.RETREAT,
        PlayerActionType.USE_ABILITY,
        PlayerActionType.ATTACK, // Allow attack from MAIN_PHASE
        PlayerActionType.END_TURN,
        PlayerActionType.CONCEDE,
      ],
      [TurnPhase.ATTACK]: [
        PlayerActionType.ATTACK,
        PlayerActionType.GENERATE_COIN_FLIP,
        PlayerActionType.END_TURN,
        PlayerActionType.CONCEDE,
      ],
      [TurnPhase.END]: [
        PlayerActionType.SELECT_PRIZE,
        PlayerActionType.DRAW_PRIZE, // Alias for SELECT_PRIZE (client compatibility)
        PlayerActionType.SET_ACTIVE_POKEMON, // Allow selecting active Pokemon after knockout
        PlayerActionType.END_TURN,
        PlayerActionType.CONCEDE,
      ],
      [TurnPhase.SELECT_ACTIVE_POKEMON]: [
        PlayerActionType.SET_ACTIVE_POKEMON, // Select active Pokemon from bench
        PlayerActionType.END_TURN, // Allow ending turn after selecting (if both players selected in double knockout)
        PlayerActionType.CONCEDE,
      ],
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
        return TurnPhase.MAIN_PHASE;
      }
    }

    if (currentPhase === TurnPhase.MAIN_PHASE) {
      // Main phase can continue until END_TURN
      return TurnPhase.MAIN_PHASE;
    }

    if (currentPhase === TurnPhase.ATTACK) {
      if (actionType === PlayerActionType.ATTACK) {
        return TurnPhase.END;
      }
    }

    if (currentPhase === TurnPhase.END) {
      return null; // Will transition to BETWEEN_TURNS
    }

    if (currentPhase === TurnPhase.SELECT_ACTIVE_POKEMON) {
      if (actionType === PlayerActionType.SET_ACTIVE_POKEMON) {
        // After selecting active Pokemon, transition back to END phase
        return TurnPhase.END;
      }
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
   * Delegates to AvailableActionsRegistry for cleaner separation of concerns
   */
  getAvailableActions(
    state: MatchState,
    phase: TurnPhase | null,
    gameState?: {
      lastAction: {
        actionType: PlayerActionType;
        playerId: PlayerIdentifier;
        actionData?: any;
        actionId?: string;
      } | null;
      actionHistory: Array<{
        actionType: PlayerActionType;
        playerId: PlayerIdentifier;
        actionId?: string;
      }>;
      player1State?: any;
      player2State?: any;
    },
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    return this.availableActionsRegistry.getAvailableActions(
      state,
      phase,
      gameState,
      currentPlayer,
    );
  }
}
