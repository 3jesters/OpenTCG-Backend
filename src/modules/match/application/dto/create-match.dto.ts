/**
 * Create Match DTO
 * Data transfer object for creating a new match
 */
export class CreateMatchDto {
  id?: string;
  tournamentId: string;
  player1Id?: string;
  player1DeckId?: string;
  vsAi?: boolean; // If true, automatically assign AI player as player2
  aiPlayerId?: string; // Optional: specify which AI player to use (defaults to first available)
  aiDeckId?: string; // Required when vsAi is true: specify which deck the AI player should use
}
