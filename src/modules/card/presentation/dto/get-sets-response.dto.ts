import { ApiProperty } from '@nestjs/swagger';
import { SetSummaryDto } from './set-summary.dto';

/**
 * Response for GET /api/v1/cards/sets
 * Lists all loaded card sets
 */
export class GetSetsResponseDto {
  @ApiProperty({
    description: 'Array of loaded card sets',
    type: [SetSummaryDto],
  })
  sets: SetSummaryDto[];

  @ApiProperty({
    description: 'Total number of loaded sets',
    example: 1,
  })
  total: number;
}

