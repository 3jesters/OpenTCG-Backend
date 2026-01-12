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
  ownerId: string;
  isGlobal: boolean;
  canEdit: boolean;
  symbolUrl?: string;
  logoUrl?: string;

  static fromDomain(set: Set, userId?: string): SetResponseDto {
    return {
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      totalCards: set.totalCards,
      description: set.description,
      official: set.official,
      ownerId: set.ownerId,
      isGlobal: set.isGlobal(),
      canEdit: userId ? set.canEdit(userId) : false,
      symbolUrl: set.symbolUrl,
      logoUrl: set.logoUrl,
    };
  }

  static fromDomainArray(sets: Set[], userId?: string): SetResponseDto[] {
    return sets.map((set) => this.fromDomain(set, userId));
  }
}
