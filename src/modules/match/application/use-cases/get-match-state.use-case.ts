import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
  TurnPhase,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';

/**
 * Get Match State Use Case
 * Retrieves the current state of a match for a specific player
 */
@Injectable()
export class GetMatchStateUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly stateMachineService: MatchStateMachineService,
  ) {}

  async execute(
    matchId: string,
    playerId: string,
  ): Promise<{ match: Match; availableActions: PlayerActionType[] }> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Verify player is part of match
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new NotFoundException('Player is not part of this match');
    }

    // Get available actions from state machine
    const availableActions = this.stateMachineService.getAvailableActions(
      match.state,
      match.gameState?.phase || null,
      match.gameState
        ? {
            lastAction: match.gameState.lastAction
              ? {
                  actionType: match.gameState.lastAction.actionType,
                  playerId: match.gameState.lastAction.playerId,
                  actionData: match.gameState.lastAction.actionData,
                  actionId: match.gameState.lastAction.actionId,
                }
              : null,
            actionHistory: [
              ...match.gameState.actionHistory.map((action) => ({
                actionType: action.actionType,
                playerId: action.playerId,
                actionId: action.actionId,
              })),
              // Include lastAction in history if it exists and isn't already the last item
              ...(match.gameState.lastAction &&
              (match.gameState.actionHistory.length === 0 ||
                match.gameState.actionHistory[match.gameState.actionHistory.length - 1].actionId !==
                  match.gameState.lastAction.actionId)
                ? [
                    {
                      actionType: match.gameState.lastAction.actionType,
                      playerId: match.gameState.lastAction.playerId,
                      actionId: match.gameState.lastAction.actionId,
                    },
                  ]
                : []),
            ],
          }
        : undefined,
      match.currentPlayer || undefined,
    );

    // Filter actions based on player context
    const filteredActions = this.filterActionsForPlayer(
      availableActions,
      match,
      playerIdentifier,
    );

    return { match, availableActions: filteredActions };
  }

  /**
   * Filter available actions based on player context
   */
  private filterActionsForPlayer(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // PLAYER_TURN: only show actions if it's the player's turn
    if (match.state === MatchState.PLAYER_TURN) {
      if (match.currentPlayer !== playerIdentifier) {
        // Not player's turn - check if opponent needs to select active Pokemon after knockout
        const opponentState = match.gameState?.getPlayerState(playerIdentifier);
        const gameState = match.gameState;
        
        if (opponentState?.activePokemon === null && gameState) {
          // Check if knockout occurred and prize was selected
          // We need to find the ATTACK action in history (lastAction might be SELECT_PRIZE now)
          // Find the most recent ATTACK action that caused a knockout
          const knockoutAttack = gameState.actionHistory
            .slice()
            .reverse()
            .find(
              (action) =>
                action.actionType === PlayerActionType.ATTACK &&
                action.actionData?.isKnockedOut === true &&
                action.playerId !== playerIdentifier, // Attack was by opponent (not this player)
            );
          
          if (knockoutAttack) {
            // Find the index of this attack in history
            const attackIndex = gameState.actionHistory.findIndex(
              (action) => action.actionId === knockoutAttack.actionId,
            );
            
            // Check if there's a SELECT_PRIZE after this attack
            const prizeSelected = attackIndex >= 0
              ? gameState.actionHistory.some(
                  (action, index) =>
                    index > attackIndex &&
                    (action.actionType === PlayerActionType.SELECT_PRIZE ||
                      action.actionType === PlayerActionType.DRAW_PRIZE) &&
                    action.playerId === knockoutAttack.playerId,
                )
              : false;
            
            if (prizeSelected) {
              // Prize was selected, opponent can select active Pokemon
              return [PlayerActionType.SET_ACTIVE_POKEMON, PlayerActionType.CONCEDE];
            }
          }
        }
        
        // Not player's turn and no active selection needed - only show CONCEDE
        return [PlayerActionType.CONCEDE];
      }
      
      // Filter out ATTACH_ENERGY if energy was already attached this turn
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (
        playerState?.hasAttachedEnergyThisTurn &&
        match.gameState?.phase === TurnPhase.MAIN_PHASE
      ) {
        actions = actions.filter(
          (action) => action !== PlayerActionType.ATTACH_ENERGY,
        );
      }
      
      // Add GENERATE_COIN_FLIP if coin flip is ready
      if (
        match.gameState?.coinFlipState &&
        match.gameState.coinFlipState.status === 'READY_TO_FLIP' &&
        match.gameState.currentPlayer === playerIdentifier
      ) {
        if (!actions.includes(PlayerActionType.GENERATE_COIN_FLIP)) {
          actions.push(PlayerActionType.GENERATE_COIN_FLIP);
        }
      }
      
      return actions; // Already filtered by state machine
    }

    // DRAWING_CARDS: all players can draw
    if (match.state === MatchState.DRAWING_CARDS) {
      // Check if player already has drawn valid initial hand
      const playerHasDrawnValidHand =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player1HasDrawnValidHand
          : match.player2HasDrawnValidHand;
      
      if (playerHasDrawnValidHand) {
        // Player already has valid initial hand, wait for opponent
        return [PlayerActionType.CONCEDE];
      }
      // Player can draw
      return actions;
    }

    // SELECT_ACTIVE_POKEMON: check if player has set active Pokemon
    if (match.state === MatchState.SELECT_ACTIVE_POKEMON) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (playerState?.activePokemon === null) {
        // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON
        return actions.filter(
          (action) =>
            action === PlayerActionType.SET_ACTIVE_POKEMON ||
            action === PlayerActionType.CONCEDE,
        );
      }
      // Has set active Pokemon, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // SELECT_BENCH_POKEMON: player can play Pokemon or complete setup
    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      const playerReady =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player1ReadyToStart
          : match.player2ReadyToStart;
      
      if (playerReady) {
        // Player is ready, wait for opponent
        return [PlayerActionType.CONCEDE];
      }
      // Player can play Pokemon or complete setup
      return actions;
    }

    // INITIAL_SETUP: check if player has set active Pokemon (legacy state)
    if (match.state === MatchState.INITIAL_SETUP) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (playerState?.activePokemon === null) {
        // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON and PLAY_POKEMON
        return actions.filter(
          (action) =>
            action === PlayerActionType.SET_ACTIVE_POKEMON ||
            action === PlayerActionType.PLAY_POKEMON ||
            action === PlayerActionType.CONCEDE,
        );
      }
      // Has set active Pokemon, allow PLAY_POKEMON and COMPLETE_INITIAL_SETUP
      return [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    // Other states: return as-is (typically just CONCEDE)
    return actions;
  }
}

