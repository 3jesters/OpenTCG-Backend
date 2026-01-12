import { Injectable, Inject, Logger } from '@nestjs/common';
import { Match, MatchState, PlayerActionType } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { ValidateDeckAgainstTournamentUseCase } from '../../../deck/application/use-cases/validate-deck-against-tournament.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { ProcessActionUseCase } from './process-action.use-case';
import { PlayerTypeService } from '../services';

/**
 * Validate Match Decks Use Case
 * Validates both player decks when a match enters DECK_VALIDATION state
 * Automatically transitions to MATCH_APPROVAL if valid, or CANCELLED if invalid
 * Auto-approves for AI players when match enters MATCH_APPROVAL state
 */
@Injectable()
export class ValidateMatchDecksUseCase {
  private readonly logger = new Logger(ValidateMatchDecksUseCase.name);

  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly validateDeckUseCase: ValidateDeckAgainstTournamentUseCase,
    private readonly performCoinTossUseCase: PerformCoinTossUseCase,
    private readonly processActionUseCase: ProcessActionUseCase,
    private readonly playerTypeService: PlayerTypeService,
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
      const bothValid = player1Validation.isValid && player2Validation.isValid;

      // Mark validation as complete
      match.markDeckValidationComplete(bothValid);

      // Save match
      let savedMatch = await this.matchRepository.save(match);

      // If match is now in MATCH_APPROVAL state, auto-approve for AI players
      if (savedMatch.state === MatchState.MATCH_APPROVAL) {
        try {
          // Auto-approve for AI player 1 if applicable
          if (
            savedMatch.player1Id &&
            this.playerTypeService.isAiPlayer(
              savedMatch.player1Id,
              savedMatch,
            ) &&
            !savedMatch.player1HasApprovedMatch
          ) {
            await this.processActionUseCase.execute(
              {
                playerId: savedMatch.player1Id,
                actionType: PlayerActionType.APPROVE_MATCH,
                actionData: {},
              },
              savedMatch.id,
            );
            // Reload match after AI approval
            const updatedMatch = await this.matchRepository.findById(matchId);
            if (updatedMatch) {
              savedMatch = updatedMatch;
            }
          }

          // Auto-approve for AI player 2 if applicable
          if (
            savedMatch.player2Id &&
            this.playerTypeService.isAiPlayer(
              savedMatch.player2Id,
              savedMatch,
            ) &&
            !savedMatch.player2HasApprovedMatch
          ) {
            await this.processActionUseCase.execute(
              {
                playerId: savedMatch.player2Id,
                actionType: PlayerActionType.APPROVE_MATCH,
                actionData: {},
              },
              savedMatch.id,
            );
            // Reload match after AI approval
            const updatedMatch = await this.matchRepository.findById(matchId);
            if (updatedMatch) {
              savedMatch = updatedMatch;
            }
          }
        } catch (autoApprovalError) {
          // Log error but don't fail validation - auto-approval is best effort
          // The match is already in MATCH_APPROVAL state and validation succeeded
          this.logger.error(
            `Error during AI auto-approval for match ${matchId}: ${autoApprovalError instanceof Error ? autoApprovalError.message : String(autoApprovalError)}`,
            autoApprovalError instanceof Error
              ? autoApprovalError.stack
              : undefined,
          );
        }
      }

      // Note: Coin toss will be performed after both players approve the match
      // This happens in ExecuteTurnActionUseCase when APPROVE_MATCH action is executed

      return savedMatch;
    } catch (error) {
      // If validation fails (e.g., deck or tournament not found), mark as invalid
      // Only mark as invalid if still in DECK_VALIDATION state
      if (match.state === MatchState.DECK_VALIDATION) {
        match.markDeckValidationComplete(false);
        return await this.matchRepository.save(match);
      }
      // If match is no longer in DECK_VALIDATION state, just return it as-is
      // This can happen if validation succeeded but auto-approval failed
      return match;
    }
  }
}
