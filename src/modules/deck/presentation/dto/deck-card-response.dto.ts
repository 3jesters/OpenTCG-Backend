import { DeckCard } from '../../domain';
import { CardDetailDto } from '../../../card/presentation/dto/card-detail.dto';

/**
 * Deck Card Response DTO
 * Represents a card in a deck in the API response
 * Includes full card details for client-side rendering
 */
export class DeckCardResponseDto {
  cardId: string;
  setName: string;
  quantity: number;
  card?: CardDetailDto; // Full card details (image, attacks, etc.)

  static fromDomain(deckCard: DeckCard): DeckCardResponseDto {
    const dto = new DeckCardResponseDto();
    dto.cardId = deckCard.cardId;
    dto.setName = deckCard.setName;
    dto.quantity = deckCard.quantity;
    return dto;
  }

  static fromDomainWithCard(
    deckCard: DeckCard,
    cardDetail: CardDetailDto,
  ): DeckCardResponseDto {
    const dto = this.fromDomain(deckCard);
    dto.card = cardDetail;
    return dto;
  }
}
