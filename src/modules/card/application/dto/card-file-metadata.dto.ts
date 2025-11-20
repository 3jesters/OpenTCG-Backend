import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';

/**
 * Card File Metadata DTO
 * For validating metadata section of card files
 */
export class CardFileMetadataDto {
  @IsString()
  author: string;

  @IsString()
  setName: string;

  @IsString()
  version: string;

  @IsOptional()
  @IsBoolean()
  official?: boolean;

  @IsOptional()
  @IsDateString()
  dateReleased?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCards?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  series?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  legalFormats?: string[];

  @IsOptional()
  @IsDateString()
  lastUpdated?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}

