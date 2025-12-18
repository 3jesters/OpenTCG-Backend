import { StartMatchUseCase } from './start-match.use-case';
import { IMatchRepository } from '../../domain/repositories';
import { IDeckRepository } from '../../../deck/domain/repositories';
import { ITournamentRepository } from '../../../tournament/domain';
import { StartGameRulesValidatorService } from '../../domain/services';
import { Match, MatchState, PlayerIdentifier } from '../../domain';
import { Deck, DeckCard } from '../../../deck/domain';
import { Tournament, DeckRules } from '../../../tournament/domain';
import {
  StartGameRules,
  StartGameRuleType,
} from '../../../tournament/domain/value-objects';
import { NotFoundException } from '@nestjs/common';

describe('StartMatchUseCase - Reshuffle Logic', () => {
  let useCase: StartMatchUseCase;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockDeckRepository: jest.Mocked<IDeckRepository>;
  let mockTournamentRepository: jest.Mocked<ITournamentRepository>;
  let mockStartGameRulesValidator: jest.Mocked<StartGameRulesValidatorService>;

  beforeEach(() => {
    mockMatchRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

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

    mockStartGameRulesValidator = {
      validateHand: jest.fn(),
    } as any;

    useCase = new StartMatchUseCase(
      mockMatchRepository,
      mockDeckRepository,
      mockTournamentRepository,
      mockStartGameRulesValidator,
    );
  });

  describe('Reshuffle when hand does not satisfy rules', () => {
    it('should reshuffle player hand when it does not satisfy start game rules', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      // Create decks with enough cards (60 cards each)
      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      // Add 60 cards to each deck (mix of basic Pokemon and other cards)
      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // First hand doesn't satisfy (no basic Pokemon), second hand does
      let validateCallCount = 0;
      mockStartGameRulesValidator.validateHand.mockImplementation(
        async (hand: string[]) => {
          validateCallCount++;
          // First validation fails (no basic Pokemon in initial hand)
          if (validateCallCount === 1) {
            return false;
          }
          // After reshuffle, hand should satisfy
          return true;
        },
      );

      // Act
      const result = await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(mockStartGameRulesValidator.validateHand).toHaveBeenCalled();
      expect(result.state).toBe(MatchState.DRAWING_CARDS);
      expect(result.gameState).toBeDefined();
      expect(result.gameState?.player1State.hand).toHaveLength(7);
      expect(result.gameState?.player2State.hand).toHaveLength(7);
    });

    it('should reshuffle both players independently if needed', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Both players need reshuffle
      let player1CallCount = 0;
      let player2CallCount = 0;
      mockStartGameRulesValidator.validateHand.mockImplementation(
        async (hand: string[]) => {
          // Determine which player based on call order
          // First two calls are for player 1, next two for player 2
          if (player1CallCount < 2) {
            player1CallCount++;
            return player1CallCount === 2; // Second call succeeds
          } else {
            player2CallCount++;
            return player2CallCount === 2; // Second call succeeds
          }
        },
      );

      // Act
      const result = await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(mockStartGameRulesValidator.validateHand).toHaveBeenCalledTimes(4); // 2 per player
      expect(result.state).toBe(MatchState.DRAWING_CARDS);
    });

    it('should not reshuffle when hand already satisfies rules', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Both hands satisfy immediately
      mockStartGameRulesValidator.validateHand.mockResolvedValue(true);

      // Act
      const result = await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(mockStartGameRulesValidator.validateHand).toHaveBeenCalledTimes(2); // Once per player
      expect(result.state).toBe(MatchState.DRAWING_CARDS);
    });

    it('should use tournament start game rules', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      // Custom rules: need 2 Basic Pokemon
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 2,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Validate with minCount: 2
      mockStartGameRulesValidator.validateHand.mockImplementation(
        async (hand: string[], rules: StartGameRules) => {
          // Check that rules have minCount: 2
          const basicPokemonRule = rules.getRulesByType(
            StartGameRuleType.HAS_BASIC_POKEMON,
          );
          expect(basicPokemonRule[0].minCount).toBe(2);
          return true;
        },
      );

      // Act
      await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(mockStartGameRulesValidator.validateHand).toHaveBeenCalled();
    });

    it('should use default rules when tournament has no custom rules', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      // Tournament uses default rules (has 1 Basic Pokemon)

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Validate with default rules (minCount: 1)
      mockStartGameRulesValidator.validateHand.mockImplementation(
        async (hand: string[], rules: StartGameRules) => {
          // Check that rules have default minCount: 1
          const basicPokemonRule = rules.getRulesByType(
            StartGameRuleType.HAS_BASIC_POKEMON,
          );
          expect(basicPokemonRule[0].minCount).toBe(1);
          return true;
        },
      );

      // Act
      await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(mockStartGameRulesValidator.validateHand).toHaveBeenCalled();
    });

    it('should handle multiple rule types', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      // Multiple rules: need 1 Basic Pokemon AND 1 Energy
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
        {
          type: StartGameRuleType.HAS_ENERGY_CARD,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Validate with multiple rules
      mockStartGameRulesValidator.validateHand.mockImplementation(
        async (hand: string[], rules: StartGameRules) => {
          expect(rules.rules).toHaveLength(2);
          expect(rules.hasRuleType(StartGameRuleType.HAS_ENERGY_CARD)).toBe(
            true,
          );
          return true;
        },
      );

      // Act
      await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(mockStartGameRulesValidator.validateHand).toHaveBeenCalled();
    });

    it('should maintain 7 cards in hand after reshuffle', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      mockStartGameRulesValidator.validateHand.mockResolvedValue(true);

      // Act
      const result = await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(result.gameState?.player1State.hand).toHaveLength(7);
      expect(result.gameState?.player2State.hand).toHaveLength(7);
    });

    it('should set up 6 prize cards after reshuffle', async () => {
      // Arrange
      const match = new Match('match-1', 'tournament-1');
      match.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      match.assignPlayer('player-2', 'deck-2', PlayerIdentifier.PLAYER2);
      match.markDeckValidationComplete(true);
      match.approveMatch(PlayerIdentifier.PLAYER1);
      // Don't approve player 2 yet - StartMatchUseCase.execute() needs match in PRE_GAME_SETUP state
      // Manually set state back to PRE_GAME_SETUP for the use case to work
      (match as any)._state = MatchState.PRE_GAME_SETUP;
      (match as any)._player2HasApprovedMatch = false;

      const deckRules = DeckRules.createStandard();
      const tournament = new Tournament(
        'tournament-1',
        'Test Tournament',
        '1.0',
        'Test',
        'system',
        deckRules,
      );
      const startGameRules = new StartGameRules([
        {
          type: StartGameRuleType.HAS_BASIC_POKEMON,
          minCount: 1,
        },
      ]);
      tournament.setStartGameRules(startGameRules);

      const player1Deck = new Deck('deck-1', 'Player 1 Deck', 'player-1');
      const player2Deck = new Deck('deck-2', 'Player 2 Deck', 'player-2');

      for (let i = 1; i <= 15; i++) {
        player1Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
        player2Deck.addCard(`basic-pokemon-${i}`, 'base-set', 4);
      }

      mockMatchRepository.findById.mockResolvedValue(match);
      mockDeckRepository.findById
        .mockResolvedValueOnce(player1Deck)
        .mockResolvedValueOnce(player2Deck);
      mockTournamentRepository.findById.mockResolvedValue(tournament);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      mockStartGameRulesValidator.validateHand.mockResolvedValue(true);

      // Act
      const result = await useCase.execute('match-1', PlayerIdentifier.PLAYER1);

      // Assert
      expect(result.gameState?.player1State.prizeCards).toHaveLength(6);
      expect(result.gameState?.player2State.prizeCards).toHaveLength(6);
    });
  });
});
