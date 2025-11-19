import { SetMetadata } from '../../domain/repositories/card-cache.interface';
import { SetSummaryDto } from '../dto/set-summary.dto';

/**
 * Set Mapper
 * Maps SetMetadata domain objects to DTOs
 */
export class SetMapper {
  /**
   * Map SetMetadata to SetSummaryDto
   */
  static toSetSummaryDto(metadata: SetMetadata): SetSummaryDto {
    return {
      author: metadata.author,
      setName: metadata.setName,
      setIdentifier: this.toKebabCase(metadata.setName),
      version: metadata.version,
      totalCards: metadata.totalCards,
      official: metadata.official,
      dateReleased: metadata.dateReleased,
      description: metadata.description,
      loadedAt: metadata.loadedAt,
    };
  }

  /**
   * Convert string to kebab-case
   */
  private static toKebabCase(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }
}

