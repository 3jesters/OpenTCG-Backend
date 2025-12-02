import { Deck, DeckCard } from '../../domain';

/**
 * JSON structure for deck persistence
 */
export interface DeckJson {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tournamentId?: string;
  isValid: boolean;
  cardBackImageUrl?: string;
  cards: Array<{
    cardId: string;
    setName: string;
    quantity: number;
  }>;
}

/**
 * Deck Mapper
 * Maps between Deck domain entity and JSON structure
 */
export class DeckMapper {
  /**
   * Convert domain entity to JSON
   */
  static toJson(deck: Deck): DeckJson {
    return {
      id: deck.id,
      name: deck.name,
      createdBy: deck.createdBy,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
      tournamentId: deck.tournamentId,
      isValid: deck.isValid,
      cardBackImageUrl: deck.cardBackImageUrl,
      cards: deck.cards.map((card) => ({
        cardId: card.cardId,
        setName: card.setName,
        quantity: card.quantity,
      })),
    };
  }

  /**
   * Convert JSON to domain entity
   */
  static toDomain(json: DeckJson): Deck {
    // Create DeckCard value objects
    const cards = json.cards.map(
      (c) => new DeckCard(c.cardId, c.setName, c.quantity),
    );

    // Create deck entity
    const deck = new Deck(
      json.id,
      json.name,
      json.createdBy,
      cards,
      new Date(json.createdAt),
      json.tournamentId,
      json.cardBackImageUrl,
    );

    // Set validation status
    deck.setValid(json.isValid);

    return deck;
  }
}

