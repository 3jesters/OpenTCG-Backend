import { IsString } from 'class-validator';

/**
 * Join Match Request DTO
 * Request body for joining a match
 */
export class JoinMatchRequestDto {
  @IsString()
  playerId: string;

  @IsString()
  deckId: string;
}

