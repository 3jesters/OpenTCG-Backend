import { Tournament, TournamentStatus, DeckRules, RestrictedCard } from '../';

describe('Tournament Entity', () => {
  let tournament: Tournament;

  beforeEach(() => {
    tournament = Tournament.createDefault();
  });

  describe('Creation', () => {
    it('should create a tournament with required fields', () => {
      const t = Tournament.create(
        'test-tournament',
        'Test Tournament',
        '1.0',
        'Test description',
        'test-author',
      );

      expect(t.id).toBe('test-tournament');
      expect(t.name).toBe('Test Tournament');
      expect(t.version).toBe('1.0');
      expect(t.description).toBe('Test description');
      expect(t.author).toBe('test-author');
      expect(t.status).toBe(TournamentStatus.DRAFT);
      expect(t.official).toBe(false);
    });

    it('should create default tournament', () => {
      const t = Tournament.createDefault();

      expect(t.id).toBe('default-tournament');
      expect(t.name).toBe('Default Tournament');
      expect(t.official).toBe(true);
      expect(t.format).toBe('Standard');
      expect(t.deckRules.minDeckSize).toBe(60);
      expect(t.deckRules.maxDeckSize).toBe(60);
    });

    it('should throw error if ID is empty', () => {
      expect(() => {
        Tournament.create('', 'Test', '1.0', 'Description', 'Author');
      }).toThrow('Tournament ID is required');
    });

    it('should throw error if name is empty', () => {
      expect(() => {
        Tournament.create('test-id', '', '1.0', 'Description', 'Author');
      }).toThrow('Tournament name is required');
    });
  });

  describe('Set Management', () => {
    it('should allow all sets by default when bannedSets is empty', () => {
      expect(tournament.isSetAllowed('base-set')).toBe(true);
      expect(tournament.isSetAllowed('fossil')).toBe(true);
      expect(tournament.isSetAllowed('jungle')).toBe(true);
    });

    it('should ban a set', () => {
      tournament.banSet('base-set');

      expect(tournament.isSetAllowed('base-set')).toBe(false);
      expect(tournament.isSetAllowed('fossil')).toBe(true);
      expect(tournament.bannedSets).toContain('base-set');
    });

    it('should unban a set', () => {
      tournament.banSet('base-set');
      tournament.unbanSet('base-set');

      expect(tournament.isSetAllowed('base-set')).toBe(true);
      expect(tournament.bannedSets).not.toContain('base-set');
    });

    it('should not duplicate banned sets', () => {
      tournament.banSet('base-set');
      tournament.banSet('base-set');

      expect(tournament.bannedSets.filter((s) => s === 'base-set')).toHaveLength(1);
    });
  });

  describe('Card Banning', () => {
    it('should ban a specific card in a set', () => {
      tournament.banCardInSet('base-set', 'alakazam-base-1');

      expect(tournament.isCardBanned('base-set', 'alakazam-base-1')).toBe(true);
      expect(tournament.isCardBanned('base-set', 'blastoise-base-2')).toBe(false);
    });

    it('should unban a specific card', () => {
      tournament.banCardInSet('base-set', 'alakazam-base-1');
      tournament.unbanCardInSet('base-set', 'alakazam-base-1');

      expect(tournament.isCardBanned('base-set', 'alakazam-base-1')).toBe(false);
    });

    it('should consider all cards banned if set is banned', () => {
      tournament.banSet('base-set');

      expect(tournament.isCardBanned('base-set', 'alakazam-base-1')).toBe(true);
      expect(tournament.isCardBanned('base-set', 'any-card')).toBe(true);
    });

    it('should not duplicate banned cards', () => {
      tournament.banCardInSet('base-set', 'alakazam-base-1');
      tournament.banCardInSet('base-set', 'alakazam-base-1');

      const bannedCards = tournament.setBannedCards['base-set'];
      expect(bannedCards.filter((c) => c === 'alakazam-base-1')).toHaveLength(1);
    });
  });

  describe('Deck Rules', () => {
    it('should update deck rules', () => {
      const newRules = new DeckRules(40, 60, false, 3, 2, []);
      tournament.updateDeckRules(newRules);

      expect(tournament.deckRules.minDeckSize).toBe(40);
      expect(tournament.deckRules.maxDeckSize).toBe(60);
      expect(tournament.deckRules.exactDeckSize).toBe(false);
      expect(tournament.deckRules.maxCopiesPerCard).toBe(3);
    });

    it('should restrict a card', () => {
      tournament.restrictCard('base-set', 'alakazam-base-1', 1);

      expect(tournament.isCardRestricted('base-set', 'alakazam-base-1')).toBe(true);
      expect(tournament.getMaxCopiesForCard('base-set', 'alakazam-base-1')).toBe(1);
    });

    it('should unrestrict a card', () => {
      tournament.restrictCard('base-set', 'alakazam-base-1', 1);
      tournament.unrestrictCard('base-set', 'alakazam-base-1');

      expect(tournament.isCardRestricted('base-set', 'alakazam-base-1')).toBe(false);
      expect(tournament.getMaxCopiesForCard('base-set', 'alakazam-base-1')).toBe(4);
    });

    it('should return 0 copies for banned cards', () => {
      tournament.banCardInSet('base-set', 'alakazam-base-1');

      expect(tournament.getMaxCopiesForCard('base-set', 'alakazam-base-1')).toBe(0);
    });
  });

  describe('Metadata', () => {
    it('should set name', () => {
      tournament.setName('New Name');
      expect(tournament.name).toBe('New Name');
    });

    it('should throw error if name is empty', () => {
      expect(() => tournament.setName('')).toThrow('Tournament name cannot be empty');
    });

    it('should set status', () => {
      tournament.setStatus(TournamentStatus.ACTIVE);
      expect(tournament.status).toBe(TournamentStatus.ACTIVE);
    });

    it('should set official flag', () => {
      tournament.setOfficial(false);
      expect(tournament.official).toBe(false);
    });

    it('should set start and end dates', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      tournament.setStartDate(startDate);
      tournament.setEndDate(endDate);

      expect(tournament.startDate).toEqual(startDate);
      expect(tournament.endDate).toEqual(endDate);
    });

    it('should throw error if start date is after end date', () => {
      const endDate = new Date('2024-01-01');
      tournament.setEndDate(endDate);

      expect(() => {
        tournament.setStartDate(new Date('2024-12-31'));
      }).toThrow('Start date cannot be after end date');
    });

    it('should add and remove regulation marks', () => {
      tournament.addRegulationMark('A');
      tournament.addRegulationMark('B');

      expect(tournament.regulationMarks).toContain('A');
      expect(tournament.regulationMarks).toContain('B');

      tournament.removeRegulationMark('A');
      expect(tournament.regulationMarks).not.toContain('A');
      expect(tournament.regulationMarks).toContain('B');
    });
  });

  describe('Saved Decks', () => {
    it('should add saved deck', () => {
      tournament.addSavedDeck('deck-1');
      tournament.addSavedDeck('deck-2');

      expect(tournament.savedDecks).toContain('deck-1');
      expect(tournament.savedDecks).toContain('deck-2');
    });

    it('should remove saved deck', () => {
      tournament.addSavedDeck('deck-1');
      tournament.removeSavedDeck('deck-1');

      expect(tournament.savedDecks).not.toContain('deck-1');
    });

    it('should not duplicate saved decks', () => {
      tournament.addSavedDeck('deck-1');
      tournament.addSavedDeck('deck-1');

      expect(tournament.savedDecks.filter((d) => d === 'deck-1')).toHaveLength(1);
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt when modifying tournament', () => {
      const originalUpdatedAt = tournament.updatedAt;

      // Wait a bit to ensure time difference
      setTimeout(() => {
        tournament.setName('New Name');
        expect(tournament.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });
});

