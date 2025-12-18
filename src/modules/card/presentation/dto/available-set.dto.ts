import { ApiProperty } from '@nestjs/swagger';

/**
 * Available Set DTO
 * Represents metadata of a card set file available in the file system
 */
export class AvailableSetDto {
  @ApiProperty({
    description: 'Author of the card set',
    example: 'pokemon',
  })
  author: string;

  @ApiProperty({
    description: 'Name of the card set',
    example: 'base-set',
  })
  setName: string;

  @ApiProperty({
    description: 'Version number',
    example: '1.0',
  })
  version: string;

  @ApiProperty({
    description: 'Total number of cards in the set',
    example: 102,
  })
  totalCards: number;

  @ApiProperty({
    description: 'Whether this is an official set',
    example: true,
    required: false,
  })
  official?: boolean;

  @ApiProperty({
    description: 'Release date of the set',
    example: '1999-01-09',
    required: false,
  })
  dateReleased?: string;

  @ApiProperty({
    description: 'Description of the set',
    example: 'Pokemon Trading Card Game Base Set',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'URL to the set logo image',
    example: 'https://www.pikawiz.com/images/logos/base1-logo.png',
    required: false,
  })
  logoUrl?: string;

  @ApiProperty({
    description: 'Filename of the set',
    example: 'pokemon-base-set-v1.0.json',
  })
  filename: string;
}
