import {
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RestrictedCardDto } from './restricted-card.dto';

/**
 * Deck Rules DTO
 * For input validation of deck rules
 */
export class DeckRulesDto {
  @IsNumber()
  @Min(0)
  minDeckSize: number;

  @IsNumber()
  @Min(0)
  maxDeckSize: number;

  @IsBoolean()
  exactDeckSize: boolean;

  @IsNumber()
  @Min(1)
  maxCopiesPerCard: number;

  @IsNumber()
  @Min(0)
  minBasicPokemon: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestrictedCardDto)
  @IsOptional()
  restrictedCards?: RestrictedCardDto[];
}
