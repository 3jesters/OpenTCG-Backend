import { Set } from '../../domain/entities/set.entity';

/**
 * DTO for Set responses
 */
export class SetResponseDto {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  totalCards: number;
  description?: string;
  official: boolean;
  symbolUrl?: string;
  logoUrl?: string;

  static fromDomain(set: Set): SetResponseDto {
    return {
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      totalCards: set.totalCards,
      description: set.description,
      official: set.official,
      symbolUrl: set.symbolUrl,
      logoUrl: set.logoUrl,
    };
  }

  static fromDomainArray(sets: Set[]): SetResponseDto[] {
    return sets.map((set) => this.fromDomain(set));
  }
}

