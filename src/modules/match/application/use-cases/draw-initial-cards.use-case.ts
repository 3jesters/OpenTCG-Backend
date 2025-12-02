import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  MatchState,
  TurnPhase,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import {
  GameState,
  PlayerGameState,
} from '../../domain/value-objects';
import { IDeckRepository } from '../../../deck/domain/repositories';
import { DeckCard } from '../../../deck/domain/value-objects';
import { ITournamentRepository } from '../../../tournament/domain';
import { StartGameRulesValidatorService } from '../../domain/services';

/**
 * Draw Initial Cards Use Case
 * Handles player-initiated drawing of initial 7 cards
 * Validates against start game rules and may require redraw
 */
@Injectable()
export class DrawInitialCardsUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
    private readonly startGameRulesValidator: StartGameRulesValidatorService,
  ) {}

  async execute(matchId: string, playerId: string): Promise<{
    match: Match;
    drawnCards: string[];
    isValid: boolean;
    nextState: MatchState;
  }> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Validate state
    if (match.state !== MatchState.DRAWING_CARDS) {
      throw new BadRequestException(
        `Cannot draw initial cards in state ${match.state}. Must be DRAWING_CARDS`,
      );
    }

    // Get player identifier
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new BadRequestException('Player is not part of this match');
    }

    // Check if player has already drawn a valid initial hand
    const playerHasDrawnValidHand =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasDrawnValidHand
        : match.player2HasDrawnValidHand;

    if (playerHasDrawnValidHand) {
      throw new BadRequestException(
        'Player has already drawn a valid initial hand. Cannot draw again.',
      );
    }

    // Get player's deck ID
    const deckId =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1DeckId
        : match.player2DeckId;

    if (!deckId) {
      throw new BadRequestException('Player deck not assigned');
    }

    // Load deck
    const deck = await this.deckRepository.findById(deckId);
    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    // Load tournament to get start game rules
    const tournament = await this.tournamentRepository.findById(
      match.tournamentId,
    );
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${match.tournamentId} not found`,
      );
    }

    const startGameRules = tournament.startGameRules;

    // Get current game state or create new one
    let gameState = match.gameState;
    const playerState = gameState
      ? gameState.getPlayerState(playerIdentifier)
      : null;

    // Determine if this is first draw or redraw
    const isFirstDraw = !playerState || playerState.hand.length === 0;

    let originalDeck: string[]; // Store original deck for deterministic reshuffle
    let currentDeck: string[] = []; // Initialize to empty array
    let currentHand: string[] = []; // Initialize to empty array

    // Initialize deck for first draw
    if (isFirstDraw) {
      // First draw: expand deck cards
      const deckCards = this.expandDeckCards(deck.cards);
      originalDeck = [...deckCards]; // Store original for reshuffle
    } else {
      // Redraw: get current deck and hand
      const existingDeck = [...playerState.deck];
      const existingHand = [...playerState.hand];
      
      // Put hand back into deck to get original deck state
      originalDeck = [...existingDeck, ...existingHand];
    }

    // Draw and validate hand, reshuffling until valid
    // This implements the automatic reshuffle rule from business rules
    // IMPORTANT: Reshuffle must be deterministic - same seed always produces same result
    let isValid = false;
    let attempts = 0;
    const maxAttempts = 100; // Safety limit to prevent infinite loops

    // Get base seed for deterministic shuffling
    // For first draw: use match ID + player identifier
    // For redraw: use match ID + player identifier + redraw flag
    const baseSeed = isFirstDraw
      ? this.getShuffleSeed(match.id, playerIdentifier)
      : this.getShuffleSeed(match.id, playerIdentifier, true);

    while (!isValid && attempts < maxAttempts) {
      // CRITICAL: For deterministic reshuffle, always start from original deck state
      // Reset to original deck before each shuffle attempt
      // This ensures same match/player/attempt always produces same shuffle
      currentDeck = [...originalDeck];
      
      // Use deterministic seed: baseSeed + attempt number
      // IMPORTANT: Each attempt uses a different seed (baseSeed + 0, baseSeed + 1, etc.)
      // This ensures same match/player will always get the same sequence of shuffles
      const attemptSeed = baseSeed !== undefined
        ? baseSeed + attempts
        : undefined;
      
      // Shuffle deck with deterministic seed
      currentDeck = this.shuffleDeck(currentDeck, attemptSeed);
      currentHand = currentDeck.splice(0, 7);

      // Validate hand against start game rules
      isValid = await this.startGameRulesValidator.validateHand(
        currentHand,
        startGameRules,
      );

      if (!isValid) {
        // Hand is invalid, will try again with next attempt number
        attempts++;
      }
    }

    if (!isValid) {
      // Max attempts reached, return invalid hand anyway
      // (shouldn't happen in practice if deck has valid cards)
      console.warn(
        `Max reshuffle attempts (${maxAttempts}) reached for ${playerIdentifier}. ` +
        `Returning hand that may not satisfy all rules.`,
      );
    }


    // Update game state
    if (!gameState) {
      // Create new game state with this player's state
      const newPlayerState = new PlayerGameState(
        currentDeck,
        currentHand,
        null, // activePokemon
        [], // bench
        [], // prizeCards (will be set later)
        [], // discardPile
        false, // hasAttachedEnergyThisTurn
      );

      // Create empty opponent state
      const opponentState = new PlayerGameState([], [], null, [], [], [], false);

      // Create game state with proper player order
      // Use DRAW phase as placeholder during card drawing
      if (playerIdentifier === PlayerIdentifier.PLAYER1) {
        gameState = new GameState(
          newPlayerState,
          opponentState,
          1,
          TurnPhase.DRAW, // placeholder phase during drawing
          match.firstPlayer || PlayerIdentifier.PLAYER1,
          null,
          [],
        );
      } else {
        gameState = new GameState(
          opponentState,
          newPlayerState,
          1,
          TurnPhase.DRAW, // placeholder phase during drawing
          match.firstPlayer || PlayerIdentifier.PLAYER1,
          null,
          [],
        );
      }
    } else {
      // Update existing game state
      const updatedPlayerState = new PlayerGameState(
        currentDeck,
        currentHand,
        playerState?.activePokemon || null,
        playerState?.bench || [],
        playerState?.prizeCards || [],
        playerState?.discardPile || [],
        playerState?.hasAttachedEnergyThisTurn || false,
      );

      if (playerIdentifier === PlayerIdentifier.PLAYER1) {
        gameState = new GameState(
          updatedPlayerState,
          gameState.player2State,
          gameState.turnNumber,
          gameState.phase,
          gameState.currentPlayer,
          gameState.lastAction,
          gameState.actionHistory,
        );
      } else {
        gameState = new GameState(
          gameState.player1State,
          updatedPlayerState,
          gameState.turnNumber,
          gameState.phase,
          gameState.currentPlayer,
          gameState.lastAction,
          gameState.actionHistory,
        );
      }
    }

    // Update match with game state
    match.updateGameStateDuringDrawing(gameState);

    // If valid, mark player's deck as valid BEFORE saving
    // This ensures the flag is set in the match entity before persistence
    if (isValid) {
      // Set the flag
      match.markPlayerDeckValid(playerIdentifier);
      
      // CRITICAL: Verify flag is set immediately after marking
      // This ensures the match entity has the flag set before any save operation
      const flagAfterMarking = playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasDrawnValidHand
        : match.player2HasDrawnValidHand;
      
      if (!flagAfterMarking) {
        throw new Error(
          `playerHasDrawnValidHand flag was not set correctly after markPlayerDeckValid. ` +
          `Expected true for ${playerIdentifier}, but got ${flagAfterMarking}. ` +
          `Match state: ${match.state}, Player1 flag: ${match.player1HasDrawnValidHand}, Player2 flag: ${match.player2HasDrawnValidHand}`,
        );
      }
    }

    // CRITICAL: Verify the flag is still set immediately before save
    // This ensures no other operation has reset the flag
    if (isValid) {
      const flagBeforeSave = playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasDrawnValidHand
        : match.player2HasDrawnValidHand;
      
      if (!flagBeforeSave) {
        throw new Error(
          `playerHasDrawnValidHand flag was lost before save. ` +
          `Expected true for ${playerIdentifier}, but got ${flagBeforeSave}. ` +
          `This indicates the flag was reset between marking and saving.`,
        );
      }
    }

    // Save match - the repository should preserve the flag
    const savedMatch = await this.matchRepository.save(match);

    // CRITICAL: Verify flag is still set after save
    // The repository returns the same instance, so the flag should be preserved
    if (isValid) {
      const flagAfterSave = playerIdentifier === PlayerIdentifier.PLAYER1
        ? savedMatch.player1HasDrawnValidHand
        : savedMatch.player2HasDrawnValidHand;
      
      if (!flagAfterSave) {
        throw new Error(
          `playerHasDrawnValidHand flag was lost after save. ` +
          `Expected true for ${playerIdentifier}, but got ${flagAfterSave}. ` +
          `This indicates the repository save operation is not preserving the flag. ` +
          `Match state: ${savedMatch.state}, Player1 flag: ${savedMatch.player1HasDrawnValidHand}, Player2 flag: ${savedMatch.player2HasDrawnValidHand}`,
        );
      }
    }

    return {
      match: savedMatch,
      drawnCards: currentHand,
      isValid,
      nextState: savedMatch.state,
    };
  }

  /**
   * Expand deck cards into individual card IDs
   */
  private expandDeckCards(deckCards: DeckCard[]): string[] {
    const cardIds: string[] = [];
    for (const deckCard of deckCards) {
      for (let i = 0; i < deckCard.quantity; i++) {
        cardIds.push(deckCard.cardId);
      }
    }
    return cardIds;
  }

  /**
   * Get shuffle seed for deterministic shuffling
   */
  private getShuffleSeed(
    matchId: string,
    playerIdentifier: PlayerIdentifier,
    isRedraw = false,
  ): number | undefined {
    // Use deterministic seed in test environment
    if (process.env.NODE_ENV === 'test') {
      const baseSeed = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const playerOffset = playerIdentifier === PlayerIdentifier.PLAYER1 ? 0 : 1000;
      const redrawOffset = isRedraw ? 10000 : 0;
      return baseSeed + playerOffset + redrawOffset;
    }

    // Use environment seed if provided
    const envSeed = process.env.MATCH_SHUFFLE_SEED
      ? Number(process.env.MATCH_SHUFFLE_SEED)
      : undefined;
    
    if (envSeed !== undefined && !Number.isNaN(envSeed)) {
      const playerOffset = playerIdentifier === PlayerIdentifier.PLAYER1 ? 0 : 1000;
      const redrawOffset = isRedraw ? 10000 : 0;
      return envSeed + playerOffset + redrawOffset;
    }

    return undefined;
  }

  /**
   * Shuffle a deck using Fisher-Yates algorithm
   */
  private shuffleDeck(deck: string[], seed?: number): string[] {
    const shuffled = [...deck];
    
    // Use seeded random if seed provided, otherwise use Math.random()
    let random: () => number;
    if (seed !== undefined) {
      // Simple Linear Congruential Generator (LCG) for deterministic randomness
      let currentSeed = seed;
      random = () => {
        // LCG parameters: a = 1664525, c = 1013904223, m = 2^32
        currentSeed = (1664525 * currentSeed + 1013904223) >>> 0;
        return (currentSeed >>> 0) / 0x100000000;
      };
    } else {
      random = Math.random;
    }
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

