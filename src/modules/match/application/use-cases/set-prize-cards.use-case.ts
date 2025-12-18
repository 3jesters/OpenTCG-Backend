import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Match, PlayerIdentifier, MatchState, TurnPhase } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { GameState, PlayerGameState } from '../../domain/value-objects';
import { ITournamentRepository } from '../../../tournament/domain';

/**
 * Set Prize Cards Use Case
 * Handles player setting their prize cards from their deck
 * Takes top N cards from deck and sets them as prize cards (face down)
 */
@Injectable()
export class SetPrizeCardsUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(matchId: string, playerId: string): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Validate state
    if (match.state !== MatchState.SET_PRIZE_CARDS) {
      throw new BadRequestException(
        `Cannot set prize cards in state ${match.state}. Must be SET_PRIZE_CARDS`,
      );
    }

    // Get player identifier
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new BadRequestException('Player is not part of this match');
    }

    // Check if player has already set prize cards
    const playerHasSetPrizeCards =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? match.player1HasSetPrizeCards
        : match.player2HasSetPrizeCards;

    if (playerHasSetPrizeCards) {
      throw new BadRequestException(
        'Player has already set prize cards. Cannot set again.',
      );
    }

    // Load tournament to get prize card count
    const tournament = await this.tournamentRepository.findById(
      match.tournamentId,
    );
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${match.tournamentId} not found`,
      );
    }

    const prizeCardCount = tournament.prizeCardCount;

    // Get current game state
    const gameState = match.gameState;
    if (!gameState) {
      throw new BadRequestException('Game state not initialized');
    }

    // Get player's current state
    const playerState = gameState.getPlayerState(playerIdentifier);
    if (!playerState) {
      throw new BadRequestException('Player state not found');
    }

    // Validate deck has enough cards
    if (playerState.deck.length < prizeCardCount) {
      throw new BadRequestException(
        `Not enough cards in deck. Need ${prizeCardCount} prize cards, but only ${playerState.deck.length} cards remaining.`,
      );
    }

    // Take top N cards from deck for prize cards
    const deckCopy = [...playerState.deck];
    const prizeCards = deckCopy.splice(0, prizeCardCount);
    const remainingDeck = deckCopy;

    // Create updated player state with prize cards set
    const updatedPlayerState = new PlayerGameState(
      remainingDeck,
      playerState.hand,
      playerState.activePokemon,
      playerState.bench,
      prizeCards, // Prize cards (face down)
      playerState.discardPile,
      playerState.hasAttachedEnergyThisTurn,
    );

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    // Update match with game state
    match.updateGameStateDuringSetup(updatedGameState);

    // Mark player's prize cards as set
    match.markPlayerPrizeCardsSet(playerIdentifier);

    // If both players have set prize cards, transition to SELECT_ACTIVE_POKEMON
    if (match.player1HasSetPrizeCards && match.player2HasSetPrizeCards) {
      match.transitionToSelectActivePokemon(updatedGameState);
    }

    // Save match
    return await this.matchRepository.save(match);
  }
}
