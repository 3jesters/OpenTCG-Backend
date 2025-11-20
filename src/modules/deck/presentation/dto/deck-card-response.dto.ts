import { DeckCard } from '../../domain';

/**
 * Deck Card Response DTO
 * Represents a card in a deck in the API response
 */
export class DeckCardResponseDto {
  cardId: string;
  setName: string;
  quantity: number;

  static fromDomain(deckCard: DeckCard): DeckCardResponseDto {
    const dto = new DeckCardResponseDto();
    dto.cardId = deckCard.cardId;
    dto.setName = deckCard.setName;
    dto.quantity = deckCard.quantity;
    return dto;
  }
}

