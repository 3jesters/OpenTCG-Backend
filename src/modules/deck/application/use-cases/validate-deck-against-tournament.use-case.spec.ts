import { ValidateDeckAgainstTournamentUseCase } from './validate-deck-against-tournament.use-case';
import { IDeckRepository } from '../../domain/repositories';
import { ITournamentRepository } from '../../../tournament/domain';
import { Deck, DeckCard } from '../../domain';
import { Tournament, DeckRules, RestrictedCard } from '../../../tournament/domain';
import { NotFoundException } from '@nestjs/common';

describe('ValidateDeckAgainstTournamentUseCase', () => {
  let useCase: ValidateDeckAgainstTournamentUseCase;
  let mockDeckRepository: jest.Mocked<IDeckRepository>;
  let mockTournamentRepository: jest.Mocked<ITournamentRepository>;

  beforeEach(() => {
    mockDeckRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByCreator: jest.fn(),
    };

    mockTournamentRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    useCase = new ValidateDeckAgainstTournamentUseCase(
      mockDeckRepository,
      mockTournamentRepository,
    );
  });

  describe('Valid Deck Scenarios', () => {
    it('should validate a deck that meets all tournament rules', async () => {
      // Create a valid deck with 60 cards
      const deck = new Deck('deck-1', 'Valid Deck', 'player-1');
      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      // Create tournament with standard rules
      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(deck.isValid).toBe(true);
      expect(mockDeckRepository.save).toHaveBeenCalledWith(deck);
    });

    it('should allow unlimited basic energy cards', async () => {
      const deck = new Deck('deck-1', 'Energy Deck', 'player-1');
      deck.addCard('pokemon-base-set-v1.0-fire-energy--99', 'base-set', 30);
      deck.addCard('pokemon-base-set-v1.0-water-energy--103', 'base-set', 30);

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Should not have errors about energy card copies
      expect(result.errors.some((e) => e.includes('fire-energy'))).toBe(false);
    });

    it('should return warnings for basic Pokemon requirement', async () => {
      const deck = new Deck('deck-1', 'Valid Deck', 'player-1');
      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('basic Pokemon'))).toBe(
        true,
      );
    });
  });

  describe('Deck Size Validation', () => {
    it('should fail validation when deck has too few cards (exact size)', async () => {
      const deck = new Deck('deck-1', 'Small Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 55); // Only 55 cards

      const deckRules = DeckRules.createStandard(); // Requires exactly 60
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Deck must have exactly 60 cards but has 55',
      );
      expect(deck.isValid).toBe(false);
    });

    it('should fail validation when deck has too many cards (exact size)', async () => {
      const deck = new Deck('deck-1', 'Large Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 65); // 65 cards

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Deck must have exactly 60 cards but has 65',
      );
    });

    it('should fail validation when deck has too few cards (range)', async () => {
      const deck = new Deck('deck-1', 'Small Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 50);

      const deckRules = new DeckRules(60, 60, false, 4, 1, []); // Range: 60-60 but not exact
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Deck must have at least 60 cards but has 50',
      );
    });

    it('should fail validation when deck has too many cards (range)', async () => {
      const deck = new Deck('deck-1', 'Large Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 70);

      const deckRules = new DeckRules(60, 60, false, 4, 1, []);
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Deck cannot have more than 60 cards but has 70',
      );
    });
  });

  describe('Card Copy Limits', () => {
    it('should fail validation when card exceeds max copies', async () => {
      const deck = new Deck('deck-1', 'Invalid Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 5); // 5 copies, max is 4
      deck.addCard('card-2', 'base-set', 4);
      // Add more cards to reach 60
      for (let i = 3; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('card-1'))).toBe(true);
      expect(result.errors.some((e) => e.includes('5 copies'))).toBe(true);
    });

    it('should allow cards at max copy limit', async () => {
      const deck = new Deck('deck-1', 'Valid Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 4); // Exactly 4 copies
      // Add more cards to reach 60
      for (let i = 2; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should respect restricted card limits', async () => {
      const deck = new Deck('deck-1', 'Restricted Deck', 'player-1');
      deck.addCard('restricted-card', 'base-set', 2); // 2 copies, but restricted to 1
      // Add more cards to reach 60
      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const restrictedCard = new RestrictedCard(
        'base-set',
        'restricted-card',
        1,
      );
      const deckRules = new DeckRules(60, 60, true, 4, 1, [restrictedCard]);
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('restricted-card'))).toBe(
        true,
      );
      expect(result.errors.some((e) => e.includes('maximum allowed is 1'))).toBe(
        true,
      );
    });

    it('should warn about restricted cards even when within limit', async () => {
      const deck = new Deck('deck-1', 'Restricted Deck', 'player-1');
      deck.addCard('restricted-card', 'base-set', 1); // 1 copy, restricted to 1
      // Add more cards to reach exactly 60
      for (let i = 1; i <= 14; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }
      deck.addCard('card-15', 'base-set', 3); // 1 + 14*4 + 3 = 60

      const restrictedCard = new RestrictedCard(
        'base-set',
        'restricted-card',
        1,
      );
      const deckRules = new DeckRules(60, 60, true, 4, 1, [restrictedCard]);
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('restricted-card'))).toBe(
        true,
      );
    });
  });

  describe('Banned Sets and Cards', () => {
    it('should fail validation when deck contains cards from banned set', async () => {
      const deck = new Deck('deck-1', 'Banned Set Deck', 'player-1');
      deck.addCard('card-1', 'banned-set', 4);
      // Add more cards to reach 60
      for (let i = 2; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      tournament.banSet('banned-set');

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('banned-set'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Set "banned-set"'))).toBe(
        true,
      );
    });

    it('should fail validation when deck contains banned card', async () => {
      const deck = new Deck('deck-1', 'Banned Card Deck', 'player-1');
      deck.addCard('banned-card', 'base-set', 4);
      // Add more cards to reach 60
      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      tournament.banCardInSet('base-set', 'banned-card');

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('banned-card'))).toBe(
        true,
      );
      expect(result.errors.some((e) => e.includes('is banned'))).toBe(true);
    });

    it('should allow cards from non-banned sets', async () => {
      const deck = new Deck('deck-1', 'Valid Deck', 'player-1');
      deck.addCard('card-1', 'allowed-set', 4);
      // Add more cards to reach 60
      for (let i = 2; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      tournament.banSet('banned-set'); // Different set is banned

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should collect all validation errors', async () => {
      const deck = new Deck('deck-1', 'Invalid Deck', 'player-1');
      deck.addCard('card-1', 'banned-set', 5); // Banned set + too many copies
      deck.addCard('card-2', 'base-set', 5); // Too many copies
      // Add more cards but not enough
      for (let i = 3; i <= 10; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }
      // Total: 5 + 5 + 8*4 = 42 cards (too few)

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      tournament.banSet('banned-set');

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      // Should have errors for: deck size, banned set, card copies
      expect(result.errors.some((e) => e.includes('60 cards'))).toBe(true);
      expect(result.errors.some((e) => e.includes('banned-set'))).toBe(true);
      expect(result.errors.some((e) => e.includes('5 copies'))).toBe(true);
    });

    it('should return both errors and warnings', async () => {
      const deck = new Deck('deck-1', 'Invalid Deck', 'player-1');
      deck.addCard('restricted-card', 'base-set', 1); // Restricted but valid
      deck.addCard('card-1', 'base-set', 5); // Too many copies
      // Add more cards to reach 60
      for (let i = 2; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const restrictedCard = new RestrictedCard(
        'base-set',
        'restricted-card',
        1,
      );
      const deckRules = new DeckRules(60, 60, true, 4, 1, [restrictedCard]);
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundException when deck not found', async () => {
      mockDeckRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent-deck', 'tournament-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute('non-existent-deck', 'tournament-1'),
      ).rejects.toThrow('Deck with ID non-existent-deck not found');
    });

    it('should throw NotFoundException when tournament not found', async () => {
      const deck = new Deck('deck-1', 'Test Deck', 'player-1');
      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('deck-1', 'non-existent-tournament'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute('deck-1', 'non-existent-tournament'),
      ).rejects.toThrow('Tournament with ID non-existent-tournament not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty deck', async () => {
      const deck = new Deck('deck-1', 'Empty Deck', 'player-1');

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Deck must have exactly 60 cards but has 0',
      );
    });

    it('should handle deck with no minBasicPokemon requirement', async () => {
      const deck = new Deck('deck-1', 'Valid Deck', 'player-1');
      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = new DeckRules(60, 60, true, 4, 0, []); // minBasicPokemon = 0
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(true);
      // Should not have warning about basic Pokemon when requirement is 0
      expect(
        result.warnings.some((w) => w.includes('basic Pokemon')),
      ).toBe(false);
    });

    it('should handle multiple banned sets', async () => {
      const deck = new Deck('deck-1', 'Multi Banned Deck', 'player-1');
      deck.addCard('card-1', 'banned-set-1', 4);
      deck.addCard('card-2', 'banned-set-2', 4);
      // Add more cards to reach 60
      for (let i = 3; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      tournament.banSet('banned-set-1');
      tournament.banSet('banned-set-2');

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.filter((e) => e.includes('banned-set-1')).length).toBeGreaterThan(0);
      expect(result.errors.filter((e) => e.includes('banned-set-2')).length).toBeGreaterThan(0);
    });

    it('should handle multiple banned cards in same set', async () => {
      const deck = new Deck('deck-1', 'Multi Banned Cards Deck', 'player-1');
      deck.addCard('banned-card-1', 'base-set', 4);
      deck.addCard('banned-card-2', 'base-set', 4);
      // Add more cards to reach 60
      for (let i = 1; i <= 14; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      tournament.banCardInSet('base-set', 'banned-card-1');
      tournament.banCardInSet('base-set', 'banned-card-2');

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      const result = await useCase.execute('deck-1', 'tournament-1');

      expect(result.isValid).toBe(false);
      expect(result.errors.filter((e) => e.includes('banned-card-1')).length).toBeGreaterThan(0);
      expect(result.errors.filter((e) => e.includes('banned-card-2')).length).toBeGreaterThan(0);
    });
  });

  describe('Deck Status Update', () => {
    it('should update deck isValid to true when validation passes', async () => {
      const deck = new Deck('deck-1', 'Valid Deck', 'player-1');
      expect(deck.isValid).toBe(false); // Initially false

      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      await useCase.execute('deck-1', 'tournament-1');

      expect(deck.isValid).toBe(true);
      expect(mockDeckRepository.save).toHaveBeenCalledWith(deck);
    });

    it('should update deck isValid to false when validation fails', async () => {
      const deck = new Deck('deck-1', 'Invalid Deck', 'player-1');
      deck.addCard('card-1', 'base-set', 5); // Too many copies
      // Add more cards to reach 60
      for (let i = 2; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'base-set', 4);
      }

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );

      mockDeckRepository.findById.mockResolvedValue(deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockDeckRepository.save.mockImplementation(async (d) => d);

      await useCase.execute('deck-1', 'tournament-1');

      expect(deck.isValid).toBe(false);
      expect(mockDeckRepository.save).toHaveBeenCalledWith(deck);
    });
  });
});

