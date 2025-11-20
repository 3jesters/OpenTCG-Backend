import { Deck } from '../../domain';
import { DeckResponseDto } from './deck-response.dto';

/**
 * Deck List Response DTO
 * Response for listing multiple decks
 */
export class DeckListResponseDto {
  decks: DeckResponseDto[];
  count: number;

  static fromDomain(decks: Deck[]): DeckListResponseDto {
    const dto = new DeckListResponseDto();
    dto.decks = decks.map((deck) => DeckResponseDto.fromDomain(deck));
    dto.count = decks.length;
    return dto;
  }
}

