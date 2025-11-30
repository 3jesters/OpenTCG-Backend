import { Injectable, Inject } from '@nestjs/common';
import { Match, MatchState } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { ValidateDeckAgainstTournamentUseCase } from '../../../deck/application/use-cases/validate-deck-against-tournament.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';

/**
 * Validate Match Decks Use Case
 * Validates both player decks when a match enters DECK_VALIDATION state
 * Automatically transitions to PRE_GAME_SETUP if valid, or CANCELLED if invalid
 */
@Injectable()
export class ValidateMatchDecksUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly validateDeckUseCase: ValidateDeckAgainstTournamentUseCase,
    private readonly performCoinTossUseCase: PerformCoinTossUseCase,
  ) {}

  async execute(matchId: string): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error(`Match with ID ${matchId} not found`);
    }

    // Validate state
    if (match.state !== MatchState.DECK_VALIDATION) {
      // Not in validation state, return as-is
      return match;
    }

    // Validate both players and decks are assigned
    if (!match.player1Id || !match.player1DeckId) {
      match.markDeckValidationComplete(false);
      return await this.matchRepository.save(match);
    }
    if (!match.player2Id || !match.player2DeckId) {
      match.markDeckValidationComplete(false);
      return await this.matchRepository.save(match);
    }

    // Validate both decks against tournament rules
    try {
      const player1Validation = await this.validateDeckUseCase.execute(
        match.player1DeckId,
        match.tournamentId,
      );

      const player2Validation = await this.validateDeckUseCase.execute(
        match.player2DeckId,
        match.tournamentId,
      );

      // Both decks must be valid (no errors)
      const bothValid =
        player1Validation.isValid && player2Validation.isValid;

      // Mark validation as complete
      match.markDeckValidationComplete(bothValid);

      // Save match
      const savedMatch = await this.matchRepository.save(match);

      // Note: Coin toss will be performed after both players approve the match
      // This happens in ExecuteTurnActionUseCase when APPROVE_MATCH action is executed

      return savedMatch;
    } catch (error) {
      // If validation fails (e.g., deck or tournament not found), mark as invalid
      match.markDeckValidationComplete(false);
      return await this.matchRepository.save(match);
    }
  }
}

