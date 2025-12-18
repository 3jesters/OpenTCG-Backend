import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Validate Deck Request DTO
 * Request body for validating a deck against tournament rules
 */
export class ValidateDeckRequestDto {
  @IsString()
  @IsNotEmpty()
  tournamentId: string;
}
