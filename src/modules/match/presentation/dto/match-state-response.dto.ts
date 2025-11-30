import {
  Match,
  MatchState,
  TurnPhase,
  PlayerIdentifier,
  PlayerActionType,
} from '../../domain';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../domain/value-objects';

/**
 * Match State Response DTO
 * Response DTO for match state from a player's perspective
 */
export class MatchStateResponseDto {
  matchId: string;
  state: MatchState;
  currentPlayer: PlayerIdentifier | null;
  turnNumber: number;
  phase: TurnPhase | null;
  playerState: PlayerStateDto;
  opponentState: OpponentStateDto;
  availableActions: string[];
  lastAction?: ActionSummaryDto;
  playerDeckId: string | null;
  opponentDeckId: string | null;
  coinTossResult: PlayerIdentifier | null;
  playerHasDrawnValidHand: boolean;
  opponentHasDrawnValidHand: boolean;

  static fromDomain(
    match: Match,
    playerId: string,
    availableActions: PlayerActionType[] = [],
  ): MatchStateResponseDto {
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new Error('Player is not part of this match');
    }

    const gameState = match.gameState;
    const playerState = gameState
      ? gameState.getPlayerState(playerIdentifier)
      : null;
    const opponentState = gameState
      ? gameState.getOpponentState(playerIdentifier)
      : null;

    // Determine deck IDs based on player identifier
    const playerDeckId =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1DeckId
        : match.player2DeckId;
    
    // Hide opponent deck ID during MATCH_APPROVAL state until both players approve
    let opponentDeckId: string | null;
    if (match.state === MatchState.MATCH_APPROVAL && !match.hasBothApprovals()) {
      opponentDeckId = null;
    } else {
      opponentDeckId =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player2DeckId
          : match.player1DeckId;
    }

    // Determine if players have drawn valid initial hands
    const playerHasDrawnValidHand =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasDrawnValidHand
        : match.player2HasDrawnValidHand;
    const opponentHasDrawnValidHand =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player2HasDrawnValidHand
        : match.player1HasDrawnValidHand;

    return {
      matchId: match.id,
      state: match.state,
      currentPlayer: match.currentPlayer,
      turnNumber: gameState?.turnNumber || 0,
      phase: gameState?.phase || null,
      playerState: playerState
        ? PlayerStateDto.fromDomain(playerState)
        : PlayerStateDto.empty(),
      opponentState: opponentState
        ? OpponentStateDto.fromDomain(
            opponentState,
            match.state,
            playerState,
            playerHasDrawnValidHand,
            opponentHasDrawnValidHand,
          )
        : OpponentStateDto.empty(),
      availableActions: availableActions.map((action) => action.toString()),
      lastAction: gameState?.lastAction
        ? ActionSummaryDto.fromDomain(gameState.lastAction)
        : undefined,
      playerDeckId,
      opponentDeckId,
      coinTossResult: match.coinTossResult,
      playerHasDrawnValidHand,
      opponentHasDrawnValidHand,
    };
  }
}

/**
 * Player State DTO
 * Full state visible to the player
 */
class PlayerStateDto {
  hand: string[];
  handCount: number;
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlayDto | null;
  bench: PokemonInPlayDto[];
  prizeCardsRemaining: number;
  attachedEnergy: string[];

  static fromDomain(state: PlayerGameState): PlayerStateDto {
    return {
      hand: state.hand,
      handCount: state.getHandCount(),
      deckCount: state.getDeckCount(),
      discardCount: state.discardPile.length,
      activePokemon: state.activePokemon
        ? PokemonInPlayDto.fromDomain(state.activePokemon)
        : null,
      bench: state.bench.map((card) => PokemonInPlayDto.fromDomain(card)),
      prizeCardsRemaining: state.getPrizeCardsRemaining(),
      attachedEnergy: state.activePokemon?.attachedEnergy || [],
    };
  }

  static empty(): PlayerStateDto {
    return {
      hand: [],
      handCount: 0,
      deckCount: 0,
      discardCount: 0,
      activePokemon: null,
      bench: [],
      prizeCardsRemaining: 0,
      attachedEnergy: [],
    };
  }
}

/**
 * Opponent State DTO
 * Limited state visible to opponent (no hand cards, except during INITIAL_SETUP)
 */
class OpponentStateDto {
  handCount: number;
  deckCount: number;
  discardCount: number;
  activePokemon: PokemonInPlayDto | null;
  bench: PokemonInPlayDto[];
  benchCount: number;
  prizeCardsRemaining: number;
  attachedEnergy: string[];
  revealedHand?: string[]; // Opponent's hand revealed during INITIAL_SETUP reshuffle
  drawnCards?: string[]; // Opponent's drawn cards during DRAWING_CARDS (if not validated)
  isDrawing?: boolean; // Indicates opponent is in process of drawing

  static fromDomain(
    state: PlayerGameState,
    matchState: MatchState,
    playerState: PlayerGameState | null,
    playerHasDrawnValidHand: boolean,
    opponentHasDrawnValidHand: boolean,
  ): OpponentStateDto {
    const dto: OpponentStateDto = {
      handCount: state.getHandCount(),
      deckCount: state.getDeckCount(),
      discardCount: state.discardPile.length,
      activePokemon: state.activePokemon
        ? PokemonInPlayDto.fromDomain(state.activePokemon)
        : null,
      bench: state.bench.map((card) => PokemonInPlayDto.fromDomain(card)),
      benchCount: state.bench.length,
      prizeCardsRemaining: state.getPrizeCardsRemaining(),
      attachedEnergy: state.activePokemon?.attachedEnergy || [],
    };

    // During DRAWING_CARDS state
    if (matchState === MatchState.DRAWING_CARDS) {
      // If opponent has drawn but not validated, show their drawn cards
      if (state.hand.length > 0 && !opponentHasDrawnValidHand) {
        dto.drawnCards = state.hand;
        dto.isDrawing = true;
      } else if (!opponentHasDrawnValidHand) {
        // Opponent hasn't drawn yet
        dto.isDrawing = false;
      }
      // If opponent has valid initial hand, don't show cards (just hand count)
    }

    // During INITIAL_SETUP, reveal opponent's hand (it was shown during reshuffle)
    if (matchState === MatchState.INITIAL_SETUP) {
      dto.revealedHand = state.hand;
    }

    // During SELECT_ACTIVE_POKEMON, only show opponent's active Pokemon if player has also selected
    if (matchState === MatchState.SELECT_ACTIVE_POKEMON) {
      // Only show opponent's active Pokemon if player has also selected their own
      const playerHasSelected = playerState?.activePokemon !== null;
      if (!playerHasSelected && state.activePokemon) {
        // Player hasn't selected yet, hide opponent's selection
        dto.activePokemon = null;
      }
    }

    return dto;
  }

  static empty(): OpponentStateDto {
    return {
      handCount: 0,
      deckCount: 0,
      discardCount: 0,
      activePokemon: null,
      bench: [],
      benchCount: 0,
      prizeCardsRemaining: 0,
      attachedEnergy: [],
      revealedHand: undefined,
      drawnCards: undefined,
      isDrawing: undefined,
    };
  }
}

/**
 * Pokemon In Play DTO
 */
class PokemonInPlayDto {
  instanceId: string;
  cardId: string;
  position: string;
  currentHp: number;
  maxHp: number;
  attachedEnergy: string[];
  statusEffect: string;
  damageCounters: number;

  static fromDomain(card: CardInstance): PokemonInPlayDto {
    return {
      instanceId: card.instanceId,
      cardId: card.cardId,
      position: card.position,
      currentHp: card.currentHp,
      maxHp: card.maxHp,
      attachedEnergy: card.attachedEnergy,
      statusEffect: card.statusEffect,
      damageCounters: card.damageCounters,
    };
  }
}

/**
 * Action Summary DTO
 */
class ActionSummaryDto {
  actionId: string;
  playerId: PlayerIdentifier;
  actionType: string;
  timestamp: string;
  actionData: Record<string, unknown>;

  static fromDomain(action: any): ActionSummaryDto {
    return {
      actionId: action.actionId,
      playerId: action.playerId,
      actionType: action.actionType,
      timestamp: action.timestamp.toISOString(),
      actionData: action.actionData,
    };
  }
}

