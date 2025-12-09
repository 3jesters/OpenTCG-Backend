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
      [TurnPhase.DRAW]: [PlayerActionType.DRAW_CARD, PlayerActionType.END_TURN],
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
   * Check if prize selection is pending after a knockout
   */
  /**
   * Check if prize selection is pending after a knockout
   * @deprecated This method is kept for reference but the logic is now inlined in getAvailableActions for better reliability
   */
  private hasPendingPrizeSelection(
    gameState: { lastAction: { actionType: PlayerActionType; playerId: PlayerIdentifier; actionData?: any; actionId?: string } | null; actionHistory: Array<{ actionType: PlayerActionType; playerId: PlayerIdentifier; actionId?: string }> },
    currentPlayer: PlayerIdentifier,
  ): boolean {
    if (!gameState?.lastAction) return false;
    
    const lastAction = gameState.lastAction;
    
    // Must be an ATTACK that caused a knockout by the current player
    if (
      lastAction.actionType !== PlayerActionType.ATTACK ||
      !lastAction.actionData?.isKnockedOut ||
      lastAction.playerId !== currentPlayer
    ) {
      return false;
    }
    
    // Find the lastAction in actionHistory by actionId (if available)
    let lastActionIndex = -1;
    
    if (lastAction.actionId) {
      lastActionIndex = gameState.actionHistory.findIndex(
        (action) => action.actionId === lastAction.actionId
      );
    }
    
    // Fallback: if not found by actionId, check if last item matches
    if (lastActionIndex < 0 && gameState.actionHistory.length > 0) {
      const lastHistoryItem = gameState.actionHistory[gameState.actionHistory.length - 1];
      if (
        lastHistoryItem.actionType === lastAction.actionType &&
        lastHistoryItem.playerId === lastAction.playerId
      ) {
        lastActionIndex = gameState.actionHistory.length - 1;
      }
    }
    
    // If not found, assume prize not selected
    if (lastActionIndex < 0) return true;
    
    // Check if there's a SELECT_PRIZE after this attack by the same player
    const prizeSelected = gameState.actionHistory.some(
      (action, index) =>
        index > lastActionIndex &&
        action.actionType === PlayerActionType.SELECT_PRIZE &&
        action.playerId === currentPlayer
    );
    
    return !prizeSelected;
  }

  /**
   * Get available actions for current state and phase
   */
  getAvailableActions(
    state: MatchState,
    phase: TurnPhase | null,
    gameState?: { lastAction: { actionType: PlayerActionType; playerId: PlayerIdentifier; actionData?: any; actionId?: string } | null; actionHistory: Array<{ actionType: PlayerActionType; playerId: PlayerIdentifier; actionId?: string }> },
    currentPlayer?: PlayerIdentifier,
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

    if (state === MatchState.SET_PRIZE_CARDS) {
      return [
        PlayerActionType.SET_PRIZE_CARDS,
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

    if (state === MatchState.FIRST_PLAYER_SELECTION) {
      return [
        PlayerActionType.CONFIRM_FIRST_PLAYER,
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

    // Terminal states should not allow CONCEDE
    if (state === MatchState.CANCELLED || state === MatchState.MATCH_ENDED) {
      return [];
    }

    if (state !== MatchState.PLAYER_TURN) {
      return [PlayerActionType.CONCEDE];
    }

    // If phase is null, return CONCEDE only
    if (phase === null) {
      return [PlayerActionType.CONCEDE];
    }

    const phaseActions: Record<TurnPhase, PlayerActionType[]> = {
      [TurnPhase.DRAW]: [PlayerActionType.DRAW_CARD, PlayerActionType.END_TURN],
      [TurnPhase.MAIN_PHASE]: [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.ATTACH_ENERGY,
        PlayerActionType.PLAY_TRAINER,
        PlayerActionType.EVOLVE_POKEMON,
        PlayerActionType.RETREAT,
        PlayerActionType.USE_ABILITY,
        PlayerActionType.ATTACK,
        PlayerActionType.END_TURN,
      ],
      [TurnPhase.ATTACK]: [
        PlayerActionType.ATTACK,
        PlayerActionType.GENERATE_COIN_FLIP,
        PlayerActionType.END_TURN,
      ],
      [TurnPhase.END]: [PlayerActionType.END_TURN],
    };

    // Explicitly handle DRAW phase to ensure DRAW_CARD is always included
    let actions: PlayerActionType[];
    if (phase === TurnPhase.DRAW) {
      actions = [PlayerActionType.DRAW_CARD, PlayerActionType.END_TURN];
    } else {
      actions = phaseActions[phase] || [];
    }
    
    // If in END phase and knockout occurred, require SELECT_PRIZE before END_TURN
    if (
      phase === TurnPhase.END &&
      gameState &&
      currentPlayer &&
      gameState.lastAction &&
      gameState.lastAction.actionType === PlayerActionType.ATTACK &&
      gameState.lastAction.actionData?.isKnockedOut === true &&
      gameState.lastAction.playerId === currentPlayer
    ) {
      // Check if prize was already selected by looking for SELECT_PRIZE after the last ATTACK
      const lastActionId = gameState.lastAction.actionId;
      const lastActionIndex = lastActionId
        ? gameState.actionHistory.findIndex((action) => action.actionId === lastActionId)
        : -1;
      
      // If not found by actionId, check if last item matches
      const effectiveIndex = lastActionIndex >= 0
        ? lastActionIndex
        : (gameState.actionHistory.length > 0 &&
           gameState.actionHistory[gameState.actionHistory.length - 1].actionType === PlayerActionType.ATTACK &&
           gameState.actionHistory[gameState.actionHistory.length - 1].playerId === currentPlayer)
          ? gameState.actionHistory.length - 1
          : -1;
      
      // Check if there's a SELECT_PRIZE or DRAW_PRIZE after this attack
      const prizeSelected = effectiveIndex >= 0
        ? gameState.actionHistory.some(
            (action, index) =>
              index > effectiveIndex &&
              (action.actionType === PlayerActionType.SELECT_PRIZE ||
                action.actionType === PlayerActionType.DRAW_PRIZE) &&
              action.playerId === currentPlayer
          )
        : false;
      
      if (!prizeSelected) {
        // Remove END_TURN and add SELECT_PRIZE
        actions = actions.filter((action) => action !== PlayerActionType.END_TURN);
        actions.push(PlayerActionType.SELECT_PRIZE);
      }
    }
    
    // Always allow concede
    if (!actions.includes(PlayerActionType.CONCEDE)) {
      actions.push(PlayerActionType.CONCEDE);
    }

    return actions;
  }
}

