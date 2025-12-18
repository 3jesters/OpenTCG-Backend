import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for validating a deck against tournament rules
 */
export class ValidateDeckDto {
  @IsString()
  @IsNotEmpty()
  tournamentId: string;
}
