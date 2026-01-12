import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * List Sets Request DTO
 * Query parameters for listing card sets
 */
export class ListSetsRequestDto {
  @ApiPropertyOptional({
    description: 'Filter by author (e.g., "pokemon")',
    example: 'pokemon',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({
    description: 'Filter by official status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  official?: boolean;
}
