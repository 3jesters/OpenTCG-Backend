import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';

/**
 * DTO for a card in a deck
 */
export class DeckCardDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsNotEmpty()
  setName: string;

  @IsNumber()
  @IsInt()
  @Min(1)
  quantity: number;
}

