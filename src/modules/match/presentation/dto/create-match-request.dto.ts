import { IsString, IsOptional } from 'class-validator';

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
}
