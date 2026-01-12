import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for creating a new set
 */
export class CreateSetDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  series: string;

  @IsString()
  @IsNotEmpty()
  releaseDate: string;

  @IsNumber()
  @Min(0)
  totalCards: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  official?: boolean;

  @IsOptional()
  @IsString()
  symbolUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}
