import {
  Match,
  MatchState,
  MatchResult,
  PlayerIdentifier,
  WinCondition,
  TurnPhase,
} from '../../domain';
import {
  GameState,
  PlayerGameState,
  CardInstance,
  ActionSummary,
} from '../../domain/value-objects';
import { StatusEffect, PokemonPosition } from '../../domain/enums';

/**
 * JSON structure for match persistence
 */
export interface MatchJson {
  id: string;
  tournamentId: string;
  player1Id: string | null;
  player2Id: string | null;
  player1DeckId: string | null;
  player2DeckId: string | null;
  state: MatchState;
  currentPlayer: PlayerIdentifier | null;
  firstPlayer: PlayerIdentifier | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  winnerId: string | null;
  result: MatchResult | null;
  winCondition: WinCondition | null;
  cancellationReason: string | null;
  gameState: GameStateJson | null;
}

/**
 * JSON structure for game state
 */
export interface GameStateJson {
  player1State: PlayerGameStateJson;
  player2State: PlayerGameStateJson;
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: PlayerIdentifier;
  lastAction: ActionSummaryJson | null;
  actionHistory: ActionSummaryJson[];
}

/**
 * JSON structure for player game state
 */
export interface PlayerGameStateJson {
  deck: string[];
  hand: string[];
  activePokemon: CardInstanceJson | null;
  bench: CardInstanceJson[];
  prizeCards: string[];
  discardPile: string[];
}

/**
 * JSON structure for card instance
 */
export interface CardInstanceJson {
  instanceId: string;
  cardId: string;
  position: PokemonPosition;
  currentHp: number;
  maxHp: number;
  attachedEnergy: string[];
  statusEffect: StatusEffect;
  damageCounters: number;
}

/**
 * JSON structure for action summary
 */
export interface ActionSummaryJson {
  actionId: string;
  playerId: PlayerIdentifier;
  actionType: string;
  timestamp: string;
  actionData: Record<string, unknown>;
}

/**
 * Match Mapper
 * Maps between Match domain entity and JSON structure
 */
export class MatchMapper {
  /**
   * Convert domain entity to JSON
   */
  static toJson(match: Match): MatchJson {
    return {
      id: match.id,
      tournamentId: match.tournamentId,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1DeckId: match.player1DeckId,
      player2DeckId: match.player2DeckId,
      state: match.state,
      currentPlayer: match.currentPlayer,
      firstPlayer: match.firstPlayer,
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
      startedAt: match.startedAt?.toISOString() || null,
      endedAt: match.endedAt?.toISOString() || null,
      winnerId: match.winnerId,
      result: match.result,
      winCondition: match.winCondition,
      cancellationReason: match.cancellationReason,
      gameState: match.gameState ? this.gameStateToJson(match.gameState) : null,
    };
  }

  /**
   * Convert JSON to domain entity
   * Note: This is a simplified restoration. Full state restoration would require
   * calling state transition methods in the correct order or adding a restore method to Match entity.
   */
  static toDomain(json: MatchJson): Match {
    const match = new Match(json.id, json.tournamentId, new Date(json.createdAt));

    // Restore players by calling assignPlayer (this will set state appropriately)
    // We need to bypass state checks for restoration, so we'll need to handle this carefully
    // For now, we'll restore in a way that works with the current state machine

    // If match is in CREATED or WAITING_FOR_PLAYERS, we can assign players normally
    if (
      json.state === MatchState.CREATED ||
      json.state === MatchState.WAITING_FOR_PLAYERS
    ) {
      if (json.player1Id && json.player1DeckId) {
        try {
          match.assignPlayer(
            json.player1Id,
            json.player1DeckId,
            PlayerIdentifier.PLAYER1,
          );
        } catch {
          // Player already assigned or state mismatch - continue
        }
      }
      if (json.player2Id && json.player2DeckId) {
        try {
          match.assignPlayer(
            json.player2Id,
            json.player2DeckId,
            PlayerIdentifier.PLAYER2,
          );
        } catch {
          // Player already assigned or state mismatch - continue
        }
      }
    }

    // For more advanced states, we would need to add restore methods to Match entity
    // For now, this basic restoration works for initial states
    // Full implementation would require:
    // 1. A Match.restoreFromJson() method, or
    // 2. A builder pattern, or
    // 3. Making Match fields protected and using a subclass for restoration

    return match;
  }

  /**
   * Convert GameState to JSON
   */
  private static gameStateToJson(gameState: GameState): GameStateJson {
    return {
      player1State: this.playerGameStateToJson(gameState.player1State),
      player2State: this.playerGameStateToJson(gameState.player2State),
      turnNumber: gameState.turnNumber,
      phase: gameState.phase,
      currentPlayer: gameState.currentPlayer,
      lastAction: gameState.lastAction
        ? this.actionSummaryToJson(gameState.lastAction)
        : null,
      actionHistory: gameState.actionHistory.map((action) =>
        this.actionSummaryToJson(action),
      ),
    };
  }

  /**
   * Convert JSON to GameState
   */
  private static gameStateFromJson(json: GameStateJson): GameState {
    return new GameState(
      this.playerGameStateFromJson(json.player1State),
      this.playerGameStateFromJson(json.player2State),
      json.turnNumber,
      json.phase,
      json.currentPlayer,
      json.lastAction
        ? this.actionSummaryFromJson(json.lastAction)
        : null,
      json.actionHistory.map((action) => this.actionSummaryFromJson(action)),
    );
  }

  /**
   * Convert PlayerGameState to JSON
   */
  private static playerGameStateToJson(
    state: PlayerGameState,
  ): PlayerGameStateJson {
    return {
      deck: state.deck,
      hand: state.hand,
      activePokemon: state.activePokemon
        ? this.cardInstanceToJson(state.activePokemon)
        : null,
      bench: state.bench.map((card) => this.cardInstanceToJson(card)),
      prizeCards: state.prizeCards,
      discardPile: state.discardPile,
    };
  }

  /**
   * Convert JSON to PlayerGameState
   */
  private static playerGameStateFromJson(
    json: PlayerGameStateJson,
  ): PlayerGameState {
    return new PlayerGameState(
      json.deck,
      json.hand,
      json.activePokemon
        ? this.cardInstanceFromJson(json.activePokemon)
        : null,
      json.bench.map((card) => this.cardInstanceFromJson(card)),
      json.prizeCards,
      json.discardPile,
    );
  }

  /**
   * Convert CardInstance to JSON
   */
  private static cardInstanceToJson(card: CardInstance): CardInstanceJson {
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

  /**
   * Convert JSON to CardInstance
   */
  private static cardInstanceFromJson(json: CardInstanceJson): CardInstance {
    return new CardInstance(
      json.instanceId,
      json.cardId,
      json.position,
      json.currentHp,
      json.maxHp,
      json.attachedEnergy,
      json.statusEffect,
      json.damageCounters,
    );
  }

  /**
   * Convert ActionSummary to JSON
   */
  private static actionSummaryToJson(action: ActionSummary): ActionSummaryJson {
    return {
      actionId: action.actionId,
      playerId: action.playerId,
      actionType: action.actionType,
      timestamp: action.timestamp.toISOString(),
      actionData: action.actionData,
    };
  }

  /**
   * Convert JSON to ActionSummary
   */
  private static actionSummaryFromJson(json: ActionSummaryJson): ActionSummary {
    return new ActionSummary(
      json.actionId,
      json.playerId,
      json.actionType as any, // Will be properly typed
      new Date(json.timestamp),
      json.actionData,
    );
  }
}

