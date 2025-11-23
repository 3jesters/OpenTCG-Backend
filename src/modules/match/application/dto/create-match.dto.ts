/**
 * Create Match DTO
 * Data transfer object for creating a new match
 */
export class CreateMatchDto {
  tournamentId: string;
  player1Id?: string;
  player1DeckId?: string;
}

