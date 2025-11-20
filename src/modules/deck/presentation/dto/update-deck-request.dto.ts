import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeckCardRequestDto } from './create-deck-request.dto';

/**
 * Update Deck Request DTO
 * Request body for updating an existing deck
 */
export class UpdateDeckRequestDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  tournamentId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeckCardRequestDto)
  @IsOptional()
  cards?: DeckCardRequestDto[];
}

