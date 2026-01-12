import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CreateMatchUseCase } from './create-match.use-case';
import { IMatchRepository } from '../../domain/repositories';
import { Match, PlayerIdentifier, PlayerType, MatchState } from '../../domain';
import { CreateMatchDto } from '../dto';
import {
  AI_PLAYER_ID,
  getAiPlayerById,
} from '../../domain/constants/ai-player.constants';
import { ValidateMatchDecksUseCase } from './validate-match-decks.use-case';

describe('CreateMatchUseCase', () => {
  let useCase: CreateMatchUseCase;
  let mockRepository: jest.Mocked<IMatchRepository>;
  let mockValidateMatchDecksUseCase: jest.Mocked<ValidateMatchDecksUseCase>;
  let module: TestingModule;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      findByTournamentId: jest.fn(),
      findByPlayerId: jest.fn(),
      findByState: jest.fn(),
    };

    mockValidateMatchDecksUseCase = {
      execute: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        CreateMatchUseCase,
        {
          provide: IMatchRepository,
          useValue: mockRepository,
        },
        {
          provide: ValidateMatchDecksUseCase,
          useValue: mockValidateMatchDecksUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CreateMatchUseCase>(CreateMatchUseCase);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('execute', () => {
    it('should create a match without players', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
      };

      const savedMatch = new Match('match-1', 'tournament-1');
      mockRepository.save.mockResolvedValue(savedMatch);

      const result = await useCase.execute(dto);

      expect(result).toBe(savedMatch);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          tournamentId: 'tournament-1',
          state: MatchState.CREATED,
          player1Id: null,
          player2Id: null,
          player1Type: null,
          player2Type: null,
        }),
      );
    });

    it('should create a match with player 1', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1Id: 'player-1',
        player1DeckId: 'deck-1',
      };

      const savedMatch = new Match('match-1', 'tournament-1');
      savedMatch.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      savedMatch.setPlayerType(PlayerIdentifier.PLAYER1, PlayerType.HUMAN);
      mockRepository.save.mockResolvedValue(savedMatch);

      const result = await useCase.execute(dto);

      expect(result).toBe(savedMatch);
      expect(mockRepository.save).toHaveBeenCalled();
      const savedMatchArg = mockRepository.save.mock.calls[0][0];
      expect(savedMatchArg.player1Id).toBe('player-1');
      expect(savedMatchArg.player1DeckId).toBe('deck-1');
      expect(savedMatchArg.player1Type).toBe(PlayerType.HUMAN);
    });

    it('should create a match vs AI player', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1Id: 'player-1',
        player1DeckId: 'deck-1',
        vsAi: true,
        aiDeckId: 'ai-deck-1',
      };

      const savedMatch = new Match('match-1', 'tournament-1');
      savedMatch.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      savedMatch.setPlayerType(PlayerIdentifier.PLAYER1, PlayerType.HUMAN);
      savedMatch.assignPlayer(
        AI_PLAYER_ID,
        'ai-deck-1',
        PlayerIdentifier.PLAYER2,
      );
      savedMatch.setPlayerType(PlayerIdentifier.PLAYER2, PlayerType.AI);
      mockRepository.save.mockResolvedValue(savedMatch);

      // Mock validateMatchDecksUseCase to return the validated match
      const validatedMatch = new Match('match-1', 'tournament-1');
      validatedMatch.assignPlayer(
        'player-1',
        'deck-1',
        PlayerIdentifier.PLAYER1,
      );
      validatedMatch.setPlayerType(PlayerIdentifier.PLAYER1, PlayerType.HUMAN);
      validatedMatch.assignPlayer(
        AI_PLAYER_ID,
        'ai-deck-1',
        PlayerIdentifier.PLAYER2,
      );
      validatedMatch.setPlayerType(PlayerIdentifier.PLAYER2, PlayerType.AI);
      mockValidateMatchDecksUseCase.execute.mockResolvedValue(validatedMatch);

      const result = await useCase.execute(dto);

      expect(result).toBe(validatedMatch);
      expect(mockRepository.save).toHaveBeenCalled();
      const savedMatchArg = mockRepository.save.mock.calls[0][0];
      expect(savedMatchArg.player1Id).toBe('player-1');
      expect(savedMatchArg.player1Type).toBe(PlayerType.HUMAN);
      expect(savedMatchArg.player2Id).toBe(AI_PLAYER_ID);
      expect(savedMatchArg.player2DeckId).toBe('ai-deck-1');
      expect(savedMatchArg.player2Type).toBe(PlayerType.AI);
      expect(mockValidateMatchDecksUseCase.execute).toHaveBeenCalledWith(
        'match-1',
      );
    });

    it('should create a match vs specific AI player', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1Id: 'player-1',
        player1DeckId: 'deck-1',
        vsAi: true,
        aiPlayerId: 'AIPlayerV0.1',
        aiDeckId: 'ai-deck-1',
      };

      const savedMatch = new Match('match-1', 'tournament-1');
      savedMatch.assignPlayer('player-1', 'deck-1', PlayerIdentifier.PLAYER1);
      savedMatch.setPlayerType(PlayerIdentifier.PLAYER1, PlayerType.HUMAN);
      savedMatch.assignPlayer(
        'AIPlayerV0.1',
        'ai-deck-1',
        PlayerIdentifier.PLAYER2,
      );
      savedMatch.setPlayerType(PlayerIdentifier.PLAYER2, PlayerType.AI);
      mockRepository.save.mockResolvedValue(savedMatch);

      // Mock validateMatchDecksUseCase to return the validated match
      const validatedMatch = new Match('match-1', 'tournament-1');
      validatedMatch.assignPlayer(
        'player-1',
        'deck-1',
        PlayerIdentifier.PLAYER1,
      );
      validatedMatch.setPlayerType(PlayerIdentifier.PLAYER1, PlayerType.HUMAN);
      validatedMatch.assignPlayer(
        'AIPlayerV0.1',
        'ai-deck-1',
        PlayerIdentifier.PLAYER2,
      );
      validatedMatch.setPlayerType(PlayerIdentifier.PLAYER2, PlayerType.AI);
      mockValidateMatchDecksUseCase.execute.mockResolvedValue(validatedMatch);

      const result = await useCase.execute(dto);

      expect(result).toBe(validatedMatch);
      expect(mockRepository.save).toHaveBeenCalled();
      const savedMatchArg = mockRepository.save.mock.calls[0][0];
      expect(savedMatchArg.player2Id).toBe('AIPlayerV0.1');
      expect(savedMatchArg.player2DeckId).toBe('ai-deck-1');
      expect(savedMatchArg.player2Type).toBe(PlayerType.AI);
      expect(mockValidateMatchDecksUseCase.execute).toHaveBeenCalledWith(
        'match-1',
      );
    });

    it('should throw error when vsAi is true but player1Id is missing', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1DeckId: 'deck-1',
        vsAi: true,
      };

      await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto)).rejects.toThrow(
        'player1Id and player1DeckId are required when creating a match vs AI',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when vsAi is true but player1DeckId is missing', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1Id: 'player-1',
        vsAi: true,
      };

      await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto)).rejects.toThrow(
        'player1Id and player1DeckId are required when creating a match vs AI',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when vsAi is true but aiDeckId is missing', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1Id: 'player-1',
        player1DeckId: 'deck-1',
        vsAi: true,
      };

      await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto)).rejects.toThrow(
        'aiDeckId is required when creating a match vs AI',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when invalid AI player ID is provided', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
        player1Id: 'player-1',
        player1DeckId: 'deck-1',
        vsAi: true,
        aiPlayerId: 'InvalidAIId',
        aiDeckId: 'ai-deck-1',
      };

      await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto)).rejects.toThrow(
        'AI player with ID InvalidAIId not found',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should use provided match ID when given', async () => {
      const dto: CreateMatchDto = {
        id: 'custom-match-id',
        tournamentId: 'tournament-1',
      };

      const savedMatch = new Match('custom-match-id', 'tournament-1');
      mockRepository.save.mockResolvedValue(savedMatch);

      const result = await useCase.execute(dto);

      expect(result).toBe(savedMatch);
      expect(mockRepository.save).toHaveBeenCalled();
      const savedMatchArg = mockRepository.save.mock.calls[0][0];
      expect(savedMatchArg.id).toBe('custom-match-id');
    });

    it('should generate UUID when match ID is not provided', async () => {
      const dto: CreateMatchDto = {
        tournamentId: 'tournament-1',
      };

      const savedMatch = new Match('generated-id', 'tournament-1');
      mockRepository.save.mockResolvedValue(savedMatch);

      await useCase.execute(dto);

      expect(mockRepository.save).toHaveBeenCalled();
      const savedMatchArg = mockRepository.save.mock.calls[0][0];
      expect(savedMatchArg.id).toBeDefined();
      expect(savedMatchArg.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });
});
