import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Deck Card Request DTO
 */
export class DeckCardRequestDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsNotEmpty()
  setName: string;

  @IsNotEmpty()
  quantity: number;
}

/**
 * Create Deck Request DTO
 * Request body for creating a new deck
 */
export class CreateDeckRequestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @IsString()
  @IsOptional()
  tournamentId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeckCardRequestDto)
  @IsOptional()
  cards?: DeckCardRequestDto[];
}
