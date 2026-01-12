import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  TurnPhase,
  PlayerActionType,
  ActionSummary,
  StatusEffect,
  PokemonPosition,
} from '../../domain';
import { PlayerGameState, CardInstance } from '../../domain/value-objects';
import { IMatchRepository } from '../../domain/repositories';
import { CardHelperService } from './card-helper.service';
import { Card } from '../../../card/domain/entities';
import { v4 as uuidv4 } from 'uuid';

export interface SetActivePokemonPlayerTurnParams {
  cardId: string;
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
  cardsMap: Map<string, Card>;
  getCardHp: (cardId: string) => Promise<number>;
}

@Injectable()
export class SetActivePokemonPlayerTurnService {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly cardHelper: CardHelperService,
  ) {}

  /**
   * Execute setting active Pokemon in PLAYER_TURN state (after knockout)
   */
  async executeSetActivePokemon(
    params: SetActivePokemonPlayerTurnParams,
  ): Promise<Match> {
    const { cardId, match, gameState, playerIdentifier, cardsMap, getCardHp } =
      params;

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Validate that player needs to select active Pokemon
    if (playerState.activePokemon !== null) {
      throw new BadRequestException(
        'Cannot set active Pokemon when one already exists',
      );
    }

    // Validate prize was selected after knockout
    this.validatePrizeSelectedAfterKnockout(gameState, playerIdentifier);

    // Check if card is in hand or on bench
    const isInHand = playerState.hand.includes(cardId);
    const benchIndex = playerState.bench.findIndex((p) => p.cardId === cardId);
    const isOnBench = benchIndex !== -1;

    if (!isInHand && !isOnBench) {
      throw new BadRequestException('Card must be in hand or on bench');
    }

    let activePokemon: CardInstance;
    let updatedHand = playerState.hand;
    let updatedBench = playerState.bench;

    if (isInHand) {
      // Card is in hand - create new CardInstance
      activePokemon = await this.createActivePokemonFromHand(
        cardId,
        playerState,
        getCardHp,
      );
      // Remove from hand
      updatedHand = playerState.hand.filter((id) => id !== cardId);
    } else {
      // Card is on bench - move it to active
      const result = this.moveBenchToActive(
        playerState.bench[benchIndex],
        benchIndex,
        playerState.bench,
      );
      activePokemon = result.activePokemon;
      updatedBench = result.updatedBench;
    }

    const updatedPlayerState = new PlayerGameState(
      playerState.deck,
      updatedHand,
      activePokemon,
      updatedBench,
      playerState.prizeCards,
      playerState.discardPile,
      playerState.hasAttachedEnergyThisTurn,
    );

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    // Create action summary (store instanceId and source for reversibility)
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.SET_ACTIVE_POKEMON,
      new Date(),
      {
        cardId,
        instanceId: activePokemon.instanceId,
        source: isInHand ? 'HAND' : `BENCH_${benchIndex}`,
      },
    );

    // In PLAYER_TURN state (after knockout), check if phase should transition
    const nextPhase = this.determineNextPhase(
      updatedGameState,
      playerIdentifier,
    );

    let finalGameState = updatedGameState
      .withPhase(nextPhase)
      .withAction(actionSummary);

    // If transitioning from SELECT_ACTIVE_POKEMON to END phase after status effect knockout,
    // we need to transition to DRAW phase for the next player's turn instead
    if (nextPhase === TurnPhase.END) {
      // Search for the status effect knockout action
      // Check lastAction first, then search action history backwards
      // (lastAction might be SELECT_PRIZE, so we need to look back in history)
      let knockoutAction: ActionSummary | null = null;

      // First check if lastAction is the knockout action (from gameState, before SET_ACTIVE_POKEMON was added)
      if (
        gameState.lastAction &&
        gameState.lastAction.actionType === PlayerActionType.ATTACK &&
        gameState.lastAction.actionData?.isKnockedOut === true &&
        gameState.lastAction.actionData?.knockoutSource === 'STATUS_EFFECT'
      ) {
        knockoutAction = gameState.lastAction;
      } else {
        // Search action history backwards for the status effect knockout action
        // Search in gameState.actionHistory (before SET_ACTIVE_POKEMON was added)
        for (let i = gameState.actionHistory.length - 1; i >= 0; i--) {
          const action = gameState.actionHistory[i];
          if (
            action.actionType === PlayerActionType.ATTACK &&
            action.actionData?.isKnockedOut === true &&
            action.actionData?.knockoutSource === 'STATUS_EFFECT'
          ) {
            knockoutAction = action;
            break;
          }
        }
      }

      if (knockoutAction) {
        // This was a status effect knockout - transition to DRAW phase for the next player's turn
        // We need to find who ended their turn to determine whose turn should start next
        // The END_TURN action happened before the knockout action
        let endTurnAction: ActionSummary | null = null;

        // Find the knockout action index in the history
        // Use gameState.actionHistory since that's where the knockout action is
        const knockoutActionIndex = gameState.actionHistory.findIndex(
          (action) => action === knockoutAction,
        );

        // Find the END_TURN action before the knockout action
        // Search backwards from the knockout action position
        if (knockoutActionIndex >= 0) {
          for (let i = knockoutActionIndex - 1; i >= 0; i--) {
            const action = gameState.actionHistory[i];
            if (action.actionType === PlayerActionType.END_TURN) {
              endTurnAction = action;
              break;
            }
          }
        }

        if (endTurnAction) {
          // endTurnAction.playerId is already a PlayerIdentifier enum, not a string player ID
          // So we can use it directly without calling match.getPlayerIdentifier()
          const playerWhoEndedTurn = endTurnAction.playerId;

          // The next player is the opponent of the one who ended their turn
          const nextPlayer =
            playerWhoEndedTurn === PlayerIdentifier.PLAYER1
              ? PlayerIdentifier.PLAYER2
              : PlayerIdentifier.PLAYER1;

          finalGameState = finalGameState
            .withPhase(TurnPhase.DRAW)
            .withCurrentPlayer(nextPlayer);
        } else {
          // Fallback: use opponent of the one selecting active Pokemon
          // (this shouldn't happen in normal flow, but provides a safe fallback)
          const nextPlayer =
            playerIdentifier === PlayerIdentifier.PLAYER1
              ? PlayerIdentifier.PLAYER2
              : PlayerIdentifier.PLAYER1;
          finalGameState = finalGameState
            .withPhase(TurnPhase.DRAW)
            .withCurrentPlayer(nextPlayer);
        }
      }
    }

    match.updateGameState(finalGameState);
    return await this.matchRepository.save(match);
  }

  /**
   * Validate that prize was selected after knockout
   */
  private validatePrizeSelectedAfterKnockout(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): void {
    if (gameState.phase !== TurnPhase.SELECT_ACTIVE_POKEMON) {
      // Check if attacker has selected prize after knockout
      const lastAction = gameState.lastAction;
      if (
        lastAction &&
        lastAction.actionType === PlayerActionType.ATTACK &&
        lastAction.actionData?.isKnockedOut === true
      ) {
        // Check if prize was selected
        const lastAttackIndex = gameState.actionHistory.findIndex(
          (action) => action === lastAction,
        );
        const prizeSelected = gameState.actionHistory.some(
          (action, index) =>
            index > lastAttackIndex &&
            (action.actionType === PlayerActionType.SELECT_PRIZE ||
              action.actionType === PlayerActionType.DRAW_PRIZE) &&
            action.playerId === lastAction.playerId,
        );

        if (!prizeSelected) {
          throw new BadRequestException(
            'Cannot select active Pokemon. Attacker must select a prize card first.',
          );
        }
      }
    }
  }

  /**
   * Create active Pokemon from hand
   */
  private async createActivePokemonFromHand(
    cardId: string,
    playerState: PlayerGameState,
    getCardHp: (cardId: string) => Promise<number>,
  ): Promise<CardInstance> {
    const cardHp = await getCardHp(cardId);
    return new CardInstance(
      uuidv4(),
      cardId,
      PokemonPosition.ACTIVE,
      cardHp,
      cardHp,
      [],
      [], // No status effects for new Pokemon
      [],
      undefined,
      undefined, // evolvedAt - new Pokemon, not evolved
    );
  }

  /**
   * Move bench Pokemon to active
   */
  private moveBenchToActive(
    benchPokemon: CardInstance,
    benchIndex: number,
    currentBench: CardInstance[],
  ): { activePokemon: CardInstance; updatedBench: CardInstance[] } {
    // Clear all status effects when Pokemon switches/retreats
    const activePokemon = benchPokemon
      .withPosition(PokemonPosition.ACTIVE)
      .withStatusEffectsCleared(); // Clear status effects on switch

    // Remove from bench and renumber positions
    const updatedBench = currentBench
      .filter((_, i) => i !== benchIndex)
      .map((p, newIndex) => {
        const newPosition = `BENCH_${newIndex}` as PokemonPosition;
        // Clear status effects when Pokemon moves positions (retreat/switch)
        return p.withPosition(newPosition).withStatusEffect(StatusEffect.NONE);
      });

    return { activePokemon, updatedBench };
  }

  /**
   * Determine next phase after setting active Pokemon
   */
  private determineNextPhase(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): TurnPhase {
    const opponentState = gameState.getOpponentState(playerIdentifier);
    const attackerState = gameState.getPlayerState(playerIdentifier);

    // Check if both players still need to select (double knockout scenario)
    const opponentNeedsActive =
      opponentState.activePokemon === null && opponentState.bench.length > 0;
    const attackerNeedsActive =
      attackerState.activePokemon === null && attackerState.bench.length > 0;

    if (opponentNeedsActive || attackerNeedsActive) {
      // Still need active Pokemon selection
      return TurnPhase.SELECT_ACTIVE_POKEMON;
    } else {
      // Both players have active Pokemon, transition back to END phase
      return TurnPhase.END;
    }
  }
}
