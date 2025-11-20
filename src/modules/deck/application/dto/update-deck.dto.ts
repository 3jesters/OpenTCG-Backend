import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeckCardDto } from './deck-card.dto';

/**
 * DTO for updating a deck
 */
export class UpdateDeckDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  tournamentId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeckCardDto)
  @IsOptional()
  cards?: DeckCardDto[];
}

