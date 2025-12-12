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
import { GetCardByIdUseCase } from '../../../card/application/use-cases/get-card-by-id.use-case';

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
  winnerId?: string | null;
  result?: string | null;
  winCondition?: string | null;
  endedAt?: string | null;

  static async fromDomain(
    match: Match,
    playerId: string,
    availableActions: PlayerActionType[] = [],
    getCardByIdUseCase?: GetCardByIdUseCase,
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

    return {
      matchId: match.id,
      state: match.state,
      currentPlayer: match.currentPlayer,
      turnNumber: gameState?.turnNumber || 0,
      phase: gameState?.phase || null,
      playerState: playerState
        ? await PlayerStateDto.fromDomain(playerState, match.state, getCardByIdUseCase)
        : PlayerStateDto.empty(),
      opponentState: opponentState
        ? await OpponentStateDto.fromDomain(
            opponentState,
            match.state,
            playerState,
            playerHasDrawnValidHand,
            opponentHasDrawnValidHand,
            getCardByIdUseCase,
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
    getCardByIdUseCase?: GetCardByIdUseCase,
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
        ? await PokemonInPlayDto.fromDomain(state.activePokemon, getCardByIdUseCase)
        : null,
      bench: await Promise.all(
        state.bench.map((card) => PokemonInPlayDto.fromDomain(card, getCardByIdUseCase)),
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
    getCardByIdUseCase?: GetCardByIdUseCase,
  ): Promise<OpponentStateDto> {
    const dto: OpponentStateDto = {
      handCount: state.getHandCount(),
      deckCount: state.getDeckCount(),
      discardCount: state.discardPile.length,
      discardPile: state.discardPile, // Include discard pile contents
      activePokemon: state.activePokemon
        ? await PokemonInPlayDto.fromDomain(state.activePokemon, getCardByIdUseCase)
        : null,
      bench: await Promise.all(
        state.bench.map((card) => PokemonInPlayDto.fromDomain(card, getCardByIdUseCase)),
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
  statusEffect: string;
  damageCounters: number;

  static async fromDomain(
    card: CardInstance,
    getCardByIdUseCase?: GetCardByIdUseCase,
  ): Promise<PokemonInPlayDto> {
    // Always fetch the correct maxHp from card data to fix any incorrect stored values
    let correctMaxHp = card.maxHp;
    if (getCardByIdUseCase) {
      try {
        const cardDetail = await getCardByIdUseCase.execute(card.cardId);
        if (cardDetail.hp !== undefined) {
          correctMaxHp = cardDetail.hp;
        }
      } catch (error) {
        // If card lookup fails, use the stored maxHp as fallback
        // This can happen in test environments or if card data is missing
      }
    }

    return {
      instanceId: card.instanceId,
      cardId: card.cardId,
      position: card.position,
      currentHp: card.currentHp,
      maxHp: correctMaxHp,
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

/**
 * Coin Flip State DTO
 */
class CoinFlipStateDto {
  status: string;
  context: string;
  configuration: any;
  results: Array<{ flipIndex: number; result: 'heads' | 'tails'; seed: number }>;
  attackIndex?: number;
  pokemonInstanceId?: string;
  statusEffect?: string;
  actionId?: string;

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
    };
  }
}

