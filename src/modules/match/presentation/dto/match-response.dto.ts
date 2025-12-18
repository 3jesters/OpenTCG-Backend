import { Match, MatchState, MatchResult, PlayerIdentifier } from '../../domain';
import { WinCondition } from '../../domain/enums';

/**
 * Match Response DTO
 * Response DTO for match information
 */
export class MatchResponseDto {
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

  static fromDomain(match: Match): MatchResponseDto {
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
    };
  }
}
