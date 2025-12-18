import { Tournament, TournamentStatus } from './tournament.entity';
import { DeckRules } from '../value-objects/deck-rules.value-object';
import {
  StartGameRules,
  StartGameRuleType,
} from '../value-objects/start-game-rules.value-object';

describe('Tournament Entity - Start Game Rules', () => {
  let tournament: Tournament;

  beforeEach(() => {
    const deckRules = DeckRules.createStandard();
    tournament = new Tournament(
      'test-tournament',
      'Test Tournament',
      '1.0',
      'Test description',
      'test-author',
      deckRules,
    );
  });

  describe('Default Start Game Rules', () => {
    it('should initialize with default start game rules', () => {
      expect(tournament.startGameRules).toBeDefined();
      expect(tournament.startGameRules.rules).toHaveLength(1);
      expect(tournament.startGameRules.rules[0].type).toBe(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );
      expect(tournament.startGameRules.rules[0].minCount).toBe(1);
    });

    it('should use default rules in createDefault factory', () => {
      const defaultTournament = Tournament.createDefault();

      expect(defaultTournament.startGameRules).toBeDefined();
      expect(defaultTournament.startGameRules.rules).toHaveLength(1);
      expect(defaultTournament.startGameRules.rules[0].type).toBe(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );
    });
  });

  describe('setStartGameRules', () => {
    it('should set start game rules', () => {
      const newRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
      ]);

      tournament.setStartGameRules(newRules);

      expect(tournament.startGameRules.rules).toHaveLength(1);
      expect(tournament.startGameRules.rules[0].minCount).toBe(2);
    });

    it('should set multiple start game rules', () => {
      const newRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 2,
        },
      ]);

      tournament.setStartGameRules(newRules);

      expect(tournament.startGameRules.rules).toHaveLength(2);
      expect(
        tournament.startGameRules.hasRuleType(
          StartGameRuleType.HAS_ENERGY_CARD,
        ),
      ).toBe(true);
    });

    it('should set empty start game rules', () => {
      const emptyRules = StartGameRules.createEmpty();

      tournament.setStartGameRules(emptyRules);

      expect(tournament.startGameRules.isEmpty()).toBe(true);
    });

    it('should update updatedAt when setting start game rules', () => {
      const originalUpdatedAt = tournament.updatedAt;
      const newRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
      ]);

      // Wait a bit to ensure time difference
      setTimeout(() => {
        tournament.setStartGameRules(newRules);
        expect(tournament.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        );
      }, 10);
    });
  });

  describe('get startGameRules', () => {
    it('should return start game rules', () => {
      const rules = tournament.startGameRules;

      expect(rules).toBeDefined();
      expect(rules.rules).toBeDefined();
    });

    it('should return updated rules after setting new rules', () => {
      const newRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);

      tournament.setStartGameRules(newRules);

      const retrievedRules = tournament.startGameRules;
      expect(
        retrievedRules.hasRuleType(StartGameRuleType.HAS_ENERGY_CARD),
      ).toBe(true);
    });
  });
});
