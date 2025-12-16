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
  CoinFlipState,
  CoinFlipResult,
  CoinFlipConfiguration,
} from '../../domain/value-objects';
import { StatusEffect, PokemonPosition } from '../../domain/enums';
import { CoinFlipStatus } from '../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../domain/enums/coin-flip-context.enum';
import { CoinFlipCountType, DamageCalculationType, VariableCoinCountSource } from '../../domain/value-objects/coin-flip-configuration.value-object';
import { EnergyType } from '../../../card/domain/enums';

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
  coinTossResult?: PlayerIdentifier | null; // Deprecated: kept for backward compatibility, use firstPlayer instead
  player1HasDrawnValidHand: boolean;
  player2HasDrawnValidHand: boolean;
  player1HasSetPrizeCards?: boolean;
  player2HasSetPrizeCards?: boolean;
  player1ReadyToStart: boolean;
  player2ReadyToStart: boolean;
  player1HasConfirmedFirstPlayer?: boolean;
  player2HasConfirmedFirstPlayer?: boolean;
  player1HasApprovedMatch?: boolean;
  player2HasApprovedMatch?: boolean;
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
  coinFlipState?: CoinFlipStateJson | null;
  abilityUsageThisTurn?: Record<PlayerIdentifier, string[]>; // Optional for backward compatibility
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
  hasAttachedEnergyThisTurn?: boolean; // Optional for backward compatibility
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
  statusEffect?: StatusEffect; // Deprecated: use statusEffects instead (for backward compatibility)
  statusEffects?: StatusEffect[]; // Array of status conditions (can have multiple)
  damageCounters?: number; // Optional for backward compatibility (calculated from HP if not present)
  evolutionChain?: string[]; // Optional for backward compatibility
  poisonDamageAmount?: number; // Optional, poison damage amount (10 or 20)
  evolvedAt?: number; // Optional, turn number when this Pokemon was evolved
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
 * JSON structure for coin flip state
 */
export interface CoinFlipStateJson {
  status: CoinFlipStatus;
  context: CoinFlipContext;
  configuration: CoinFlipConfigurationJson;
  results: CoinFlipResultJson[];
  attackIndex?: number;
  pokemonInstanceId?: string;
  statusEffect?: string;
  actionId?: string;
  player1HasApproved?: boolean;
  player2HasApproved?: boolean;
}

/**
 * JSON structure for coin flip result
 */
export interface CoinFlipResultJson {
  flipIndex: number;
  result: 'heads' | 'tails';
  seed: number;
}

/**
 * JSON structure for coin flip configuration
 */
export interface CoinFlipConfigurationJson {
  countType: CoinFlipCountType;
  fixedCount?: number;
  variableSource?: VariableCoinCountSource;
  energyType?: EnergyType;
  damageCalculationType: DamageCalculationType;
  baseDamage: number;
  damagePerHead?: number;
  conditionalBonus?: number;
  selfDamageOnTails?: number;
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
      player1HasDrawnValidHand: match.player1HasDrawnValidHand,
      player2HasDrawnValidHand: match.player2HasDrawnValidHand,
      player1HasSetPrizeCards: match.player1HasSetPrizeCards,
      player2HasSetPrizeCards: match.player2HasSetPrizeCards,
      player1ReadyToStart: match.player1ReadyToStart,
      player2ReadyToStart: match.player2ReadyToStart,
      player1HasConfirmedFirstPlayer: match.player1HasConfirmedFirstPlayer,
      player2HasConfirmedFirstPlayer: match.player2HasConfirmedFirstPlayer,
      player1HasApprovedMatch: match.player1HasApprovedMatch,
      player2HasApprovedMatch: match.player2HasApprovedMatch,
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
   * Uses Match.restore() to properly restore all match state from persisted data
   */
  static toDomain(json: MatchJson): Match {
    const gameState = json.gameState
      ? this.gameStateFromJson(json.gameState)
      : null;

    return Match.restore(
      json.id,
      json.tournamentId,
      new Date(json.createdAt),
      new Date(json.updatedAt),
      json.player1Id,
      json.player2Id,
      json.player1DeckId,
      json.player2DeckId,
      json.state,
      json.currentPlayer,
      // Handle backward compatibility: use coinTossResult if firstPlayer is null (old data)
      json.firstPlayer ?? json.coinTossResult ?? null,
      json.player1HasDrawnValidHand ?? false,
      json.player2HasDrawnValidHand ?? false,
      json.player1HasSetPrizeCards ?? false,
      json.player2HasSetPrizeCards ?? false,
      json.player1ReadyToStart ?? false,
      json.player2ReadyToStart ?? false,
      json.player1HasConfirmedFirstPlayer ?? false,
      json.player2HasConfirmedFirstPlayer ?? false,
      json.startedAt ? new Date(json.startedAt) : null,
      json.endedAt ? new Date(json.endedAt) : null,
      json.winnerId,
      json.result,
      json.winCondition,
      json.cancellationReason,
      gameState,
      json.player1HasApprovedMatch,
      json.player2HasApprovedMatch,
    );
  }

  /**
   * Convert GameState to JSON
   */
  private static gameStateToJson(gameState: GameState): GameStateJson {
    // Convert Map<PlayerIdentifier, Set<string>> to Record<PlayerIdentifier, string[]>
    const abilityUsageJson: Record<PlayerIdentifier, string[]> = {
      [PlayerIdentifier.PLAYER1]: [],
      [PlayerIdentifier.PLAYER2]: [],
    };
    gameState.abilityUsageThisTurn.forEach((cardIds, playerId) => {
      abilityUsageJson[playerId] = Array.from(cardIds);
    });

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
      coinFlipState: gameState.coinFlipState
        ? this.coinFlipStateToJson(gameState.coinFlipState)
        : null,
      abilityUsageThisTurn: Object.keys(abilityUsageJson).length > 0 ? abilityUsageJson : undefined,
    };
  }

  /**
   * Convert JSON to GameState
   */
  private static gameStateFromJson(json: GameStateJson): GameState {
    // Convert Record<PlayerIdentifier, string[]> to Map<PlayerIdentifier, Set<string>>
    const abilityUsageMap = new Map<PlayerIdentifier, Set<string>>();
    if (json.abilityUsageThisTurn) {
      Object.entries(json.abilityUsageThisTurn).forEach(([playerId, cardIds]) => {
        abilityUsageMap.set(playerId as PlayerIdentifier, new Set(cardIds));
      });
    }

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
      json.coinFlipState ? this.coinFlipStateFromJson(json.coinFlipState) : null,
      abilityUsageMap,
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
      hasAttachedEnergyThisTurn: state.hasAttachedEnergyThisTurn,
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
      json.hasAttachedEnergyThisTurn ?? false, // Default to false for backward compatibility
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
      statusEffect: card.getPrimaryStatusEffect(), // Backward compatibility
      damageCounters: card.getDamageCounters(), // Calculate from HP for backward compatibility
      evolutionChain: card.evolutionChain || [],
      poisonDamageAmount: card.poisonDamageAmount,
      evolvedAt: card.evolvedAt,
    };
  }

  /**
   * Convert JSON to CardInstance
   */
  private static cardInstanceFromJson(json: CardInstanceJson): CardInstance {
    // Calculate damageCounters from HP for backward compatibility (if not present in JSON)
    // Note: We don't use damageCounters in CardInstance anymore, but we validate it matches
    const calculatedDamageCounters = json.maxHp - json.currentHp;
    if (json.damageCounters !== undefined && json.damageCounters !== calculatedDamageCounters) {
      // Log warning but use calculated value (HP is source of truth)
      // Note: This is expected during migration from stored damageCounters to computed values
      // In production, we can remove this warning after all matches are migrated
      if (process.env.NODE_ENV !== 'test') {
        // Use console.warn here since MatchMapper is a static utility class without Logger injection
        console.warn(
          `CardInstance ${json.instanceId}: damageCounters mismatch. JSON: ${json.damageCounters}, Calculated: ${calculatedDamageCounters}. Using calculated value.`,
        );
      }
    }
    
    // Support both old format (statusEffect) and new format (statusEffects)
    const statusEffects = json.statusEffects !== undefined
      ? json.statusEffects
      : (json.statusEffect && json.statusEffect !== StatusEffect.NONE)
        ? [json.statusEffect]
        : [];
    
    return new CardInstance(
      json.instanceId,
      json.cardId,
      json.position,
      json.currentHp,
      json.maxHp,
      json.attachedEnergy,
      statusEffects,
      json.evolutionChain || [],
      json.poisonDamageAmount,
      json.evolvedAt, // Default to undefined for backward compatibility
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

  /**
   * Convert CoinFlipState to JSON
   */
  private static coinFlipStateToJson(state: CoinFlipState): CoinFlipStateJson {
    return {
      status: state.status,
      context: state.context,
      configuration: this.coinFlipConfigurationToJson(state.configuration),
      results: state.results.map((r) => this.coinFlipResultToJson(r)),
      attackIndex: state.attackIndex,
      pokemonInstanceId: state.pokemonInstanceId,
      statusEffect: state.statusEffect,
      actionId: state.actionId,
      player1HasApproved: state.player1HasApproved,
      player2HasApproved: state.player2HasApproved,
    };
  }

  /**
   * Convert JSON to CoinFlipState
   */
  private static coinFlipStateFromJson(json: CoinFlipStateJson): CoinFlipState {
    return new CoinFlipState(
      this.validateCoinFlipStatus(json.status),
      this.validateCoinFlipContext(json.context),
      this.coinFlipConfigurationFromJson(json.configuration),
      json.results.map((r) => this.coinFlipResultFromJson(r)),
      json.attackIndex,
      json.pokemonInstanceId,
      json.statusEffect,
      json.actionId,
      json.player1HasApproved ?? false,
      json.player2HasApproved ?? false,
    );
  }

  /**
   * Convert CoinFlipResult to JSON
   */
  private static coinFlipResultToJson(result: CoinFlipResult): CoinFlipResultJson {
    return {
      flipIndex: result.flipIndex,
      result: result.result,
      seed: result.seed,
    };
  }

  /**
   * Convert JSON to CoinFlipResult
   */
  private static coinFlipResultFromJson(json: CoinFlipResultJson): CoinFlipResult {
    return new CoinFlipResult(json.flipIndex, json.result, json.seed);
  }

  /**
   * Convert CoinFlipConfiguration to JSON
   */
  private static coinFlipConfigurationToJson(
    config: CoinFlipConfiguration,
  ): CoinFlipConfigurationJson {
    return {
      countType: config.countType,
      fixedCount: config.fixedCount,
      variableSource: config.variableSource,
      energyType: config.energyType,
      damageCalculationType: config.damageCalculationType,
      baseDamage: config.baseDamage,
      damagePerHead: config.damagePerHead,
      conditionalBonus: config.conditionalBonus,
      selfDamageOnTails: config.selfDamageOnTails,
    };
  }

  /**
   * Convert JSON to CoinFlipConfiguration
   */
  private static coinFlipConfigurationFromJson(
    json: CoinFlipConfigurationJson,
  ): CoinFlipConfiguration {
    return new CoinFlipConfiguration(
      this.validateCoinFlipCountType(json.countType),
      json.fixedCount,
      json.variableSource ? this.validateVariableCoinCountSource(json.variableSource) : undefined,
      json.energyType,
      this.validateDamageCalculationType(json.damageCalculationType),
      json.baseDamage,
      json.damagePerHead,
      json.conditionalBonus,
      json.selfDamageOnTails,
    );
  }

  /**
   * Validate and convert string to CoinFlipStatus enum
   */
  private static validateCoinFlipStatus(value: string): CoinFlipStatus {
    if (Object.values(CoinFlipStatus).includes(value as CoinFlipStatus)) {
      return value as CoinFlipStatus;
    }
    throw new Error(`Invalid CoinFlipStatus: ${value}`);
  }

  /**
   * Validate and convert string to CoinFlipContext enum
   */
  private static validateCoinFlipContext(value: string): CoinFlipContext {
    if (Object.values(CoinFlipContext).includes(value as CoinFlipContext)) {
      return value as CoinFlipContext;
    }
    throw new Error(`Invalid CoinFlipContext: ${value}`);
  }

  /**
   * Validate and convert string to CoinFlipCountType enum
   */
  private static validateCoinFlipCountType(value: string): CoinFlipCountType {
    if (Object.values(CoinFlipCountType).includes(value as CoinFlipCountType)) {
      return value as CoinFlipCountType;
    }
    throw new Error(`Invalid CoinFlipCountType: ${value}`);
  }

  /**
   * Validate and convert string to VariableCoinCountSource enum
   */
  private static validateVariableCoinCountSource(value: string): VariableCoinCountSource {
    if (Object.values(VariableCoinCountSource).includes(value as VariableCoinCountSource)) {
      return value as VariableCoinCountSource;
    }
    throw new Error(`Invalid VariableCoinCountSource: ${value}`);
  }

  /**
   * Validate and convert string to DamageCalculationType enum
   */
  private static validateDamageCalculationType(value: string): DamageCalculationType {
    if (Object.values(DamageCalculationType).includes(value as DamageCalculationType)) {
      return value as DamageCalculationType;
    }
    throw new Error(`Invalid DamageCalculationType: ${value}`);
  }
}

