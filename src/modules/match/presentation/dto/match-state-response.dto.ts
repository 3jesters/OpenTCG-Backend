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
  CoinFlipState,
} from '../../domain/value-objects';
import { CardId } from '../../../../shared/types/card.types';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities';

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
  firstPlayer: PlayerIdentifier | null;
  playerHasDrawnValidHand: boolean;
  opponentHasDrawnValidHand: boolean;
  playerHasApproved: boolean;
  opponentHasApproved: boolean;
  playerHasConfirmedFirstPlayer: boolean;
  opponentHasConfirmedFirstPlayer: boolean;
  canAttachEnergy: boolean;
  coinFlipState?: CoinFlipStateDto | null;
  requiresActivePokemonSelection?: boolean; // True when player needs to select active Pokemon from bench
  playersRequiringActiveSelection?: PlayerIdentifier[]; // Array of players who need to select (for double knockout)
  winnerId?: string | null;
  result?: string | null;
  winCondition?: string | null;
  endedAt?: string | null;

  static async fromDomain(
    match: Match,
    playerId: string,
    availableActions: PlayerActionType[] = [],
    getCardByIdUseCase?: IGetCardByIdUseCase,
  ): Promise<MatchStateResponseDto> {
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
    if (
      match.state === MatchState.MATCH_APPROVAL &&
      !match.hasBothApprovals()
    ) {
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

    // Determine if players have approved the match
    const playerHasApproved =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasApprovedMatch
        : match.player2HasApprovedMatch;
    const opponentHasApproved =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player2HasApprovedMatch
        : match.player1HasApprovedMatch;

    // Determine if players have confirmed first player selection
    const playerHasConfirmedFirstPlayer =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasConfirmedFirstPlayer
        : match.player2HasConfirmedFirstPlayer;
    const opponentHasConfirmedFirstPlayer =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player2HasConfirmedFirstPlayer
        : match.player1HasConfirmedFirstPlayer;

    // Calculate canAttachEnergy - only relevant during PLAYER_TURN state and MAIN_PHASE
    const canAttachEnergy =
      match.state === MatchState.PLAYER_TURN &&
      gameState?.phase === TurnPhase.MAIN_PHASE &&
      match.currentPlayer === playerIdentifier
        ? !playerState?.hasAttachedEnergyThisTurn
        : false;

    // Calculate requiresActivePokemonSelection and playersRequiringActiveSelection
    const requiresActivePokemonSelection =
      gameState?.phase === TurnPhase.SELECT_ACTIVE_POKEMON &&
      playerState?.activePokemon === null &&
      (playerState?.bench.length || 0) > 0;

    const playersRequiringActiveSelection: PlayerIdentifier[] = [];
    if (gameState?.phase === TurnPhase.SELECT_ACTIVE_POKEMON) {
      if (
        gameState.player1State.activePokemon === null &&
        gameState.player1State.bench.length > 0
      ) {
        playersRequiringActiveSelection.push(PlayerIdentifier.PLAYER1);
      }
      if (
        gameState.player2State.activePokemon === null &&
        gameState.player2State.bench.length > 0
      ) {
        playersRequiringActiveSelection.push(PlayerIdentifier.PLAYER2);
      }
    }

    // Always set requiresActivePokemonSelection (false if not needed, true if needed)
    const requiresActivePokemonSelectionValue =
      requiresActivePokemonSelection || false;

    // Collect all unique cardIds from Pokemon in play for batch loading
    const cardIds = new Set<string>();
    if (playerState) {
      if (playerState.activePokemon) {
        cardIds.add(playerState.activePokemon.cardId);
      }
      playerState.bench.forEach((card) => cardIds.add(card.cardId));
    }
    if (opponentState) {
      if (opponentState.activePokemon) {
        cardIds.add(opponentState.activePokemon.cardId);
      }
      opponentState.bench.forEach((card) => cardIds.add(card.cardId));
    }

    // Batch fetch all cards in one query
    const cardsMap =
      getCardByIdUseCase && cardIds.size > 0
        ? await getCardByIdUseCase.getCardsByIds(Array.from(cardIds))
        : new Map<string, Card>();

    return {
      matchId: match.id,
      state: match.state,
      currentPlayer: match.currentPlayer,
      turnNumber: gameState?.turnNumber || 0,
      phase: gameState?.phase || null,
      playerState: playerState
        ? await PlayerStateDto.fromDomain(
            playerState,
            match.state,
            cardsMap,
          )
        : PlayerStateDto.empty(),
      opponentState: opponentState
        ? await OpponentStateDto.fromDomain(
            opponentState,
            match.state,
            playerState,
            playerHasDrawnValidHand,
            opponentHasDrawnValidHand,
            cardsMap,
          )
        : OpponentStateDto.empty(),
      availableActions: availableActions.map((action) => action.toString()),
      lastAction: gameState?.lastAction
        ? ActionSummaryDto.fromDomain(gameState.lastAction)
        : undefined,
      playerDeckId,
      opponentDeckId,
      firstPlayer: match.firstPlayer,
      playerHasDrawnValidHand,
      opponentHasDrawnValidHand,
      playerHasApproved,
      opponentHasApproved,
      playerHasConfirmedFirstPlayer,
      opponentHasConfirmedFirstPlayer,
      canAttachEnergy,
      coinFlipState: gameState?.coinFlipState
        ? CoinFlipStateDto.fromDomain(gameState.coinFlipState)
        : null,
      requiresActivePokemonSelection:
        gameState?.phase === TurnPhase.SELECT_ACTIVE_POKEMON
          ? requiresActivePokemonSelectionValue
          : undefined,
      playersRequiringActiveSelection:
        playersRequiringActiveSelection.length > 0
          ? playersRequiringActiveSelection
          : undefined,
      winnerId: match.winnerId,
      result: match.result,
      winCondition: match.winCondition,
      endedAt: match.endedAt?.toISOString() || null,
    };
  }
}

/**
 * Player State DTO
 * Full state visible to the player
 */
class PlayerStateDto {
  hand: CardId[];
  handCount: number;
  deckCount: number;
  discardCount: number;
  discardPile: CardId[]; // Public discard pile contents
  activePokemon: PokemonInPlayDto | null;
  bench: PokemonInPlayDto[];
  prizeCardsRemaining: number;
  prizeCards: CardId[]; // Prize cards for selection (visible to player)
  attachedEnergy: CardId[];

  static async fromDomain(
    state: PlayerGameState,
    matchState: MatchState,
    cardsMap?: Map<string, Card>,
  ): Promise<PlayerStateDto> {
    // Hide prize card IDs during SET_PRIZE_CARDS phase (only show count)
    const prizeCards =
      matchState === MatchState.SET_PRIZE_CARDS ? [] : state.prizeCards;

    return {
      hand: state.hand,
      handCount: state.getHandCount(),
      deckCount: state.getDeckCount(),
      discardCount: state.discardPile.length,
      discardPile: state.discardPile, // Include discard pile contents
      activePokemon: state.activePokemon
        ? await PokemonInPlayDto.fromDomain(
            state.activePokemon,
            cardsMap,
          )
        : null,
      bench: await Promise.all(
        state.bench.map((card) =>
          PokemonInPlayDto.fromDomain(card, cardsMap),
        ),
      ),
      prizeCardsRemaining: state.getPrizeCardsRemaining(),
      prizeCards, // Hide prize card IDs during SET_PRIZE_CARDS phase
      attachedEnergy: state.activePokemon?.attachedEnergy || [],
    };
  }

  static empty(): PlayerStateDto {
    return {
      hand: [],
      handCount: 0,
      deckCount: 0,
      discardCount: 0,
      discardPile: [],
      activePokemon: null,
      bench: [],
      prizeCardsRemaining: 0,
      prizeCards: [],
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
  discardPile: CardId[]; // Public discard pile contents
  activePokemon: PokemonInPlayDto | null;
  bench: PokemonInPlayDto[];
  benchCount: number;
  prizeCardsRemaining: number;
  attachedEnergy: CardId[];
  revealedHand?: CardId[]; // Opponent's hand revealed during INITIAL_SETUP reshuffle
  drawnCards?: CardId[]; // Opponent's drawn cards during DRAWING_CARDS (if not validated)
  isDrawing?: boolean; // Indicates opponent is in process of drawing

  static async fromDomain(
    state: PlayerGameState,
    matchState: MatchState,
    playerState: PlayerGameState | null,
    playerHasDrawnValidHand: boolean,
    opponentHasDrawnValidHand: boolean,
    cardsMap?: Map<string, Card>,
  ): Promise<OpponentStateDto> {
    const dto: OpponentStateDto = {
      handCount: state.getHandCount(),
      deckCount: state.getDeckCount(),
      discardCount: state.discardPile.length,
      discardPile: state.discardPile, // Include discard pile contents
      activePokemon: state.activePokemon
        ? await PokemonInPlayDto.fromDomain(
            state.activePokemon,
            cardsMap,
          )
        : null,
      bench: await Promise.all(
        state.bench.map((card) =>
          PokemonInPlayDto.fromDomain(card, cardsMap),
        ),
      ),
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
      discardPile: [],
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
  cardId: CardId;
  position: string;
  currentHp: number;
  maxHp: number;
  attachedEnergy: CardId[];
  statusEffect?: string; // Deprecated: use statusEffects instead (for backward compatibility)
  statusEffects?: string[]; // Array of status conditions (can have multiple: CONFUSED + POISONED, etc.)
  damageCounters: number;
  poisonDamageAmount?: number; // Optional, poison damage amount (10 or 20)

  static async fromDomain(
    card: CardInstance,
    cardsMap?: Map<string, Card>,
  ): Promise<PokemonInPlayDto> {
    // Always fetch the correct maxHp from card data to fix any incorrect stored values
    let correctMaxHp = card.maxHp;
    if (cardsMap) {
      const cardEntity = cardsMap.get(card.cardId);
      if (cardEntity && cardEntity.hp !== undefined) {
        correctMaxHp = cardEntity.hp;
      }
      // If card not found in map, use stored maxHp as fallback
      // This can happen in test environments or if card data is missing
    }

    return {
      instanceId: card.instanceId,
      cardId: card.cardId,
      position: card.position,
      currentHp: card.currentHp,
      maxHp: correctMaxHp,
      attachedEnergy: card.attachedEnergy,
      statusEffects: card.statusEffects, // Array of status effects
      statusEffect: card.getPrimaryStatusEffect(), // Backward compatibility: primary status effect
      damageCounters: card.getDamageCounters(), // Calculate from HP
      poisonDamageAmount: card.poisonDamageAmount,
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

/**
 * Coin Flip State DTO
 */
class CoinFlipStateDto {
  status: string;
  context: string;
  configuration: any;
  results: Array<{
    flipIndex: number;
    result: 'heads' | 'tails';
    seed: number;
  }>;
  attackIndex?: number;
  pokemonInstanceId?: string;
  statusEffect?: string;
  actionId?: string;
  player1HasApproved: boolean;
  player2HasApproved: boolean;

  static fromDomain(state: CoinFlipState): CoinFlipStateDto {
    return {
      status: state.status,
      context: state.context,
      configuration: {
        countType: state.configuration.countType,
        fixedCount: state.configuration.fixedCount,
        damageCalculationType: state.configuration.damageCalculationType,
        baseDamage: state.configuration.baseDamage,
        damagePerHead: state.configuration.damagePerHead,
      },
      results: state.results.map((r) => ({
        flipIndex: r.flipIndex,
        result: r.result,
        seed: r.seed,
      })),
      attackIndex: state.attackIndex,
      pokemonInstanceId: state.pokemonInstanceId,
      statusEffect: state.statusEffect,
      actionId: state.actionId,
      player1HasApproved: state.player1HasApproved,
      player2HasApproved: state.player2HasApproved,
    };
  }
}
