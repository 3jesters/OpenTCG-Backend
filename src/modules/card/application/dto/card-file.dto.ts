import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CardFileMetadataDto } from './card-file-metadata.dto';
import { ImportCardDto } from './import-card.dto';

/**
 * Card File DTO
 * For validating the complete structure of card JSON files
 */
export class CardFileDto {
  @ValidateNested()
  @Type(() => CardFileMetadataDto)
  metadata: CardFileMetadataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportCardDto)
  cards: ImportCardDto[];
}
