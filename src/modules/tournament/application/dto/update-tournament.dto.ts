import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeckRulesDto } from './deck-rules.dto';
import { TournamentStatus } from '../../domain';

/**
 * Update Tournament DTO
 * For updating an existing tournament (all fields optional)
 */
export class UpdateTournamentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsBoolean()
  @IsOptional()
  official?: boolean;

  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bannedSets?: string[];

  @IsOptional()
  setBannedCards?: Record<string, string[]>;

  @ValidateNested()
  @Type(() => DeckRulesDto)
  @IsOptional()
  deckRules?: DeckRulesDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  savedDecks?: string[];

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(2)
  @IsOptional()
  maxParticipants?: number;

  @IsString()
  @IsOptional()
  format?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regulationMarks?: string[];
}
