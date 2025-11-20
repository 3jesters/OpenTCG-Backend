import { DeckMapper, DeckJson } from './deck.mapper';
import { Deck, DeckCard } from '../../domain';

describe('DeckMapper', () => {
  describe('toJson', () => {
    it('should convert deck entity to JSON', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.setValid(true);

      const json = DeckMapper.toJson(deck);

      expect(json.id).toBe('deck-1');
      expect(json.name).toBe('My Deck');
      expect(json.createdBy).toBe('player-1');
      expect(json.isValid).toBe(true);
      expect(json.cards).toHaveLength(1);
      expect(json.cards[0].cardId).toBe('card-1');
      expect(json.cards[0].setName).toBe('Base Set');
      expect(json.cards[0].quantity).toBe(4);
    });

    it('should convert deck with tournament ID', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1', [], undefined, 'tournament-1');

      const json = DeckMapper.toJson(deck);

      expect(json.tournamentId).toBe('tournament-1');
    });

    it('should convert deck without tournament ID', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');

      const json = DeckMapper.toJson(deck);

      expect(json.tournamentId).toBeUndefined();
    });

    it('should convert dates to ISO strings', () => {
      const now = new Date();
      const deck = new Deck('deck-1', 'My Deck', 'player-1', [], now);

      const json = DeckMapper.toJson(deck);

      expect(json.createdAt).toBe(now.toISOString());
      expect(typeof json.createdAt).toBe('string');
    });
  });

  describe('toDomain', () => {
    it('should convert JSON to deck entity', () => {
      const json: DeckJson = {
        id: 'deck-1',
        name: 'My Deck',
        createdBy: 'player-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isValid: true,
        cards: [
          { cardId: 'card-1', setName: 'Base Set', quantity: 4 },
        ],
      };

      const deck = DeckMapper.toDomain(json);

      expect(deck).toBeInstanceOf(Deck);
      expect(deck.id).toBe('deck-1');
      expect(deck.name).toBe('My Deck');
      expect(deck.createdBy).toBe('player-1');
      expect(deck.isValid).toBe(true);
      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0]).toBeInstanceOf(DeckCard);
    });

    it('should convert JSON with tournament ID', () => {
      const json: DeckJson = {
        id: 'deck-1',
        name: 'My Deck',
        createdBy: 'player-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tournamentId: 'tournament-1',
        isValid: false,
        cards: [],
      };

      const deck = DeckMapper.toDomain(json);

      expect(deck.tournamentId).toBe('tournament-1');
    });

    it('should parse ISO date strings to Date objects', () => {
      const json: DeckJson = {
        id: 'deck-1',
        name: 'My Deck',
        createdBy: 'player-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        isValid: false,
        cards: [],
      };

      const deck = DeckMapper.toDomain(json);

      expect(deck.createdAt).toBeInstanceOf(Date);
      expect(deck.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data through toJson and toDomain', () => {
      const originalDeck = new Deck('deck-1', 'My Deck', 'player-1');
      originalDeck.addCard('card-1', 'Base Set', 4);
      originalDeck.addCard('card-2', 'Jungle', 2);
      originalDeck.setValid(true);
      originalDeck.setTournamentId('tournament-1');

      const json = DeckMapper.toJson(originalDeck);
      const reconstructedDeck = DeckMapper.toDomain(json);

      expect(reconstructedDeck.id).toBe(originalDeck.id);
      expect(reconstructedDeck.name).toBe(originalDeck.name);
      expect(reconstructedDeck.createdBy).toBe(originalDeck.createdBy);
      expect(reconstructedDeck.isValid).toBe(originalDeck.isValid);
      expect(reconstructedDeck.tournamentId).toBe(originalDeck.tournamentId);
      expect(reconstructedDeck.cards).toHaveLength(2);
      expect(reconstructedDeck.getTotalCardCount()).toBe(6);
    });
  });
});

