import { ApiProperty } from '@nestjs/swagger';
import { AvailableSetDto } from './available-set.dto';

/**
 * Response for GET /api/v1/cards/sets/available
 * Lists all card sets available in the file system
 */
export class GetAvailableSetsResponseDto {
  @ApiProperty({
    description: 'Array of available card sets',
    type: [AvailableSetDto],
  })
  sets: AvailableSetDto[];

  @ApiProperty({
    description: 'Total number of available sets',
    example: 3,
  })
  total: number;
}

