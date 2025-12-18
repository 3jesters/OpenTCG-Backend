import { ApiProperty } from '@nestjs/swagger';

/**
 * Set Summary DTO
 * Provides a summary of a loaded card set
 */
export class SetSummaryDto {
  @ApiProperty({
    description: 'Author of the card set',
    example: 'pokemon',
  })
  author: string;

  @ApiProperty({
    description: 'Name of the card set',
    example: 'Base Set',
  })
  setName: string;

  @ApiProperty({
    description: 'Set identifier in kebab-case for URLs',
    example: 'base-set',
  })
  setIdentifier: string;

  @ApiProperty({
    description: 'Version of the card set',
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
    required: false,
    example: true,
  })
  official?: boolean;

  @ApiProperty({
    description: 'Release date of the set',
    required: false,
    example: '1999-01-09',
  })
  dateReleased?: string;

  @ApiProperty({
    description: 'Description of the set',
    required: false,
    example: 'The original Pokémon TCG set that started it all',
  })
  description?: string;

  @ApiProperty({
    description: 'URL to the set logo image',
    example: 'https://www.pikawiz.com/images/logos/base1-logo.png',
    required: false,
  })
  logoUrl?: string;
}
