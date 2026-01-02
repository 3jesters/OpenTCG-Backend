import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Match, PlayerIdentifier, MatchState, TurnPhase, PlayerActionType } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { GameState, PlayerGameState } from '../../domain/value-objects';
import { IDeckRepository } from '../../../deck/domain/repositories';
import { DeckCard } from '../../../deck/domain/value-objects';
import { ITournamentRepository } from '../../../tournament/domain';
import { StartGameRulesValidatorService } from '../../domain/services';
import { ProcessActionUseCase } from './process-action.use-case';
import { PlayerTypeService } from '../services';

/**
 * Start Match Use Case
 * Starts a match by performing coin flip and initial setup
 * Automatically shuffles decks, deals cards, and sets up prize cards
 * Auto-triggers AI players to draw initial cards if they are the first player
 */
@Injectable()
export class StartMatchUseCase {
  private readonly logger = new Logger(StartMatchUseCase.name);

  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
    private readonly startGameRulesValidator: StartGameRulesValidatorService,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly playerTypeService: PlayerTypeService,
  ) {}

  async execute(
    matchId: string,
    firstPlayer: PlayerIdentifier,
  ): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Validate state
    if (match.state !== MatchState.PRE_GAME_SETUP) {
      throw new Error(
        `Cannot start match in state ${match.state}. Must be PRE_GAME_SETUP`,
      );
    }

    // Validate both players and decks are assigned
    if (!match.player1Id || !match.player1DeckId) {
      throw new Error('Player 1 and deck must be assigned');
    }
    if (!match.player2Id || !match.player2DeckId) {
      throw new Error('Player 2 and deck must be assigned');
    }

    // Load both decks
    const player1Deck = await this.deckRepository.findById(match.player1DeckId);
    if (!player1Deck) {
      throw new NotFoundException(`Deck ${match.player1DeckId} not found`);
    }

    const player2Deck = await this.deckRepository.findById(match.player2DeckId);
    if (!player2Deck) {
      throw new NotFoundException(`Deck ${match.player2DeckId} not found`);
    }

    // Expand deck cards into individual card IDs (handling quantities)
    const player1DeckCards = this.expandDeckCards(player1Deck.cards);
    const player2DeckCards = this.expandDeckCards(player2Deck.cards);

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

    // Shuffle both decks
    // Use deterministic seed in test environment or when MATCH_SHUFFLE_SEED is provided
    const envSeed = process.env.MATCH_SHUFFLE_SEED
      ? Number(process.env.MATCH_SHUFFLE_SEED)
      : undefined;
    const shuffleSeed =
      envSeed !== undefined && !Number.isNaN(envSeed)
        ? envSeed
        : process.env.NODE_ENV === 'test'
          ? 12345
          : undefined;
    let shuffledPlayer1Deck = this.shuffleDeck(
      [...player1DeckCards],
      shuffleSeed,
    );
    let shuffledPlayer2Deck = this.shuffleDeck(
      [...player2DeckCards],
      shuffleSeed,
    );

    // Deal initial 7 cards to each player's hand
    let player1Hand = shuffledPlayer1Deck.splice(0, 7);
    let player2Hand = shuffledPlayer2Deck.splice(0, 7);

    // Validate and reshuffle hands until they satisfy start game rules
    const player1Result = await this.validateAndReshuffleHand(
      player1Hand,
      shuffledPlayer1Deck,
      startGameRules,
      shuffleSeed,
    );
    player1Hand = player1Result.hand;
    shuffledPlayer1Deck = player1Result.deck;

    const player2Result = await this.validateAndReshuffleHand(
      player2Hand,
      shuffledPlayer2Deck,
      startGameRules,
      shuffleSeed !== undefined ? shuffleSeed + 1000 : undefined,
    );
    player2Hand = player2Result.hand;
    shuffledPlayer2Deck = player2Result.deck;

    // Set up 6 prize cards for each player (from remaining deck)
    const player1PrizeCards = shuffledPlayer1Deck.splice(0, 6);
    const player2PrizeCards = shuffledPlayer2Deck.splice(0, 6);

    // Remaining cards stay in deck
    const player1DeckRemaining = shuffledPlayer1Deck;
    const player2DeckRemaining = shuffledPlayer2Deck;

    // Create initial game state
    const player1State = new PlayerGameState(
      player1DeckRemaining, // deck
      player1Hand, // hand (7 cards)
      null, // activePokemon (will be set during INITIAL_SETUP)
      [], // bench
      player1PrizeCards, // prizeCards (6 cards)
      [], // discardPile
      false, // hasAttachedEnergyThisTurn
    );

    const player2State = new PlayerGameState(
      player2DeckRemaining, // deck
      player2Hand, // hand (7 cards)
      null, // activePokemon (will be set during INITIAL_SETUP)
      [], // bench
      player2PrizeCards, // prizeCards (6 cards)
      [], // discardPile
      false, // hasAttachedEnergyThisTurn
    );

    const gameState = new GameState(
      player1State,
      player2State,
      1,
      TurnPhase.DRAW,
      firstPlayer,
      null,
      [],
      null, // coinFlipState
      new Map(), // abilityUsageThisTurn
    );

    // Set first player (transitions to DRAWING_CARDS)
    match.setFirstPlayer(firstPlayer);

    // Update game state during drawing phase
    match.updateGameStateDuringDrawing(gameState);

    // Save match
    const savedMatch = await this.matchRepository.save(match);

    // If match is now in DRAWING_CARDS state and first player is AI, auto-trigger AI to draw
    if (savedMatch.state === MatchState.DRAWING_CARDS) {
      try {
        // Get first player ID
        const firstPlayerId =
          firstPlayer === PlayerIdentifier.PLAYER1
            ? savedMatch.player1Id
            : savedMatch.player2Id;

        // Check if first player is AI and hasn't drawn yet
        if (
          firstPlayerId &&
          this.playerTypeService.isAiPlayer(firstPlayerId, savedMatch)
        ) {
          const firstPlayerHasDrawn =
            firstPlayer === PlayerIdentifier.PLAYER1
              ? savedMatch.player1HasDrawnValidHand
              : savedMatch.player2HasDrawnValidHand;

          if (!firstPlayerHasDrawn) {
            this.logger.debug(
              `Auto-triggering AI first player ${firstPlayerId} (${firstPlayer}) to draw initial cards for match ${savedMatch.id}`,
            );
            await this.processActionUseCase.execute(
              {
                playerId: firstPlayerId,
                actionType: PlayerActionType.DRAW_INITIAL_CARDS,
                actionData: {},
              },
              savedMatch.id,
            );
            // Reload match after AI draws
            const updatedMatch = await this.matchRepository.findById(matchId);
            if (updatedMatch) {
              return updatedMatch;
            }
          }
        }
      } catch (autoDrawError) {
        // Log error but don't fail match start - auto-draw is best effort
        this.logger.error(
          `Error during AI auto-draw after match start for match ${matchId}: ${autoDrawError instanceof Error ? autoDrawError.message : String(autoDrawError)}`,
          autoDrawError instanceof Error ? autoDrawError.stack : undefined,
        );
      }
    }

    return savedMatch;
  }

  /**
   * Expand deck cards into individual card IDs
   * A DeckCard with quantity 3 becomes 3 individual card IDs
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
   * Shuffle a deck using Fisher-Yates algorithm
   * @param deck Array of card IDs to shuffle
   * @param seed Optional seed for deterministic shuffling (for testing)
   * @returns Shuffled deck
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

  /**
   * Validate hand against start game rules and reshuffle if necessary
   * Returns a valid hand that satisfies all rules and the updated deck
   */
  private async validateAndReshuffleHand(
    hand: string[],
    deck: string[],
    rules: any,
    baseSeed?: number,
  ): Promise<{ hand: string[]; deck: string[] }> {
    let currentHand = [...hand];
    let currentDeck = [...deck];
    const maxAttempts = 100; // Safety limit to prevent infinite loops
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Check if hand satisfies all rules
      const isValid = await this.startGameRulesValidator.validateHand(
        currentHand,
        rules,
      );

      if (isValid) {
        return { hand: currentHand, deck: currentDeck };
      }

      // Hand doesn't satisfy rules - reshuffle
      // Put hand cards back into deck
      currentDeck.push(...currentHand);
      // Use deterministic seed (with attempt offset) when baseSeed provided
      const reshuffleSeed =
        baseSeed !== undefined ? baseSeed + attempts + 1 : undefined;
      currentDeck = this.shuffleDeck(currentDeck, reshuffleSeed);

      // Draw 7 new cards
      currentHand = currentDeck.splice(0, 7);

      attempts++;
    }

    // If we've exhausted attempts, return the current hand anyway
    // (shouldn't happen in practice if deck has valid cards)
    console.warn(
      `Max reshuffle attempts reached. Returning hand that may not satisfy all rules.`,
    );
    return { hand: currentHand, deck: currentDeck };
  }
}
