import {
  IsString,
  IsNotEmpty,
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
 * Create Tournament DTO
 * For creating a new tournament
 */
export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  author: string;

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
  deckRules: DeckRulesDto;

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
