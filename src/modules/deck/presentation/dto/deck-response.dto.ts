import { Deck } from '../../domain';
import { DeckCardResponseDto } from './deck-card-response.dto';

/**
 * Deck Response DTO
 * Full deck information for API responses
 */
export class DeckResponseDto {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tournamentId?: string;
  isValid: boolean;
  cardBackImageUrl: string;
  cards: DeckCardResponseDto[];
  totalCards: number;

  static fromDomain(deck: Deck): DeckResponseDto {
    const dto = new DeckResponseDto();
    dto.id = deck.id;
    dto.name = deck.name;
    dto.createdBy = deck.createdBy;
    dto.createdAt = deck.createdAt.toISOString();
    dto.updatedAt = deck.updatedAt.toISOString();
    dto.tournamentId = deck.tournamentId;
    dto.isValid = deck.isValid;
    dto.cardBackImageUrl = deck.cardBackImageUrl;
    dto.cards = deck.cards.map((c) => DeckCardResponseDto.fromDomain(c));
    dto.totalCards = deck.getTotalCardCount();
    return dto;
  }
}
