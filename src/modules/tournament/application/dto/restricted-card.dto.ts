import { IsString, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

/**
 * Restricted Card DTO
 * For input validation of restricted cards
 */
export class RestrictedCardDto {
  @IsString()
  @IsNotEmpty()
  setName: string;

  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  maxCopies: number;
}
