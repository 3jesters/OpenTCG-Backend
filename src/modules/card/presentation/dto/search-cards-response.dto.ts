import { ApiProperty } from '@nestjs/swagger';
import { CardSummaryDto } from './card-summary.dto';

/**
 * Search Cards Response DTO
 * Response for card search endpoint with pagination
 */
export class SearchCardsResponseDto {
  @ApiProperty({
    description: 'Array of matching cards',
    type: [CardSummaryDto],
  })
  results: CardSummaryDto[];

  @ApiProperty({
    description: 'Total number of matching cards (before pagination)',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Results per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Number of results skipped',
    example: 0,
  })
  offset: number;
}

