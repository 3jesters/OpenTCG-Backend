import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardDetailDto } from './card-detail.dto';

/**
 * Card Editor Response DTO
 * Response for card creation/editing operations
 * Extends CardDetailDto with editor-specific metadata
 */
export class CardEditorResponseDto extends CardDetailDto {
  @ApiProperty({
    description: 'Username of the creator',
    example: 'test-user',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Timestamp when the card was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Whether this card was created through the editor',
    example: true,
  })
  isEditorCreated: boolean;
}
