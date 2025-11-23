import { Match, MatchState, TurnPhase, PlayerIdentifier } from '../../domain';
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

  static fromDomain(match: Match, playerId: string): MatchStateResponseDto {
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
        ? OpponentStateDto.fromDomain(opponentState)
        : OpponentStateDto.empty(),
      availableActions: [], // Would be populated by state machine service
      lastAction: gameState?.lastAction
        ? ActionSummaryDto.fromDomain(gameState.lastAction)
        : undefined,
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
 * Limited state visible to opponent (no hand cards)
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

  static fromDomain(state: PlayerGameState): OpponentStateDto {
    return {
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

