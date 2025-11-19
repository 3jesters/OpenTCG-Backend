import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LoadSetRequestDto } from './load-set-request.dto';

/**
 * Load Cards Request DTO
 * Request body for loading one or multiple card sets
 */
export class LoadCardsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadSetRequestDto)
  sets: LoadSetRequestDto[];
}

