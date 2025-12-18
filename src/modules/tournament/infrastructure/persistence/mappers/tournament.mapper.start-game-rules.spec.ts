import { TournamentMapper, TournamentJson } from './tournament.mapper';
import { Tournament } from '../../../domain/entities/tournament.entity';
import { TournamentStatus } from '../../../domain/enums';
import { DeckRules } from '../../../domain/value-objects/deck-rules.value-object';
import {
  StartGameRules,
  StartGameRuleType,
} from '../../../domain/value-objects/start-game-rules.value-object';

describe('TournamentMapper - Start Game Rules', () => {
  describe('toJson', () => {
    it('should serialize start game rules to JSON', () => {
      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'test-tournament',
        'Test Tournament',
        '1.0',
        'Test description',
        'test-author',
        deckRules,
      );

      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const json = TournamentMapper.toJson(tournament);

      expect(json.startGameRules).toBeDefined();
      expect(json.startGameRules.rules).toHaveLength(1);
      expect(json.startGameRules.rules[0].type).toBe(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );
      expect(json.startGameRules.rules[0].minCount).toBe(1);
    });

    it('should serialize multiple start game rules to JSON', () => {
      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'test-tournament',
        'Test Tournament',
        '1.0',
        'Test description',
        'test-author',
        deckRules,
      );

      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 2,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const json = TournamentMapper.toJson(tournament);

      expect(json.startGameRules.rules).toHaveLength(2);
      expect(json.startGameRules.rules[0].type).toBe(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );
      expect(json.startGameRules.rules[1].type).toBe(
        StartGameRuleType.HAS_ENERGY_CARD,
      );
      expect(json.startGameRules.rules[1].minCount).toBe(2);
    });

    it('should serialize default start game rules to JSON', () => {
      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'test-tournament',
        'Test Tournament',
        '1.0',
        'Test description',
        'test-author',
        deckRules,
      );

      const json = TournamentMapper.toJson(tournament);

      expect(json.startGameRules).toBeDefined();
      expect(json.startGameRules.rules).toHaveLength(1);
      expect(json.startGameRules.rules[0].type).toBe(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );
    });
  });

  describe('toDomain', () => {
    it('should deserialize start game rules from JSON', () => {
      const json: TournamentJson = {
        id: 'test-tournament',
        name: 'Test Tournament',
        version: '1.0',
        description: 'Test description',
        author: 'test-author',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        official: false,
        status: TournamentStatus.DRAFT,
        bannedSets: [],
        setBannedCards: {},
        deckRules: {
          minDeckSize: 60,
          maxDeckSize: 60,
          exactDeckSize: true,
          maxCopiesPerCard: 4,
          minBasicPokemon: 1,
          restrictedCards: [],
        },
        savedDecks: [],
        startGameRules: {
          rules: [
            {
              type: StartGameRuleType.HAS_BASIC_POKEMON,
              minCount: 1,
            },
          ],
        },
        regulationMarks: [],
      };

      const tournament = TournamentMapper.toDomain(json);

      expect(tournament.startGameRules).toBeDefined();
      expect(tournament.startGameRules.rules).toHaveLength(1);
      expect(tournament.startGameRules.rules[0].type).toBe(
        StartGameRuleType.HAS_BASIC_POKEMON,
      );
      expect(tournament.startGameRules.rules[0].minCount).toBe(1);
    });

    it('should deserialize multiple start game rules from JSON', () => {
      const json: TournamentJson = {
        id: 'test-tournament',
        name: 'Test Tournament',
        version: '1.0',
        description: 'Test description',
        author: 'test-author',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        official: false,
        status: TournamentStatus.DRAFT,
        bannedSets: [],
        setBannedCards: {},
        deckRules: {
          minDeckSize: 60,
          maxDeckSize: 60,
          exactDeckSize: true,
          maxCopiesPerCard: 4,
          minBasicPokemon: 1,
          restrictedCards: [],
        },
        savedDecks: [],
        startGameRules: {
          rules: [
            {
              type: StartGameRuleType.HAS_BASIC_POKEMON,
              minCount: 1,
            },
            {
              type: StartGameRuleType.HAS_ENERGY_CARD,
              minCount: 2,
            },
          ],
        },
        regulationMarks: [],
      };

      const tournament = TournamentMapper.toDomain(json);

      expect(tournament.startGameRules.rules).toHaveLength(2);
      expect(
        tournament.startGameRules.hasRuleType(
          StartGameRuleType.HAS_ENERGY_CARD,
        ),
      ).toBe(true);
    });

    it('should use default rules when startGameRules is missing in JSON', () => {
      const json: TournamentJson = {
        id: 'test-tournament',
        name: 'Test Tournament',
        version: '1.0',
        description: 'Test description',
        author: 'test-author',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        official: false,
        status: TournamentStatus.DRAFT,
        bannedSets: [],
        setBannedCards: {},
        deckRules: {
          minDeckSize: 60,
          maxDeckSize: 60,
          exactDeckSize: true,
          maxCopiesPerCard: 4,
          minBasicPokemon: 1,
          restrictedCards: [],
        },
        savedDecks: [],
        startGameRules: {
          rules: [],
        },
        regulationMarks: [],
      };

      const tournament = TournamentMapper.toDomain(json);

      // Should still have default rules set in constructor
      expect(tournament.startGameRules).toBeDefined();
    });

    it('should round-trip serialize and deserialize start game rules', () => {
      const deckRules = DeckRules.createStandard();
      const originalTournament = new Tournament(
        'test-tournament',
        'Test Tournament',
        '1.0',
        'Test description',
        'test-author',
        deckRules,
      );

      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);
      originalTournament.setStartGameRules(startGameRules);

      const json = TournamentMapper.toJson(originalTournament);
      const deserializedTournament = TournamentMapper.toDomain(json);

      expect(
        deserializedTournament.startGameRules.equals(
          originalTournament.startGameRules,
        ),
      ).toBe(true);
    });
  });
});
