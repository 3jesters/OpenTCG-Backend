import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeckCardDto } from './deck-card.dto';

/**
 * DTO for creating a new deck
 */
export class CreateDeckDto {
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
  @Type(() => DeckCardDto)
  @IsOptional()
  cards?: DeckCardDto[];
}

