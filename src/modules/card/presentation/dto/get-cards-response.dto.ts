import { ApiProperty } from '@nestjs/swagger';
import { SetSummaryDto } from './set-summary.dto';
import { CardSummaryDto } from './card-summary.dto';

/**
 * Response for GET /api/v1/cards/sets/:author/:setName/v:version
 * Returns all cards from a specific set
 */
export class GetCardsResponseDto {
  @ApiProperty({
    description: 'Set metadata',
    type: SetSummaryDto,
  })
  set: SetSummaryDto;

  @ApiProperty({
    description: 'Array of cards in the set',
    type: [CardSummaryDto],
  })
  cards: CardSummaryDto[];

  @ApiProperty({
    description: 'Number of cards in the response',
    example: 102,
  })
  count: number;
}
