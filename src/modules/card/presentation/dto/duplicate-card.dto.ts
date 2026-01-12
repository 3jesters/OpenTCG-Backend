import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for duplicating a card to a user's private set
 */
export class DuplicateCardDto {
  @IsString()
  sourceCardId: string;

  @IsOptional()
  @IsString()
  targetSetId?: string;

  @IsOptional()
  @IsString()
  targetSetName?: string;
}
