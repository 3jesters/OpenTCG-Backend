import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * Create Match Request DTO
 * Request body for creating a new match
 */
export class CreateMatchRequestDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  tournamentId: string;

  @IsString()
  @IsOptional()
  player1Id?: string;

  @IsString()
  @IsOptional()
  player1DeckId?: string;

  @IsBoolean()
  @IsOptional()
  vsAi?: boolean; // If true, automatically assign AI player as player2

  @IsString()
  @IsOptional()
  aiPlayerId?: string; // Optional: specify which AI player to use

  @IsString()
  @IsOptional()
  aiDeckId?: string; // Required when vsAi is true: specify which deck the AI player should use
}
