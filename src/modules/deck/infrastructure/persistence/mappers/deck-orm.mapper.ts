import { Deck } from '../../../domain/entities';
import { DeckCard } from '../../../domain/value-objects';
import { DeckOrmEntity } from '../entities';

/**
 * Deck ORM Mapper
 * Converts between DeckOrmEntity and Deck domain entity
 */
export class DeckOrmMapper {
  static toDomain(ormEntity: DeckOrmEntity): Deck {
    // Reconstruct DeckCard value objects from JSONB
    const cards = ormEntity.cards.map(
      (c) => new DeckCard(c.cardId, c.setName, c.quantity),
    );

    // Create Deck domain entity
    const deck = new Deck(
      ormEntity.id,
      ormEntity.name,
      ormEntity.createdBy,
      cards,
      ormEntity.createdAt,
      ormEntity.tournamentId || undefined,
      ormEntity.cardBackImageUrl,
    );

    // Set validation status
    deck.setValid(ormEntity.isValid);

    return deck;
  }

  static toOrm(domainEntity: Deck): DeckOrmEntity {
    const ormEntity = new DeckOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.name = domainEntity.name;
    ormEntity.createdBy = domainEntity.createdBy;
    ormEntity.createdAt = domainEntity.createdAt;
    ormEntity.updatedAt = domainEntity.updatedAt;
    ormEntity.tournamentId = domainEntity.tournamentId || null;
    ormEntity.isValid = domainEntity.isValid;
    ormEntity.cardBackImageUrl = domainEntity.cardBackImageUrl;

    // Map DeckCard value objects to JSONB
    ormEntity.cards = domainEntity.cards.map((card) => ({
      cardId: card.cardId,
      setName: card.setName,
      quantity: card.quantity,
    }));

    return ormEntity;
  }
}
